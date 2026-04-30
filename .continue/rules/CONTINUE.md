# Project Guide: Cooking-Chatbot

## 1. Project Overview
**Cooking-Chatbot** is a full-stack application designed to assist users with cooking-related tasks. It combines a modern web frontend with a Python-based backend and data collection scripts.

### Key Technologies
- **Frontend:** Next.js 16 (React 19), TypeScript, Tailwind CSS 4.
- **Backend:** Flask (Python), Supabase (Database/Auth).
- **AI/ML:** OpenAI CLIP (`ViT-B/32`) for image-based ingredient detection.
- **Data Science/Scraping:** Jupyter Notebooks (`.ipynb`), Python.
- **Infrastructure:** Supabase for data storage.

### High-Level Architecture
The project is structured as a monorepo-style setup:
- `my-app/`: Contains the Next.js frontend and the Flask backend.
- Root Directory: Contains data collection and processing notebooks (`scraper.ipynb`, `page_saver.ipynb`, `tarfile.ipynb`).

---

## 2. Getting Started

### Prerequisites
- **Node.js:** v18+ (for Next.js)
- **Python:** 3.10+
- **Supabase Account:** For database access.

### Installation
1. **Frontend & Backend:**
   ```bash
   cd my-app
   npm install
   ```
2. **Python Dependencies:**
   Create a virtual environment and install required packages:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install flask supabase python-dotenv pandas beautifulsoup4
   ```

### Basic Usage
- **Run Frontend:** `npm run dev` (inside `my-app`)
- **Run Backend:** `python app/backend.py` (inside `my-app`)
- **Run Notebooks:** Launch Jupyter Lab/Notebook in the root directory.

---

## 3. Project Structure

- `my-app/`
  - `app/`: Next.js App Router and Backend logic.
    - `backend.py`: Flask server interacting with Supabase.
    - `page.tsx`: Main frontend entry point.
    - `layout.tsx`: Global layout configuration.
  - `public/`: Static assets.
  - `package.json`: Frontend dependencies and scripts.
- `scraper.ipynb`: Notebook for scraping cooking/ingredient data.
- `page_saver.ipynb`: Utility for saving web pages for offline processing.
- `tarfile.ipynb`: Script for managing compressed data archives.
- `ingredients_data/`: (Ignored by Git) Directory for storing processed ingredient data.

---

## 4. Development Workflow

### Coding Standards
- **Frontend:** Use TypeScript for type safety. Follow React 19 patterns (Server Components where applicable).
- **Backend:** Keep Flask routes modular. Use `.env` for all secrets (Supabase keys).
- **Notebooks:** Ensure notebooks are cleared of output before committing to keep the repo size manageable.

### Testing Approach
- *Note: Formal testing framework not yet established. Recommended to add Pytest for backend and Jest/Vitest for frontend.*

### Build Process
- Frontend: `npm run build`
- Backend: Standard Python deployment (e.g., Gunicorn for production).

---

## 5. Key Concepts

- **Supabase Integration:** The project uses Supabase as a real-time database. Ensure the `SUPABASE_URL` and `SUPABASE_KEY` are correctly set in your environment.
"- **Data Scraping:** The project relies on external data sources for ingredients. The `scraper.ipynb` is the primary tool for updating the local dataset.
- **Ingredient Detection (CLIP):** The backend utilizes the OpenAI CLIP (`ViT-B/32`) model. On startup, it fetches all ingredient names from Supabase, generates text embeddings for them, and stores them in memory. When an image is uploaded via the `/detect` endpoint, the image is encoded into a vector and compared against the stored text embeddings using cosine similarity to identify the most likely ingredient.
- **Database Schema:**
    - `ingredients` table: Stores the master list of ingredients (`ingredientId`, `name`).
    - `userInfo` table: Stores user-specific data, including a list of ingredients they possess (`userId`, `ingredients` as an array of IDs)."

---

## 6. Common Tasks

### Adding a New Route (Frontend)
1. Create a new folder in `my-app/app/`.
2. Add a `page.tsx` file inside that folder.

### Adding a New API Endpoint (Backend)
1. Open `my-app/app/backend.py`.
2. Define a new `@app.route('/your-endpoint')` function.
3. Use the `supabase` client to fetch or modify data.

---

## 7. Troubleshooting

- **Supabase Connection Errors:** Check if your IP is whitelisted in the Supabase dashboard and verify your `.env` credentials.
- **ModuleNotFoundError (Python):** Ensure your virtual environment is active and you have run `pip install`.
- **Next.js Build Errors:** Check for TypeScript errors using `npm run lint`.

---

## 8. References
- [Next.js Documentation](https://nextjs.org/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Supabase Python SDK](https://supabase.com/docs/reference/python/introduction)
- [Tailwind CSS 4 Docs](https://tailwindcss.com/docs)
