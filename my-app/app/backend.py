import os
import torch
import clip
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
from PIL import Image
import numpy as np
import pandas as pd

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Supabase Setup ---
supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_KEY")
)

# --- CLIP Setup ---
device = "cuda" if torch.cuda.is_available() else "cpu"
# Using the same model as your working example
model, preprocess = clip.load("ViT-B/32", device=device)
model.eval()

# Global storage for ingredient embeddings
INGREDIENT_EMBEDDINGS = {}
INGREDIENT_IDS = []

def load_ingredient_embeddings():
    global INGREDIENT_EMBEDDINGS, INGREDIENT_IDS
    print("Loading ingredients from CSV and computing embeddings...")
    
    # 1. Load ingredients from CSV
    csv_path = "/Users/shubhan/Cooking-Chatbot/ingredients/ingredients_rows.csv"
    try:
        df = pd.read_csv(csv_path)
        ingredients = df[['ingredientId', 'name']].to_dict('records')
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return
    
    if not ingredients:
        print("No ingredients found in database!")
        return

    # 2. Prepare text prompts: "a photo of [ingredient]"
    names = [ing['name'] for ing in ingredients]
    ids = [ing['ingredientId'] for ing in ingredients]
    text_prompts = [f"a photo of {name}" for name in names]
    
    # 3. Compute embeddings
    text_tokens = clip.tokenize(text_prompts).to(device)
    with torch.no_grad():
        text_features = model.encode_text(text_tokens)
        text_features /= text_features.norm(dim=-1, keepdim=True)
    
    # 4. Store in a dictionary for fast lookup
    features_np = text_features.cpu().numpy()
    for i in range(len(ids)):
        INGREDIENT_EMBEDDINGS[ids[i]] = {
            'vector': features_np[i],
            'name': names[i]
        }
    
    INGREDIENT_IDS = ids
    print(f"Successfully loaded {len(INGREDIENT_IDS)} ingredient embeddings.")

# Initialize embeddings on startup
load_ingredient_embeddings()

@app.route('/detect', methods=['POST'])
def detect_ingredient():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    file = request.files['image']
    image = Image.open(file.stream).convert("RGB")
    
    # Preprocess image using the CLIP preprocess function
    image_input = preprocess(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        image_features = model.encode_image(image_input)
        image_features /= image_features.norm(dim=-1, keepdim=True)
    
    image_vec = image_features.cpu().numpy().flatten()
    
    # Cosine Similarity search
    best_id = None
    max_sim = -1
    
    for ing_id, data in INGREDIENT_EMBEDDINGS.items():
        feat_vec = data['vector']
        sim = np.dot(image_vec, feat_vec)
        if sim > max_sim:
            max_sim = sim
            best_id = ing_id
            
    if max_sim < 0.2: # Confidence threshold
        return jsonify({"detected": False})

    # Get name from in-memory storage instead of Supabase
    ingredient_name = INGREDIENT_EMBEDDINGS[best_id]['name']
    
    return jsonify({
        "detected": True,
        "ingredientId": best_id,
        "name": ingredient_name
    })

@app.route('/ensure-user', methods=['POST'])
def ensure_user():
    data = request.json
    user_id = data.get('userId')
    
    if not user_id:
        return jsonify({"error": "Missing userId"}), 400
        
    res = supabase.table('userInfo').select('userId').eq('userId', user_id).execute()
    
    if not res.data:
        supabase.table('userInfo').insert({'userId': user_id, 'ingredients': []}).execute()
        return jsonify({"status": "created"})
    
    return jsonify({"status": "exists"})

@app.route('/add-ingredient', methods=['POST'])
def add_ingredient():
    data = request.json
    user_id = data.get('userId')
    ing_id = data.get('ingredientId')
    
    if not user_id or not ing_id:
        return jsonify({"error": "Missing userId or ingredientId"}), 400
    
    # Use .execute() instead of .single() to safely check for existence
    res = supabase.table('userInfo').select('ingredients').eq('userId', user_id).execute()
    
    if not res.data:
        # User doesn't exist in userInfo, create them with the ingredient
        supabase.table('userInfo').insert({'userId': user_id, 'ingredients': [ing_id]}).execute()
    else:
        # User exists, update their ingredients
        user_data = res.data[0]
        current_ings = user_data.get('ingredients', []) or []
        
        if ing_id not in current_ings:
            current_ings.append(ing_id)
            supabase.table('userInfo').update({'ingredients': current_ings}).eq('userId', user_id).execute()
        
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
