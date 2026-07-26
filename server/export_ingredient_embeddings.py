"""
One-time helper: compute CLIP text embeddings for all ingredients and save
them as ingredient_embeddings.npz for low-memory deployments.

Run locally (where the model fits in RAM), then upload the .npz file to the
same HuggingFace Space as the checkpoint.

Usage:
  cd server
  .\.venv\Scripts\Activate.ps1
  pip install -r requirements-clip.txt
  python export_ingredient_embeddings.py
"""

import os

import numpy as np
import psycopg2
from dotenv import load_dotenv

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
load_dotenv(os.path.join(ROOT, ".env"))
load_dotenv(os.path.join(HERE, ".env"), override=True)

OUTPUT = os.path.join(HERE, "ingredient_embeddings.npz")
DATABASE_URL = os.environ.get("DATABASE_URL")
HF_FILENAME = os.environ.get("HF_FILENAME", "clip_finetuned_production_final.pth")


def main() -> None:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")

    import torch
    import clip
    from clip.model import build_model as clip_build_model

    weights_path = os.path.join(HERE, HF_FILENAME)
    if not os.path.exists(weights_path):
        raise FileNotFoundError(
            f"Missing {weights_path}. Download the checkpoint locally first "
            "or set CLIP_WEIGHTS_PATH."
        )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    state = torch.load(weights_path, map_location="cpu", weights_only=True)
    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]

    model = clip_build_model(state).to(device)
    if device == "cpu":
        model.float()
    model.eval()

    with psycopg2.connect(DATABASE_URL, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT "ingredientId", name
                FROM public.ingredients
                ORDER BY "ingredientId";
                """
            )
            rows = cur.fetchall()

    if not rows:
        raise RuntimeError("No rows found in public.ingredients")

    ids = [int(row[0]) for row in rows]
    names = [str(row[1]) for row in rows]
    prompts = [f"a photo of {name}" for name in names]

    batch_size = 32
    chunks = []
    for start in range(0, len(prompts), batch_size):
        batch = prompts[start : start + batch_size]
        tokens = clip.tokenize(batch).to(device)
        with torch.no_grad():
            feats = model.encode_text(tokens)
            feats = feats / feats.norm(dim=-1, keepdim=True)
        chunks.append(feats.cpu().numpy().astype(np.float32))

    vectors = np.concatenate(chunks, axis=0)
    np.savez_compressed(
        OUTPUT,
        ids=np.asarray(ids, dtype=np.int64),
        names=np.asarray(names, dtype=object),
        vectors=vectors,
    )
    print(f"Wrote {len(ids)} ingredient embeddings to {OUTPUT}")


if __name__ == "__main__":
    main()
