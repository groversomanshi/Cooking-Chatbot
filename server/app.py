"""
Flask service that classifies an uploaded image as one of the ingredients in
the public.ingredients Aiven/Postgres table using (optionally fine-tuned) CLIP.

Endpoints:
  GET  /health    - sanity check
  POST /detect    - multipart 'image' -> { detected, ingredientId?, name?, score }
  POST /refresh   - reload ingredient embeddings from Postgres
"""

import gc
import os
import sys
import time
from typing import Optional, Any

import numpy as np

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

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
ENABLE_CLIP = os.environ.get("ENABLE_CLIP", "false").lower() in {
    "1",
    "true",
    "yes",
    "on",
}
CLIP_THRESHOLD = float(os.environ.get("CLIP_CONFIDENCE_THRESHOLD", "0.2"))
PORT = int(os.environ.get("PORT", "5000"))

# Fine-tuned CLIP checkpoint hosted on HuggingFace Hub (fallback: local file).
# NOTE: this currently lives in a Space repo, not a Model repo, hence
# repo_type="space" below -- hf_hub_download defaults to "model" otherwise.
HF_REPO = os.environ.get("HF_REPO", "cookingchatbot/Cooking-Chatbot")
HF_REPO_TYPE = os.environ.get("HF_REPO_TYPE", "space")
HF_FILENAME = os.environ.get("HF_FILENAME", "clip_finetuned_production_final.pth")
HF_VISUAL_FILENAME = os.environ.get("HF_VISUAL_FILENAME", "visual_encoder.pth")
HF_EMBEDDINGS_FILENAME = os.environ.get(
    "HF_EMBEDDINGS_FILENAME", "ingredient_embeddings.npz"
)
HF_TOKEN = os.environ.get("HF_TOKEN", "")
CLIP_LOW_MEMORY = os.environ.get("CLIP_LOW_MEMORY", "true").lower() in {
    "1",
    "true",
    "yes",
    "on",
}
CLIP_QUANTIZE = os.environ.get("CLIP_QUANTIZE", "false").lower() in {
    "1",
    "true",
    "yes",
    "on",
}

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


def find_local_clip_weights() -> Optional[str]:
    """Return the first existing local path that looks like our fine-tuned .pth."""
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.environ.get("CLIP_WEIGHTS_PATH"),
        os.path.join(here, HF_FILENAME),
        os.path.join(here, "..", "my-app", HF_FILENAME),
        os.path.join(here, "..", HF_FILENAME),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return os.path.abspath(c)
    return None


def resolve_clip_weights_path() -> Optional[str]:
    """Resolve the fine-tuned CLIP checkpoint path.

    Order of precedence:
      1. CLIP_WEIGHTS_PATH, if it points at a file that already exists locally.
      2. Download from the HuggingFace Hub repo (cached after the first run).
      3. Fall back to a local file (server/, my-app/, or repo root).
    """
    override = os.environ.get("CLIP_WEIGHTS_PATH")
    if override and os.path.exists(override):
        print(f"[clip] using CLIP_WEIGHTS_PATH override: {override}", flush=True)
        return os.path.abspath(override)

    try:
        from huggingface_hub import hf_hub_download

        path = hf_hub_download(
            repo_id=HF_REPO,
            repo_type=HF_REPO_TYPE,
            filename=HF_FILENAME,
            token=HF_TOKEN or None,
        )
        print(f"[clip] downloaded weights from HuggingFace Hub: {HF_REPO}", flush=True)
        return path
    except Exception as e:
        print(
            f"[clip] HF Hub download failed ({e}); falling back to a local checkpoint",
            flush=True,
        )
        return find_local_clip_weights()


def resolve_hf_file(filename: str) -> Optional[str]:
    """Download a file from the configured HF Hub repo, or return a local path."""
    override_env = f"CLIP_{filename.upper().replace('.', '_')}_PATH"
    override = os.environ.get(override_env)
    if override and os.path.exists(override):
        return os.path.abspath(override)

    local = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    if os.path.exists(local):
        return local

    try:
        from huggingface_hub import hf_hub_download

        path = hf_hub_download(
            repo_id=HF_REPO,
            repo_type=HF_REPO_TYPE,
            filename=filename,
            token=HF_TOKEN or None,
        )
        print(f"[clip] downloaded {filename} from HuggingFace Hub: {HF_REPO}", flush=True)
        return path
    except Exception as e:
        print(f"[clip] could not fetch {filename} from HF Hub ({e})", flush=True)
        return None


def resolve_ingredient_embeddings_path() -> Optional[str]:
    if not HF_EMBEDDINGS_FILENAME:
        return None
    return resolve_hf_file(HF_EMBEDDINGS_FILENAME)


