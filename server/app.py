"""
Flask service that classifies an uploaded image as one of the ingredients in
the public.ingredients Aiven/Postgres table using (optionally fine-tuned) CLIP.

Endpoints:
  GET  /health    - sanity check
  POST /detect    - multipart 'image' -> { detected, ingredientId?, name?, score }
  POST /refresh   - reload ingredient embeddings from Postgres
"""

import os
import sys
import time
from typing import Optional, Any

import torch
import clip
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from PIL import Image

from recommender import (
    get_dietary_restriction_options,
    get_recommendations_for_user,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
load_dotenv(os.path.join(ROOT, ".env"))
load_dotenv(os.path.join(HERE, ".env"), override=True)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get("DATABASE_URL")
CLIP_THRESHOLD = float(os.environ.get("CLIP_CONFIDENCE_THRESHOLD", "0.2"))
PORT = int(os.environ.get("PORT", "5000"))

if not DATABASE_URL:
    sys.exit(
        "Missing database env. Set DATABASE_URL to your Aiven Postgres "
        "connection string in server/.env"
    )


DB_CONNECT_OPTIONS = {
    "connect_timeout": 5,
    "options": "-c statement_timeout=15000",
}


def db_connect():
    return psycopg2.connect(DATABASE_URL, **DB_CONNECT_OPTIONS)


def parse_int_csv(value: Optional[str]) -> list[int]:
    if not value:
        return []
    ids: list[int] = []
    for raw in value.split(","):
        raw = raw.strip()
        if not raw:
            continue
        ids.append(int(raw))
    return ids


def parse_str_csv(value: Optional[str]) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def rows_to_json(rows):
    return [dict(row) for row in rows]


def fetch_user_info(user_id: str) -> dict[str, Any]:
    with db_connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO public."userInfo" ("userId", ingredients, restrictions, favorites)
                VALUES (%s::uuid, ARRAY[]::bigint[], ARRAY[]::dietary_restriction[], ARRAY[]::bigint[])
                ON CONFLICT ("userId") DO NOTHING;
                """,
                (user_id,),
            )
            cur.execute(
                """
                SELECT "userId", ingredients, restrictions::text[] AS restrictions, favorites
                FROM public."userInfo"
                WHERE "userId" = %s::uuid
                LIMIT 1;
                """,
                (user_id,),
            )
            row = cur.fetchone()
    return dict(row or {})


def update_user_array(user_id: str, column: str, values: list[Any], postgres_type: str):
    allowed = {"ingredients", "restrictions", "favorites"}
    if column not in allowed:
        raise ValueError(f"Unsupported userInfo column: {column}")

    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO public."userInfo" ("userId", {column})
                VALUES (%s::uuid, %s::{postgres_type}[])
                ON CONFLICT ("userId")
                DO UPDATE SET {column} = EXCLUDED.{column};
                """,
                (user_id, values),
            )


