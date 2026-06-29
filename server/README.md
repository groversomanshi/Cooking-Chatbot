# Flask backend

Flask service that powers database-backed app features and `/camera` detection
in the Next.js app. It connects to Aiven Postgres with `DATABASE_URL`, caches
ingredient names for CLIP detection, and exposes recipe/user data endpoints for
the frontend.

## Setup (Windows / PowerShell)

```powershell
cd server

# Use Python 3.10 or 3.11. PyTorch + CLIP do not support 3.13+ yet on Windows.
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt

Copy-Item .env.example .env
notepad .env   # fill in DATABASE_URL from Aiven
```

## Run

```powershell
python app.py
# server starts on http://127.0.0.1:5000
```

The server logs the ingredient count on startup. If it says `0 ingredient
rows returned`, confirm your Aiven database has the imported `public.ingredients`
table and that `DATABASE_URL` points at the correct database.

## Endpoints

- `GET /health` — `{ ok, device, ingredients, weightsPath }`
- `GET /ingredients` — ingredient search and lookup using `q`, `ids`, or `names`
- `GET /recipes` — recipe list or lookup using `ids`
- `GET /recipes/<id>` — single recipe lookup
- `GET|PUT /users/<userId>/pantry` — read/write pantry ingredient IDs
- `GET|PUT /users/<userId>/restrictions` — read/write dietary restrictions
- `GET|PUT /users/<userId>/favorites` — read/write favorite recipe IDs
- `GET /recommend` — Aiven/Postgres-backed recipe recommendations
- `GET /restrictions` — dietary restriction enum options
- `POST /detect` — multipart `image` field; returns
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

Then set these in `my-app/.env.local`:

```env
DATABASE_URL=postgres://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

## Fine-tuned weights

If `clip_finetuned_production_final.pth` lives in `server/`, `my-app/`, or
the repo root, it gets loaded automatically with `strict=False`. To force a
specific path set `CLIP_WEIGHTS_PATH` in `.env`.

The startup log will print missing/unexpected key counts if the checkpoint
shape doesn't match stock `ViT-B/32`. A handful of either is normal for a
fine-tune; thousands means the checkpoint isn't in the format the loader
expects (e.g. it might be wrapped under `{"state_dict": ...}` — adjust
`app.py:find_clip_weights` if needed).