def resolve_visual_weights_path() -> Optional[str]:
    """Prefer the smaller visual-only checkpoint for low-memory deploys."""
    return resolve_hf_file(HF_VISUAL_FILENAME)


def extract_visual_state(state: dict) -> dict:
    state = _unwrap_state_dict(state)
    if any(k.startswith("visual.") for k in state):
        return {
            k[len("visual.") :]: v for k, v in state.items() if k.startswith("visual.")
        }
    return state


def _log_checkpoint_info(path: str, state: dict) -> None:
    size_mb = os.path.getsize(path) / (1024 * 1024)
    sample = next((v for v in state.values() if hasattr(v, "dtype")), None)
    dtype = getattr(sample, "dtype", "unknown")
    print(f"[clip] checkpoint file: {size_mb:.1f} MB, sample dtype: {dtype}", flush=True)


def _load_checkpoint_state(path: str, torch_mod):
    try:
        return torch_mod.load(path, map_location="cpu", mmap=True, weights_only=True)
    except Exception:
        return torch_mod.load(path, map_location="cpu")


def _unwrap_state_dict(state: dict) -> dict:
    if isinstance(state, dict) and "state_dict" in state and not any(
        k.startswith("visual.") or k.startswith("transformer.") for k in state.keys()
    ):
        return state["state_dict"]
    return state


def drop_text_encoder(model) -> None:
    """Free the text side of CLIP once ingredient vectors are cached."""
    for name in (
        "transformer",
        "token_embedding",
        "positional_embedding",
        "ln_final",
        "text_projection",
    ):
        if name in getattr(model, "_modules", {}):
            del model._modules[name]
    gc.collect()
    print("[clip] dropped text encoder to save memory", flush=True)


class VisualOnlyModel:
    """Image encoder only -- used when ingredient vectors are precomputed."""

    def __init__(self, visual):
        self.visual = visual

    @property
    def dtype(self):
        return self.visual.conv1.weight.dtype

    def encode_image(self, image):
        return self.visual(image.type(self.dtype))

    def eval(self):
        self.visual.eval()
        return self


# ViT-B/32 vision tower constants (matches the fine-tuned checkpoint).
VIT_B32_VISION = {
    "input_resolution": 224,
    "patch_size": 32,
    "width": 768,
    "layers": 12,
    "heads": 12,
    "output_dim": 512,
}


def build_visual_encoder_from_state(visual_state: dict, vision_cls, convert_weights_fn, torch_mod):
    if not visual_state:
        raise ValueError("checkpoint has no visual.* weights")

    cfg = VIT_B32_VISION
    visual = vision_cls(
        input_resolution=cfg["input_resolution"],
        patch_size=cfg["patch_size"],
        width=cfg["width"],
        layers=cfg["layers"],
        heads=cfg["heads"],
        output_dim=cfg["output_dim"],
    )

    sample = next(iter(visual_state.values()))
    if sample.dtype != torch_mod.float16:
        convert_weights_fn(visual)

    visual.load_state_dict(visual_state, strict=True, assign=True)
    gc.collect()
    return VisualOnlyModel(visual.to(device))


def optimize_clip_memory(model, torch_mod):
    """Apply CPU-side memory reductions for small hosts (e.g. Render free tier)."""
    if not CLIP_LOW_MEMORY or device != "cpu" or not CLIP_QUANTIZE:
        return model

    target = model.visual if isinstance(model, VisualOnlyModel) else model
    target.float()
    global MODEL_DTYPE
    MODEL_DTYPE = torch_mod.float32

    try:
        target = torch_mod.quantization.quantize_dynamic(
            target,
            {torch_mod.nn.Linear},
            dtype=torch_mod.qint8,
        )
        if isinstance(model, VisualOnlyModel):
            model.visual = target
        else:
            model = target
        print("[clip] applied dynamic int8 quantization to Linear layers", flush=True)
    except Exception as e:
        print(f"[clip] dynamic quantization skipped ({e})", flush=True)

    gc.collect()
    return model


def load_ingredient_embeddings_from_npz(path: str) -> int:
    """Load precomputed ingredient vectors from a .npz file."""
    global INGREDIENT_VECTORS, INGREDIENT_IDS, INGREDIENT_NAMES

    data = np.load(path, allow_pickle=True)
    ids = [int(x) for x in data["ids"]]
    names = [str(x) for x in data["names"]]
    vectors = np.asarray(data["vectors"], dtype=np.float32)

    INGREDIENT_IDS = ids
    INGREDIENT_NAMES = names
    INGREDIENT_VECTORS = vectors
    print(
        f"[clip] loaded {len(ids)} precomputed ingredient embeddings from {path}",
        flush=True,
    )
    return len(ids)


