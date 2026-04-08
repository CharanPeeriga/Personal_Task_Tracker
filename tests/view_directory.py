import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

EMAIL = "test@example.com"
PASSWORD = "pass123"
API_BASE_URL = "http://127.0.0.1:8000"

def print_directory():
    print("Authenticating...")
    try:
        auth_response = supabase.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
        token = auth_response.session.access_token
        headers = {"Authorization": f"Bearer {token}"}
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return

    # Fetch Data
    proj_response = requests.get(f"{API_BASE_URL}/directory", headers=headers)
    block_response = requests.get(f"{API_BASE_URL}/blocks-directory", headers=headers)
    
    if proj_response.status_code != 200 or block_response.status_code != 200:
        print("❌ Failed to fetch data.")
        return

    projects = proj_response.json()
    blocks = block_response.json()

    print("\n" + "="*60)
    print(" 🗂️  PERSONAL TASK TRACKER DIRECTORY")
    print("="*60)
    
    # --- PROJECTS SECTION ---
    print("\n🏢 BY PROJECT:")
    if not projects:
        print("   No projects found.")
    else:
        for proj in projects:
            print(f"\n📂 [{proj['project_id']}] {proj['title'].upper()} (Priority: {proj['priority_level']})")
            tasks = proj.get("task", []) 
            
            if not tasks:
                print("   └── 📭 No tasks assigned yet.")
            else:
                for i, t in enumerate(tasks):
                    is_last_task = (i == len(tasks) - 1)
                    connector = "└──" if is_last_task else "├──"
                    status = "✅" if t['completed'] else "⏳"
                    block_info = f" [Block: {t['block_id']}]" if t['block_id'] else ""
                    
                    print(f"   {connector} {status} (ID:{t['task_id']}) {t['title']} - {t['est_duration']}m{block_info}")
                    
                    # Formatting setup for sub-items (Tags and Resources)
                    indent = "    " if is_last_task else "│   "
                    
                    # Print Tags
                    tags = t.get("tag", [])
                    if tags:
                        tag_strings = [f"[{tag['name']} {tag['color_hex']}]" for tag in tags]
                        print(f"   {indent}  🏷️  Tags: {' '.join(tag_strings)}")
                    
                    # Print Resources
                    resources = t.get("resource", [])
                    if resources:
                        for r in resources:
                            print(f"   {indent}  🔗 Resource: {r['title']} ({r['platform']}) -> {r['url']}")

    print("\n" + "-"*60)

    # --- TIME BLOCKS SECTION ---
    print("\n⏰ BY TIME BLOCK:")
    if not blocks:
        print("   No time blocks found.")
    else:
        for block in blocks:
            start = block['start_time'].split('T')[1][:5]
            end = block['end_time'].split('T')[1][:5]
            
            print(f"\n🗓️  [{block['block_id']}] {block['name'].upper()} ({start} to {end})")
            tasks = block.get("task", []) 
            
            if not tasks:
                print("   └── 📭 No tasks assigned yet.")
            else:
                for i, t in enumerate(tasks):
                    is_last_task = (i == len(tasks) - 1)
                    connector = "└──" if is_last_task else "├──"
                    status = "✅" if t['completed'] else "⏳"
                    print(f"   {connector} {status} (ID:{t['task_id']}) {t['title']} - {t['est_duration']}m")
                    
                    indent = "    " if is_last_task else "│   "
                    
                    tags = t.get("tag", [])
                    if tags:
                        tag_strings = [f"[{tag['name']} {tag['color_hex']}]" for tag in tags]
                        print(f"   {indent}  🏷️  Tags: {' '.join(tag_strings)}")
                    
                    resources = t.get("resource", [])
                    if resources:
                        for r in resources:
                            print(f"   {indent}  🔗 Resource: {r['title']} ({r['platform']}) -> {r['url']}")
                            
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    print_directory()