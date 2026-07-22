# Flask backend

Flask service that powers database-backed app features in the Next.js app. It
connects to Aiven Postgres with `DATABASE_URL` and can optionally enable CLIP
image detection when deployed on a host with enough memory.

## Setup (Windows / PowerShell)

```powershell
cd server

# Use Python 3.10 or 3.11. PyTorch + CLIP do not support 3.13+ yet on Windows.
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt

# Optional, only if you want local camera detection.
pip install -r requirements-clip.txt

notepad .env   # create this file (git-ignored); see variables below
```

`server/.env` (create it, don't commit it):

```env
# Aiven Postgres connection string.
DATABASE_URL=postgres://avnadmin:password@host.aivencloud.com:12345/defaultdb?sslmode=require

# Optional. Path to a local fine-tuned CLIP checkpoint. If set and the file
# exists, it is used as-is (skips the HuggingFace Hub download below).
# CLIP_WEIGHTS_PATH=

# HuggingFace Hub repo/file that hosts the fine-tuned CLIP checkpoint.
# Defaults are set in app.py; only override if you're using your own repo.
# HF_REPO=<your-hf-namespace>/<your-repo>
# HF_REPO_TYPE=space   # "model", "dataset", or "space" -- must match how
#                       # the checkpoint is actually hosted on HF Hub.
# HF_FILENAME=<your-checkpoint-filename>.pth

# Access token for the HF repo (required if the repo is private).
# Get one from https://huggingface.co/settings/tokens.
HF_TOKEN=

# Cosine-similarity threshold below which we report "not detected".
CLIP_CONFIDENCE_THRESHOLD=0.2

# Render/free-tier friendly default. Set to true only on a host with enough
# memory for PyTorch + CLIP.
ENABLE_CLIP=false

# Server port (must match NEXT_PUBLIC_DETECT_URL in my-app/.env).
PORT=5000
```

For Render/free-tier database APIs, keep `ENABLE_CLIP=false`. For local camera
detection, set `ENABLE_CLIP=true` after installing `requirements-clip.txt`.

## Run

```powershell
python app.py
# server starts on http://127.0.0.1:5000
```

The server logs the ingredient count on startup. If it says `0 ingredient
rows returned`, confirm your Aiven database has the imported `public.ingredients`
table and that `DATABASE_URL` points at the correct database.

When `ENABLE_CLIP=false`, `/health` reports `"clipEnabled": false`, database
endpoints still work, and `/detect` returns `503 image detection is disabled`.

## Render Deployment

### Option A — DB-only backend (lightweight, free tier friendly)

```text
Root Directory: server
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app --bind 0.0.0.0:$PORT
```

Render environment variables:

```env
DATABASE_URL=postgres://...
ENABLE_CLIP=false
```

`/detect` will return `503` on this deployment. Host CLIP detection
separately later (see Option B), then point `NEXT_PUBLIC_DETECT_URL` at that
service.

### Option B — with CLIP image detection enabled

PyTorch + CLIP need considerably more RAM than Render's free tier (512 MB)
provides, so use at least a Starter/Standard instance with enough memory.

```text
Root Directory: server
Build Command: pip install -r requirements-clip.txt
Start Command: gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120
```

Render environment variables:

```env
DATABASE_URL=postgres://...
ENABLE_CLIP=true
HF_TOKEN=...            # only needed if the HF Hub repo is private
CLIP_CONFIDENCE_THRESHOLD=0.2
```

Notes:
- Don't set `PORT` yourself — Render injects it automatically and `app.py`
  already reads it via `os.environ.get("PORT", ...)`.
- Don't set `FLASK_DEBUG` in Render; it should only be `true` in local `.env`.
- The `--timeout 120` gives the first request extra time to download the
  checkpoint from HuggingFace Hub and load CLIP into memory.
- Optionally set Render's Health Check Path to `/health` so it can tell the
  service booted successfully.

After deployment, set the frontend's `NEXT_PUBLIC_BACKEND_URL` (in
`my-app/.env` / your hosting provider) to the Render service URL.

## Endpoints

- `GET /health` — `{ ok, device, clipEnabled, ingredients, weightsPath }`
- `GET /ingredients` — ingredient search and lookup using `q`, `ids`, or `names`
- `GET /recipes` — recipe list or lookup using `ids`
- `GET /recipes/<id>` — single recipe lookup
- `GET|PUT /users/<userId>/pantry` — read/write pantry ingredient IDs
- `GET|PUT /users/<userId>/restrictions` — read/write dietary restrictions
- `GET|PUT /users/<userId>/favorites` — read/write favorite recipe IDs
- `GET /recommend` — Aiven/Postgres-backed recipe recommendations
- `GET /restrictions` — dietary restriction enum options
- `POST /detect` — multipart `image` field; when `ENABLE_CLIP=true`, returns
  `{ detected: true, ingredientId, name, score }` or
  `{ detected: false, score }`
- `POST /refresh` — re-fetch the ingredient list and rebuild embeddings (call
  this after seeding new rows in the table)

## Auth

The Next.js app uses Auth.js with Google OAuth and stores auth rows in the same
Aiven Postgres database. The auth schema is in `server/sql/auth.sql`.

For local Google OAuth, create a Google OAuth web client with this redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Then set these in `my-app/.env`:

```env
DATABASE_URL=postgres://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

## Fine-tuned weights

On startup (when `ENABLE_CLIP=true`), the server resolves the checkpoint in
this order:

1. `CLIP_WEIGHTS_PATH` in `.env`, if it points at a file that exists locally.
2. Download `HF_FILENAME` from the `HF_REPO` HuggingFace Hub repo (cached
   locally after the first download). Set `HF_TOKEN` in `.env` if the repo is
   private.
3. Fall back to a local file at `server/`, `my-app/`, or the repo root named
   after `HF_FILENAME` (the checkpoint filename configured in `app.py`).

Whichever path is found gets loaded with `strict=False`. The startup log will
print missing/unexpected key counts if the checkpoint shape doesn't match
stock `ViT-B/32`. A handful of either is normal for a fine-tune; thousands
means the checkpoint isn't in the format the loader expects (e.g. it might be
wrapped under `{"state_dict": ...}` — adjust
`app.py:resolve_clip_weights_path` if needed).
