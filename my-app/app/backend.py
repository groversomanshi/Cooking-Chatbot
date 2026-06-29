import os
import psycopg2
from flask import Flask, jsonify
from dotenv import load_dotenv

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
load_dotenv(os.path.join(ROOT, ".env"))
load_dotenv(os.path.join(HERE, ".env"), override=True)

app = Flask(__name__)

@app.route('/')
def index():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return jsonify({"ok": False, "error": "DATABASE_URL is not set"}), 500

    with psycopg2.connect(database_url, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION()")
            version = cur.fetchone()[0]

    return jsonify({"ok": True, "database": "aiven-postgres", "version": version})

if __name__ == '__main__':
    app.run(debug=True)