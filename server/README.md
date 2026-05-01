# Detection backend

Flask + CLIP service that powers `/camera` in the Next.js app. It receives a
JPEG frame, runs CLIP image encoding against cached text embeddings of every
row in `public.ingredients`, and returns the best match.

## Setup (Windows / PowerShell)

```powershell
cd server

# Use Python 3.10 or 3.11. PyTorch + CLIP do not support 3.13+ yet on Windows.
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt

Copy-Item .env.example .env
notepad .env   # fill in SUPABASE_URL and SUPABASE_KEY
```

## Run

```powershell
python app.py
# server starts on http://127.0.0.1:5000
```

The server logs the ingredient count on startup. If it says `0 ingredient
rows returned`, you don't have a `select` policy on `public.ingredients`.
Fix in Supabase SQL editor:

```sql
create policy "public read ingredients"
on public.ingredients for select to anon, authenticated using (true);
```

## Endpoints

- `GET /health` — `{ ok, device, ingredients, weightsPath }`
- `POST /detect` — multipart `image` field; returns
  `{ detected: true, ingredientId, name, score }` or
  `{ detected: false, score }`
- `POST /refresh` — re-fetch the ingredient list and rebuild embeddings (call
  this after seeding new rows in the table)

## Fine-tuned weights

If `clip_finetuned_production_final.pth` lives in `server/`, `my-app/`, or
the repo root, it gets loaded automatically with `strict=False`. To force a
specific path set `CLIP_WEIGHTS_PATH` in `.env`.

The startup log will print missing/unexpected key counts if the checkpoint
shape doesn't match stock `ViT-B/32`. A handful of either is normal for a
fine-tune; thousands means the checkpoint isn't in the format the loader
expects (e.g. it might be wrapped under `{"state_dict": ...}` — adjust
`app.py:find_clip_weights` if needed).