def find_clip_weights() -> Optional[str]:
    """Return the first existing path that looks like our fine-tuned .pth."""
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.environ.get("CLIP_WEIGHTS_PATH"),
        os.path.join(here, "clip_finetuned_production_final.pth"),
        os.path.join(here, "..", "my-app", "clip_finetuned_production_final.pth"),
        os.path.join(here, "..", "clip_finetuned_production_final.pth"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return os.path.abspath(c)
    return None


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[clip] loading ViT-B/32 on {device}", flush=True)
model, preprocess = clip.load("ViT-B/32", device=device)

weights_path = find_clip_weights()
if weights_path:
    print(f"[clip] loading fine-tuned weights from {weights_path}", flush=True)
    state = torch.load(weights_path, map_location=device)
    if isinstance(state, dict) and "state_dict" in state and not any(
        k.startswith("visual.") or k.startswith("transformer.") for k in state.keys()
    ):
        state = state["state_dict"]
    missing, unexpected = model.load_state_dict(state, strict=False)
    if missing:
        print(f"[clip] missing keys: {len(missing)} (sample: {missing[:3]})", flush=True)
    if unexpected:
        print(
            f"[clip] unexpected keys: {len(unexpected)} (sample: {unexpected[:3]})",
            flush=True,
        )
else:
    print(
        "[clip] WARN: no fine-tuned weights found; using stock ViT-B/32. "
        "Set CLIP_WEIGHTS_PATH to override.",
        flush=True,
    )
model.eval()

# Cached ingredient embeddings ----------------------------------------------

INGREDIENT_VECTORS: Optional[torch.Tensor] = None  # [N, D]
INGREDIENT_IDS: list[int] = []
INGREDIENT_NAMES: list[str] = []

# Cached dietary restriction options
RESTRICTION_OPTIONS: Optional[list[str]] = None
RESTRICTION_OPTIONS_TS: float = 0.0
RESTRICTION_OPTIONS_TTL_S = 300.0

def load_ingredient_embeddings() -> int:
    """Pull every ingredient row from Postgres and cache its CLIP text embedding."""
    global INGREDIENT_VECTORS, INGREDIENT_IDS, INGREDIENT_NAMES

    print("[clip] fetching ingredients from Postgres...", flush=True)
    with db_connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT "ingredientId", name
                FROM public.ingredients
                ORDER BY "ingredientId";
                """
            )
            rows = cur.fetchall()

    if not rows:
        print(
            "[clip] WARN: 0 ingredient rows returned from public.ingredients.",
            flush=True,
        )
        INGREDIENT_VECTORS = None
        INGREDIENT_IDS = []
        INGREDIENT_NAMES = []
        return 0

    names = [r["name"] for r in rows]
    ids = [int(r["ingredientId"]) for r in rows]
    prompts = [f"a photo of {n}" for n in names]

    tokens = clip.tokenize(prompts).to(device)
    with torch.no_grad():
        feats = model.encode_text(tokens)
        feats = feats / feats.norm(dim=-1, keepdim=True)

    INGREDIENT_VECTORS = feats
    INGREDIENT_IDS = ids
    INGREDIENT_NAMES = names
    print(f"[clip] cached {len(ids)} ingredient embeddings", flush=True)
    return len(ids)


load_ingredient_embeddings()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "ok": True,
            "device": device,
            "ingredients": len(INGREDIENT_IDS),
            "weightsPath": weights_path,
        }
    )


@app.route("/refresh", methods=["POST"])
def refresh():
    n = load_ingredient_embeddings()
    return jsonify({"ok": True, "ingredients": n})


@app.route("/detect", methods=["POST"])
def detect():
    if INGREDIENT_VECTORS is None or len(INGREDIENT_IDS) == 0:
        return (
            jsonify({"detected": False, "error": "ingredient cache empty"}),
            503,
        )

    if "image" not in request.files:
        return jsonify({"error": "no image provided"}), 400

    file = request.files["image"]
    try:
        image = Image.open(file.stream).convert("RGB")
    except Exception as e:
        return jsonify({"error": f"bad image: {e}"}), 400

    inp = preprocess(image).unsqueeze(0).to(device)
    with torch.no_grad():
        feats = model.encode_image(inp)
        feats = feats / feats.norm(dim=-1, keepdim=True)

    sims = (feats @ INGREDIENT_VECTORS.T).squeeze(0)
    best_idx = int(torch.argmax(sims).item())
    best_score = float(sims[best_idx].item())

    if best_score < CLIP_THRESHOLD:
        return jsonify({"detected": False, "score": best_score})

    return jsonify(
        {
            "detected": True,
            "ingredientId": INGREDIENT_IDS[best_idx],
            "name": INGREDIENT_NAMES[best_idx],
            "score": best_score,
        }
    )


@app.route("/ingredients", methods=["GET"])
def ingredients():
    try:
        ids = parse_int_csv(request.args.get("ids"))
        names = [name.lower() for name in parse_str_csv(request.args.get("names"))]
        query = (request.args.get("q") or "").strip()
        raw_limit = request.args.get("limit")
        limit = max(1, int(raw_limit)) if raw_limit else 20

        with db_connect() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if ids:
                    cur.execute(
                        """
                        SELECT "ingredientId", name, restrictions::text[] AS restrictions
                        FROM public.ingredients
                        WHERE "ingredientId" = ANY(%s::bigint[])
                        ORDER BY "ingredientId";
                        """,
                        (ids,),
                    )
                elif names:
                    cur.execute(
                        """
                        SELECT "ingredientId", name, restrictions::text[] AS restrictions
                        FROM public.ingredients
                        WHERE lower(name) = ANY(%s::text[])
                        ORDER BY name;
                        """,
                        (names,),
                    )
                elif query:
                    cur.execute(
                        """
                        SELECT "ingredientId", name, restrictions::text[] AS restrictions
                        FROM public.ingredients
                        WHERE name ILIKE %s
                        ORDER BY name
                        LIMIT %s;
                        """,
                        (f"{query}%", limit),
                    )
                else:
                    cur.execute(
                        """
                        SELECT "ingredientId", name, restrictions::text[] AS restrictions
                        FROM public.ingredients
                        ORDER BY name
                        LIMIT %s;
                        """,
                        (limit,),
                    )

                return jsonify(rows_to_json(cur.fetchall()))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"ingredients lookup failed: {e}"}), 500


@app.route("/recipes", methods=["GET"])
def recipes():
    try:
        ids = parse_int_csv(request.args.get("ids"))
        raw_limit = request.args.get("limit")
        limit = max(1, int(raw_limit)) if raw_limit else 50

        with db_connect() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if ids:
                    cur.execute(
                        """
                        SELECT id, name, ingredient_ids, instructions,
                               unfiltered_ingredients, website,
                               dietary_restrictions::text[] AS dietary_restrictions
                        FROM public.recipes
                        WHERE id = ANY(%s::bigint[])
                        ORDER BY id;
                        """,
                        (ids,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, name, ingredient_ids, instructions,
                               unfiltered_ingredients, website,
                               dietary_restrictions::text[] AS dietary_restrictions
                        FROM public.recipes
                        ORDER BY id
                        LIMIT %s;
                        """,
                        (limit,),
                    )

                return jsonify(rows_to_json(cur.fetchall()))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"recipes lookup failed: {e}"}), 500


