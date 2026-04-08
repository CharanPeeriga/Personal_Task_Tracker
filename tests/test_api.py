import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize the Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- CONFIGURATION ---
# Use the exact email and password you just created in the dashboard
EMAIL = "test@example.com"
PASSWORD = "pass123"
API_BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print(f"--- Logging in as {EMAIL} ---")
    try:
        # 1. Log in to Supabase to get the secure session token (JWT)
        auth_response = supabase.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
        token = auth_response.session.access_token
        print("✅ Login successful! Token acquired.\n")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return

    # 2. Set up our headers with the token
    # This is exactly what your React frontend will do!
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("--- Testing POST /projects ---")
    new_project_data = {
        "title": "My First Secure Project",
        "description": "Testing out Row Level Security",
        "priority_level": 1
    }
    
    post_response = requests.post(f"{API_BASE_URL}/projects", json=new_project_data, headers=headers)
    if post_response.status_code == 200:
        print("✅ Project created successfully!")
        print("Response:", post_response.json(), "\n")
    else:
        print("❌ Failed to create project:", post_response.text, "\n")

    print("--- Testing GET /projects ---")
    get_response = requests.get(f"{API_BASE_URL}/projects", headers=headers)
    if get_response.status_code == 200:
        print("✅ Retrieved projects successfully!")
        print("Response:", get_response.json(), "\n")
    else:
        print("❌ Failed to retrieve projects:", get_response.text, "\n")
    
    print("--- Testing POST /tasks ---")
    new_task_data = {
        "title": "Build Knapsack Algorithm",
        "est_duration": 120, # 2 hours
        "priority_level": 5, # High priority
        "project_id": 1      # Must match a valid project_id you own!
    }
    
    post_task_response = requests.post(f"{API_BASE_URL}/tasks", json=new_task_data, headers=headers)
    if post_task_response.status_code == 200:
        print("✅ Task created successfully!")
        print("Response:", post_task_response.json(), "\n")
    else:
        print("❌ Failed to create task:", post_task_response.text, "\n")

    print("--- Testing POST /blocks ---")
    # Create a block from right now until 3 hours from now
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=3)
    
    new_block_data = {
        "name": "Afternoon Deep Work",
        "start_time": now.isoformat(),
        "end_time": end.isoformat()
    }
    
    post_block_response = requests.post(f"{API_BASE_URL}/blocks", json=new_block_data, headers=headers)
    if post_block_response.status_code == 200:
        print("✅ Time Block created successfully!")
        block_id = post_block_response.json()[0]["block_id"]
        print("Response:", post_block_response.json(), "\n")
    else:
        print("❌ Failed to create block:", post_block_response.text, "\n")
        return # Stop here if the block fails

    print("--- Adding a Second Task ---")
    # Let's add a task that is shorter but lower priority to test the math
    task_2_data = {
        "title": "Quick Email Catchup",
        "est_duration": 30, # 30 mins
        "priority_level": 2, # Low priority
        "project_id": 1      
    }
    requests.post(f"{API_BASE_URL}/tasks", json=task_2_data, headers=headers)
    print("✅ Second task added to the pool.\n")

    print("--- THE KNAPSACK TEST: POST /assign-tasks ---")
    assign_payload = {
        "block_id": block_id
    }
    
    assign_response = requests.post(f"{API_BASE_URL}/assign-tasks", json=assign_payload, headers=headers)
    if assign_response.status_code == 200:
        print("🏆 Algorithm executed successfully!")
        print("Result:", assign_response.json(), "\n")
    else:
        print("❌ Algorithm failed:", assign_response.text, "\n")

    print("--- Testing POST /tags ---")
    new_tag_data = {
        "name": "Backend Work",
        "color_hex": "#4CAF50" # Green!
    }
    tag_response = requests.post(f"{API_BASE_URL}/tags", json=new_tag_data, headers=headers)
    if tag_response.status_code == 200:
        print("✅ Tag created successfully!")
        tag_id = tag_response.json()[0]["tag_id"]
    else:
        print("❌ Failed to create tag:", tag_response.text, "\n")
        return

    print("--- Testing POST /resources ---")
    new_resource_data = {
        "title": "FastAPI Documentation",
        "url": "https://fastapi.tiangolo.com/",
        "platform": "Web",
        "task_id": 1  # Attaching to your first task!
    }
    resource_response = requests.post(f"{API_BASE_URL}/resources", json=new_resource_data, headers=headers)
    if resource_response.status_code == 200:
        print("✅ Resource created successfully!")
    else:
        print("❌ Failed to create resource:", resource_response.text, "\n")

    print("--- Testing POST /tasks/{id}/tags (Junction Table) ---")
    assign_tag_data = {
        "tag_id": tag_id
    }
    # Assigning the tag to Task 1
    has_response = requests.post(f"{API_BASE_URL}/tasks/1/tags", json=assign_tag_data, headers=headers)
    if has_response.status_code == 200:
        print("✅ Tag assigned to task successfully!\n")
    else:
        print("❌ Failed to assign tag:", has_response.text, "\n")

if __name__ == "__main__":
    run_tests()