def load_ingredient_embeddings() -> int:
    """Pull ingredient vectors from a precomputed file or Postgres + CLIP text encoder."""
    global INGREDIENT_VECTORS, INGREDIENT_IDS, INGREDIENT_NAMES

    if not ENABLE_CLIP or clip is None or torch is None or model is None:
        print("[clip] refresh skipped because CLIP is disabled.", flush=True)
        INGREDIENT_VECTORS = None
        INGREDIENT_IDS = []
        INGREDIENT_NAMES = []
        return 0

    embeddings_path = resolve_ingredient_embeddings_path()
    if embeddings_path:
        count = load_ingredient_embeddings_from_npz(embeddings_path)
        if CLIP_LOW_MEMORY and device == "cpu" and hasattr(model, "transformer"):
            drop_text_encoder(model)
        return count

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

    batch_size = max(1, int(os.environ.get("CLIP_TEXT_BATCH_SIZE", "32")))
    feats_chunks = []
    for start in range(0, len(prompts), batch_size):
        batch = prompts[start : start + batch_size]
        tokens = clip.tokenize(batch).to(device)
        with torch.no_grad():
            batch_feats = model.encode_text(tokens)
            batch_feats = batch_feats / batch_feats.norm(dim=-1, keepdim=True)
        feats_chunks.append(batch_feats.cpu().numpy().astype(np.float32))

    INGREDIENT_VECTORS = np.concatenate(feats_chunks, axis=0)
    INGREDIENT_IDS = ids
    INGREDIENT_NAMES = names
    print(f"[clip] cached {len(ids)} ingredient embeddings", flush=True)

    if CLIP_LOW_MEMORY and device == "cpu" and hasattr(model, "transformer"):
        drop_text_encoder(model)
    return len(ids)


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)

torch = None
clip = None
model = None
preprocess = None
device = "disabled"
weights_path = None
MODEL_DTYPE = None

# Cached ingredient embeddings ----------------------------------------------

INGREDIENT_VECTORS: Optional[Any] = None  # [N, D]
INGREDIENT_IDS: list[int] = []
INGREDIENT_NAMES: list[str] = []

