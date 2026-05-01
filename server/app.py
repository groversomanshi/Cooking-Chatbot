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
from typing import Optional

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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
