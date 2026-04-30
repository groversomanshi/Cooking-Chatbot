import os
import webdataset as wds
import glob

# Configuration
INPUT_DIR = "./saved_pages_test/"
OUTPUT_TAR = "./test_data.tar"

print(f"📦 Packing test data from {INPUT_DIR} into {OUTPUT_TAR}...")

# Open a WebDataset ShardWriter (even though it's just one file)
with wds.TarWriter(OUTPUT_TAR) as sink:
    # Iterate through each ingredient folder
    for ingredient_path in glob.glob(os.path.join(INPUT_DIR, "*")):
        if not os.path.isdir(ingredient_path):
            continue
            
        ingredient_name = os.path.basename(ingredient_path)
        thumbs_dir = os.path.join(ingredient_path, "thumbs")
        
        # Grab all images in the thumbs directory
        images = glob.glob(os.path.join(thumbs_dir, "*.*"))
        
        for idx, img_path in enumerate(images):
            # Create a unique key for each image
            key = f"{ingredient_name}_{idx:04d}"
            
            # Read the raw binary data of the image
            with open(img_path, "rb") as stream:
                image_bytes = stream.read()
            
            # Create the WebDataset sample dictionary
            sample = {
                "__key__": key,
                "jpg": image_bytes,
                "json": {"ingredient": ingredient_name}
            }
            
            sink.write(sample)

print("✅ Test data packed successfully! Upload `test_data.tar` to your ICRN node.")