import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_supabase_tables():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    if not url or not key:
        print("Error: SUPABASE_URL or SUPABASE_KEY not found in environment variables.")
        return

    # Initialize Supabase client
    supabase: Client = create_client(url, key)

    # List of tables to test (based on project documentation and code)
    tables_to_test = ['ingredients', 'userInfo', "recipes"]

    print(f"--- Testing Supabase Connection ---")
    print(f"URL: {url}")
    print("-" * 30)

    for table_name in tables_to_test:
        print(f"Testing table: {table_name}...", end=" ")
        try:
            # Attempt to fetch a single row to verify existence and presence of data
            response = supabase.table(table_name).select("*").limit(1).execute()
            
            # Check if data is returned
            if response.data:
                print(f"✅ EXISTS and contains data. (Sample item: {response.data[0]})")
            else:
                print(f"✅ EXISTS but is currently empty.")
        except Exception as e:
            print(f"❌ ERROR: Could not access table. {e}")

    print("-" * 30)
    print("Test complete.")

if __name__ == "__main__":
    test_supabase_tables()