if ENABLE_CLIP:
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("MKL_NUM_THREADS", "1")

    # Download lightweight artifacts before importing PyTorch (saves peak RAM).
    embeddings_path = resolve_ingredient_embeddings_path()
    if embeddings_path:
        load_ingredient_embeddings_from_npz(embeddings_path)

    weights_path = None
    using_visual_checkpoint = False
    if embeddings_path and CLIP_LOW_MEMORY:
        weights_path = resolve_visual_weights_path()
        using_visual_checkpoint = bool(weights_path)
        if weights_path:
            print(
                f"[clip] will load visual-only weights from {HF_VISUAL_FILENAME}",
                flush=True,
            )
        else:
            print(
                f"[clip] WARN: {HF_VISUAL_FILENAME} not found on HF Hub; "
                "falling back to full checkpoint (may OOM on Render free tier). "
                "Re-run export_ingredient_embeddings.py and upload visual_encoder.pth.",
                flush=True,
            )
    if not weights_path:
        weights_path = resolve_clip_weights_path()

    import torch as torch_lib
    import clip as clip_lib
    from clip.clip import _transform as clip_transform
    from clip.model import VisionTransformer, build_model as clip_build_model
    from clip.model import convert_weights as clip_convert_weights

    torch = torch_lib
    clip = clip_lib
    device = "cuda" if torch.cuda.is_available() else "cpu"
    use_visual_only = bool(embeddings_path and CLIP_LOW_MEMORY and device == "cpu")

    if CLIP_LOW_MEMORY and device == "cpu" and not embeddings_path:
        print(
            "[clip] WARN: ingredient_embeddings.npz not found on HF Hub. "
            "Render free tier needs this file -- ask your teammate to run "
            "export_ingredient_embeddings.py and upload it to the Space.",
            flush=True,
        )

    missing: list[str] = []
    unexpected: list[str] = []

    if weights_path:
        print(f"[clip] loading weights from {weights_path}", flush=True)
        state = _load_checkpoint_state(weights_path, torch)
        _log_checkpoint_info(weights_path, state)

        try:
            if use_visual_only:
                print("[clip] low-memory path: loading visual encoder only", flush=True)
                visual_state = extract_visual_state(state)
                del state
                gc.collect()
                model = build_visual_encoder_from_state(
                    visual_state,
                    VisionTransformer,
                    clip_convert_weights,
                    torch,
                )
                del visual_state
                gc.collect()
                MODEL_DTYPE = torch.float16
                preprocess = clip_transform(VIT_B32_VISION["input_resolution"])
                print("[clip] built visual-only encoder from fine-tuned checkpoint", flush=True)
            else:
                state = _unwrap_state_dict(state)
                model = clip_build_model(state).to(device)
                MODEL_DTYPE = torch.float16

                if device == "cpu":
                    try:
                        with torch.no_grad():
                            res = model.visual.input_resolution
                            dummy = torch.zeros(1, 3, res, res, dtype=torch.float16)
                            model.encode_image(dummy)
                        print("[clip] running CPU inference in fp16 (lower memory)", flush=True)
                    except Exception as fp16_err:
                        print(
                            f"[clip] fp16 CPU inference unsupported ({fp16_err}); "
                            "using fp32 instead",
                            flush=True,
                        )
                        model.float()
                        MODEL_DTYPE = torch.float32

                preprocess = clip_transform(model.visual.input_resolution)
                missing, unexpected = [], []
                print("[clip] built model directly from fine-tuned checkpoint", flush=True)
                del state
                gc.collect()
        except Exception as e:
            if use_visual_only:
                raise RuntimeError(
                    f"visual-only checkpoint load failed ({e}). "
                    "Upload visual_encoder.pth to the HF Space "
                    "(re-run export_ingredient_embeddings.py)."
                ) from e
            print(
                f"[clip] direct build from checkpoint failed ({e}); "
                "falling back to stock ViT-B/32 + strict=False load",
                flush=True,
            )
            state = _unwrap_state_dict(state)
            model, preprocess = clip.load("ViT-B/32", device=device)
            missing, unexpected = model.load_state_dict(state, strict=False)
            MODEL_DTYPE = torch.float32
            del state
            gc.collect()

        if missing:
            print(f"[clip] missing keys: {len(missing)} (sample: {missing[:3]})", flush=True)
        if unexpected:
            print(
                f"[clip] unexpected keys: {len(unexpected)} (sample: {unexpected[:3]})",
                flush=True,
            )
    else:
        print(
            "[clip] WARN: no fine-tuned weights found; downloading stock "
            "ViT-B/32. Set CLIP_WEIGHTS_PATH to override.",
            flush=True,
        )
        model, preprocess = clip.load("ViT-B/32", device=device)
        MODEL_DTYPE = torch.float32

    model.eval()
    if not use_visual_only:
        load_ingredient_embeddings()
    model = optimize_clip_memory(model, torch)
else:
    print("[clip] disabled; set ENABLE_CLIP=true to enable detection.", flush=True)

# Cached dietary restriction options
RESTRICTION_OPTIONS: Optional[list[str]] = None
RESTRICTION_OPTIONS_TS: float = 0.0
RESTRICTION_OPTIONS_TTL_S = 300.0


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "ok": True,
            "device": device,
            "clipEnabled": ENABLE_CLIP,
            "ingredients": len(INGREDIENT_IDS),
            "weightsPath": weights_path,
        }
    )


@app.route("/refresh", methods=["POST"])
def refresh():
    if not ENABLE_CLIP:
        return jsonify({"ok": True, "clipEnabled": False, "ingredients": 0})
    n = load_ingredient_embeddings()
    return jsonify({"ok": True, "ingredients": n})


@app.route("/detect", methods=["POST"])
def detect():
    if not ENABLE_CLIP:
        return (
            jsonify(
                {
                    "detected": False,
                    "error": "image detection is disabled on this backend",
                }
            ),
            503,
        )

    if INGREDIENT_VECTORS is None or len(INGREDIENT_IDS) == 0:
        return (
            jsonify({"detected": False, "error": "ingredient cache empty"}),
            503,
        )

    if "image" not in request.files:
        return jsonify({"error": "no image provided"}), 400

    file = request.files["image"]
    try:
        from PIL import Image

        image = Image.open(file.stream).convert("RGB")
    except Exception as e:
        return jsonify({"error": f"bad image: {e}"}), 400

    inp = preprocess(image).unsqueeze(0).to(device=device, dtype=MODEL_DTYPE)
    with torch.no_grad():
        feats = model.encode_image(inp)
        feats = feats / feats.norm(dim=-1, keepdim=True)

    feat_vec = feats.squeeze(0).cpu().numpy().astype(np.float32)
    sims = feat_vec @ INGREDIENT_VECTORS.T
    best_idx = int(np.argmax(sims))
    best_score = float(sims[best_idx])

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
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    app.run(host="0.0.0.0", port=PORT, debug=debug)