@app.route("/recipes/<int:recipe_id>", methods=["GET"])
def recipe_by_id(recipe_id: int):
    try:
        with db_connect() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, name, ingredient_ids, instructions,
                           unfiltered_ingredients, website,
                           dietary_restrictions::text[] AS dietary_restrictions
                    FROM public.recipes
                    WHERE id = %s
                    LIMIT 1;
                    """,
                    (recipe_id,),
                )
                row = cur.fetchone()

        if not row:
            return jsonify({"error": "recipe not found"}), 404
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({"error": f"recipe lookup failed: {e}"}), 500


@app.route("/users/<user_id>/pantry", methods=["GET", "PUT"])
def user_pantry(user_id: str):
    try:
        if request.method == "PUT":
            body = request.get_json(silent=True) or {}
            ingredient_ids = [int(x) for x in body.get("ingredients", [])]
            update_user_array(user_id, "ingredients", ingredient_ids, "bigint")

        row = fetch_user_info(user_id)
        return jsonify({"ingredients": row.get("ingredients") or []})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"pantry update failed: {e}"}), 500


@app.route("/users/<user_id>/restrictions", methods=["GET", "PUT"])
def user_restrictions(user_id: str):
    try:
        if request.method == "PUT":
            body = request.get_json(silent=True) or {}
            restrictions = [str(x) for x in body.get("restrictions", [])]
            update_user_array(
                user_id,
                "restrictions",
                restrictions,
                "dietary_restriction",
            )

        row = fetch_user_info(user_id)
        return jsonify({"restrictions": row.get("restrictions") or []})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"restrictions update failed: {e}"}), 500


@app.route("/users/<user_id>/favorites", methods=["GET", "PUT"])
def user_favorites(user_id: str):
    try:
        if request.method == "PUT":
            body = request.get_json(silent=True) or {}
            favorites = [int(x) for x in body.get("favorites", [])]
            update_user_array(user_id, "favorites", favorites, "bigint")

        row = fetch_user_info(user_id)
        return jsonify({"favorites": row.get("favorites") or []})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"favorites update failed: {e}"}), 500


@app.route("/recommend", methods=["GET"])
def recommend():
    """
    Return recipes the user has the ingredients for, excluding any that
    conflict with their dietary restrictions.

    Recommends recipes using the Aiven/Postgres database connection.

    Query params:
      userId : required uuid
      limit  : optional int (default 50)
    """
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "missing userId"}), 400

    raw_limit = request.args.get("limit")
    try:
        limit = max(1, int(raw_limit)) if raw_limit else 50
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400

    try:
        t0 = time.time()
        recommendations = get_recommendations_for_user(user_id, limit=limit)
        rows = [
            {
                "id": item.id,
                "name": item.name,
                "website": item.website,
                "matchedIngredientCount": item.matched_ingredient_count,
                "totalIngredientCount": item.total_ingredient_count,
                "matchPercent": item.match_percent,
            }
            for item in recommendations
        ]
        dt = round((time.time() - t0) * 1000)
        print(
            f"[recommend] user={user_id} limit={limit} -> {len(rows)} rows in {dt}ms",
            flush=True,
        )
        return jsonify(rows)
    except Exception as e:
        print(f"[recommend] ERROR: {repr(e)}", flush=True)
        return jsonify({"error": f"recommend failed: {e}"}), 500


@app.route("/restrictions", methods=["GET"])
def restrictions():
    try:
        global RESTRICTION_OPTIONS, RESTRICTION_OPTIONS_TS
        now = time.time()
        if (
            RESTRICTION_OPTIONS is None
            or (now - RESTRICTION_OPTIONS_TS) > RESTRICTION_OPTIONS_TTL_S
        ):
            RESTRICTION_OPTIONS = get_dietary_restriction_options()
            RESTRICTION_OPTIONS_TS = now

        return jsonify({"options": RESTRICTION_OPTIONS})
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"restrictions lookup failed: {e}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
