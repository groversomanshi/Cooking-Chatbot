"""
Flask service that classifies an uploaded image as one of the ingredients in
the public.ingredients Supabase table using (optionally fine-tuned) CLIP.

Endpoints:
  GET  /health    - sanity check
  POST /detect    - multipart 'image' -> { detected, ingredientId?, name?, score }
  POST /refresh   - reload ingredient embeddings from Supabase
"""

import os
import sys
import time
from typing import Optional, Any

import torch
import clip
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get(
    "NEXT_PUBLIC_SUPABASE_URL"
)
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
)
CLIP_THRESHOLD = float(os.environ.get("CLIP_CONFIDENCE_THRESHOLD", "0.2"))
PORT = int(os.environ.get("PORT", "5000"))

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit(
        "Missing Supabase env. Set SUPABASE_URL and SUPABASE_KEY (or "
        "SUPABASE_SERVICE_ROLE_KEY) in server/.env"
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

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    """Pull every ingredient row from Supabase and cache its CLIP text embedding."""
    global INGREDIENT_VECTORS, INGREDIENT_IDS, INGREDIENT_NAMES

    print("[clip] fetching ingredients from Supabase…", flush=True)
    res = (
        supabase.table("ingredients")
        .select('"ingredientId", name')
        .order('"ingredientId"')
        .execute()
    )
    rows = res.data or []
    if not rows:
        print(
            "[clip] WARN: 0 ingredient rows returned. Check RLS policy on "
            "public.ingredients.",
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


@app.route("/recommend", methods=["GET"])
def recommend():
    """
    Return recipes the user has the ingredients for, excluding any that
    conflict with their dietary restrictions.

    Recommends recipes using Supabase REST queries (same style as the app) plus
    local scoring:
    - fetch userInfo.ingredients + userInfo.restrictions
    - fetch candidate recipes that overlap the pantry (server-side filter)
    - score + sort locally (same ordering as the SQL recommender)

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

    def _as_list(val: Any) -> list:
        if not val:
            return []
        if isinstance(val, list):
            return val
        return list(val)

    def _score(recipes: list[dict], ingredient_ids: list[int], restrictions: list[str]) -> list[dict]:
        pantry = set(int(x) for x in ingredient_ids)
        banned = set(str(x) for x in restrictions)

        scored: list[dict] = []
        for r in recipes:
            recipe_restr = set(str(x) for x in _as_list(r.get("dietary_restrictions")))
            if banned and recipe_restr.intersection(banned):
                continue

            ing = _as_list(r.get("ingredient_ids"))
            total = len(ing)
            matched = len(set(int(x) for x in ing).intersection(pantry)) if pantry and ing else 0
            pct = 0.0 if total == 0 else round((matched * 100.0) / total, 2)

            scored.append(
                {
                    "id": r.get("id"),
                    "name": r.get("name"),
                    "website": r.get("website"),
                    "matchedIngredientCount": matched,
                    "totalIngredientCount": total,
                    "matchPercent": pct,
                }
            )

        scored.sort(
            key=lambda x: (
                x["matchedIngredientCount"],
                x["matchPercent"],
                x["totalIngredientCount"],
            ),
            reverse=True,
        )
        return scored

    try:
        t0 = time.time()
        user_res = (
            supabase.table("userInfo")
            .select("ingredients, restrictions")
            .eq("userId", user_id)
            .limit(1)
            .execute()
        )
        user_row = (user_res.data[0] if getattr(user_res, "data", None) else {}) or {}
        ingredient_ids = _as_list(user_row.get("ingredients"))
        restrictions = _as_list(user_row.get("restrictions"))

        if len(ingredient_ids) == 0:
            base = (
                supabase.table("recipes")
                .select("id, name, website, ingredient_ids, dietary_restrictions")
                .order("id", desc=False)
                .limit(limit)
                .execute()
            )
            recipes = base.data or []
        else:
            cand = (
                supabase.table("recipes")
                .select("id, name, website, ingredient_ids, dietary_restrictions")
                # PostgREST `ov` expects a Postgres array literal, not JSON.
                .filter(
                    "ingredient_ids",
                    "ov",
                    "{" + ",".join(str(int(x)) for x in ingredient_ids) + "}",
                )
                .limit(2000)
                .execute()
            )
            recipes = cand.data or []

        rows = _score(recipes, ingredient_ids, restrictions)[:limit]
        dt = round((time.time() - t0) * 1000)
        print(
            f"[recommend] user={user_id} pantry={len(ingredient_ids)} limit={limit} -> {len(rows)} rows in {dt}ms",
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
            res = supabase.rpc("list_dietary_restrictions", {}).execute()
            RESTRICTION_OPTIONS = [str(x) for x in (res.data or [])]
            RESTRICTION_OPTIONS_TS = now

        return jsonify({"options": RESTRICTION_OPTIONS})
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"restrictions lookup failed: {e}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
