import os
from fastapi import FastAPI, Depends, HTTPException, Header
from starlette.middleware.base import BaseHTTPMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv


from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# Load environment variables from the .env file
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing Supabase credentials in .env file")

# Initialize FastAPI
app = FastAPI(title="Personal Task Tracker API")

# Vercel passes the full path (e.g. /api/projects) to the ASGI app, but all
# routes are defined without the /api prefix.  This middleware strips it so
# both local dev (where Vite already strips /api) and Vercel work identically.
class StripApiPrefixMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.scope["path"].startswith("/api/"):
            request.scope["path"] = request.scope["path"][4:]  # /api/x -> /x
        return await call_next(request)

app.add_middleware(StripApiPrefixMiddleware)

# --- OPTION B: Secure RLS Dependency ---
# This function intercepts the Authorization header sent by your frontend.
# It creates a temporary Supabase client that acts ONLY as that specific user.
def get_supabase_client(authorization: str = Header(None)) -> Client:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    # Extract the token (usually "Bearer <token>")
    token = authorization.split(" ")[1] if " " in authorization else authorization
    
    # Create a fresh client for this request
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Set the user's session so Supabase RLS knows who is asking!
    supabase.postgrest.auth(token)
    
    return supabase

# --- Basic Health Check Route ---
@app.get("/")
def read_root():
    return {"message": "Task Tracker API is running securely!"}

# --- Example: Secure Route testing RLS ---
@app.get("/my-projects")
def get_my_projects(supabase: Client = Depends(get_supabase_client)):
    # Because of RLS, this will ONLY return projects where user_id matches the token
    response = supabase.table("Project").select("*").execute()
    return response.data


# --- Pydantic Models (Data Validation) ---
class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority_level: Optional[int] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    isarchived: Optional[bool] = None  # Notice this is all lowercase!
    priority_level: Optional[int] = None

# --- Task Models ---
class TaskCreate(BaseModel):
    title: str
    est_duration: Optional[int] = None
    priority_level: Optional[int] = None
    completed: Optional[bool] = False
    project_id: int  # Required!
    block_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    est_duration: Optional[int] = None
    priority_level: Optional[int] = None
    completed: Optional[bool] = None
    project_id: Optional[int] = None
    block_id: Optional[int] = None


class AssignTasksRequest(BaseModel):
    block_id: int

# --- Time Block Models ---
class BlockCreate(BaseModel):
    name: str
    start_time: datetime
    end_time: datetime

# --- Tag Models ---
class TagCreate(BaseModel):
    name: str
    color_hex: Optional[str] = None

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color_hex: Optional[str] = None

# --- Resource Models ---
class ResourceCreate(BaseModel):
    title: str
    url: Optional[str] = None
    platform: Optional[str] = None
    task_id: int  # Required Foreign Key!

class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    platform: Optional[str] = None

# --- Task-Tag Assignment Model ---
class TaskTagAssign(BaseModel):
    tag_id: int

    # --- PROJECT ENDPOINTS ---

@app.post("/projects")
def create_project(project: ProjectCreate, authorization: str = Header(...), supabase: Client = Depends(get_supabase_client)):
    # 1. Extract the raw token from the header
    token = authorization.split(" ")[1] if " " in authorization else authorization
    
    # 2. Explicitly pass the token to get_user() so it knows who is asking
    user_response = supabase.auth.get_user(token)
    user_id = user_response.user.id

    # 3. Prepare the data, injecting the user_id
    project_data = project.dict(exclude_unset=True)
    project_data["user_id"] = user_id

    # 4. Insert into Supabase
    response = supabase.table("project").insert(project_data).execute()
    return response.data

@app.get("/projects")
def get_all_projects(supabase: Client = Depends(get_supabase_client)):
    # CHANGED: "Project" -> "project"
    response = supabase.table("project").select("*").execute()
    return response.data

@app.get("/projects/{project_id}")
def get_project(project_id: int, supabase: Client = Depends(get_supabase_client)):
    # CHANGED: "Project" -> "project", and "Project_ID" -> "project_id"
    response = supabase.table("project").select("*").eq("project_id", project_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return response.data[0]

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, supabase: Client = Depends(get_supabase_client)):
    # CHANGED: "Project" -> "project", and "Project_ID" -> "project_id"
    response = supabase.table("project").delete().eq("project_id", project_id).execute()
    return {"message": f"Project {project_id} deleted successfully"}


# --- TASK ENDPOINTS ---

@app.post("/tasks")
def create_task(task: TaskCreate, authorization: str = Header(...), supabase: Client = Depends(get_supabase_client)):
    # 1. Extract token and get user
    token = authorization.split(" ")[1] if " " in authorization else authorization
    user_response = supabase.auth.get_user(token)
    
    # 2. Prepare data
    task_data = task.dict(exclude_unset=True)
    task_data["user_id"] = user_response.user.id

    # 3. Insert securely
    response = supabase.table("task").insert(task_data).execute()
    return response.data

@app.get("/tasks")
def get_all_tasks(supabase: Client = Depends(get_supabase_client)):
    # RLS ensures they only see their own tasks
    response = supabase.table("task").select("*").execute()
    return response.data

@app.put("/tasks/{task_id}")
def update_task(task_id: int, task_update: TaskUpdate, supabase: Client = Depends(get_supabase_client)):
    # This is perfect for marking tasks as 'completed: true' later!
    update_data = task_update.dict(exclude_unset=True)
    
    if not update_data:
        return {"message": "No fields provided to update"}
        
    response = supabase.table("task").update(update_data).eq("task_id", task_id).execute()
    return response.data

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("task").delete().eq("task_id", task_id).execute()
    return {"message": f"Task {task_id} deleted successfully"}



# --- Knapsack Algorithm Models & Logic ---

@app.post("/assign-tasks")
def auto_assign_tasks(request: AssignTasksRequest, authorization: str = Header(...), supabase: Client = Depends(get_supabase_client)):
    # 1. Authenticate user
    token = authorization.split(" ")[1] if " " in authorization else authorization
    user_response = supabase.auth.get_user(token)
    user_id = user_response.user.id

    # 2. Get the Time Block to determine our "Knapsack Capacity"
    block_response = supabase.table("time_block").select("*").eq("block_id", request.block_id).execute()
    if not block_response.data:
        raise HTTPException(status_code=404, detail="Time block not found")
    
    time_block = block_response.data[0]
    
    # Calculate duration in minutes (capacity)
    start_time = datetime.fromisoformat(time_block["start_time"])
    end_time = datetime.fromisoformat(time_block["end_time"])
    capacity = int((end_time - start_time).total_seconds() / 60)

    # 3. Fetch all uncompleted, unassigned tasks with their Project Priorities
    # Note: In a real app, you might want to do a JOIN here, but we will fetch projects separately for simplicity
    tasks_response = supabase.table("task").select("*").eq("completed", False).is_("block_id", "null").execute()
    projects_response = supabase.table("project").select("project_id, priority_level").execute()
    
    if not tasks_response.data:
        return {"message": "No available tasks to assign"}

    # Map project priorities for easy lookup
    project_priorities = {p["project_id"]: p["priority_level"] for p in projects_response.data}

    # 4. Prepare the items for the Knapsack
    items = []
    for t in tasks_response.data:
        if not t.get("est_duration"):
            continue # Skip tasks without a duration, they break the knapsack!
            
        proj_pri = project_priorities.get(t["project_id"], 1) # Default to 1 if not found
        task_pri = t.get("priority_level") or 1
        duration = t["est_duration"]
        
        # The Custom Scoring Formula
        value = (proj_pri * 100) + (task_pri * 10) + (1000 / duration)
        
        items.append({
            "task_id": t["task_id"],
            "weight": duration,
            "value": value
        })

    # 5. The Dynamic Programming Knapsack Algorithm
    n = len(items)
    # dp table: rows are items, cols are capacities (0 to capacity)
    dp = [[0.0 for _ in range(capacity + 1)] for _ in range(n + 1)]

    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            weight = items[i-1]["weight"]
            value = items[i-1]["value"]
            
            if weight <= w:
                dp[i][w] = max(value + dp[i-1][w-weight], dp[i-1][w])
            else:
                dp[i][w] = dp[i-1][w]

    # 6. Backtrack to find WHICH tasks were actually selected
    selected_task_ids = []
    w = capacity
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i-1][w]:
            # This item was included
            selected_task_ids.append(items[i-1]["task_id"])
            w -= items[i-1]["weight"]

    # 7. Update the database to assign these tasks to the time block
    if selected_task_ids:
        # Update tasks in Supabase
        for t_id in selected_task_ids:
            supabase.table("task").update({"block_id": request.block_id}).eq("task_id", t_id).execute()

    return {
        "message": "Tasks assigned successfully",
        "block_capacity_minutes": capacity,
        "assigned_task_ids": selected_task_ids,
        "total_value_achieved": dp[n][capacity]
    }

# --- TIME BLOCK ENDPOINTS ---
@app.post("/blocks")
def create_block(block: BlockCreate, authorization: str = Header(...), supabase: Client = Depends(get_supabase_client)):
    token = authorization.split(" ")[1] if " " in authorization else authorization
    user_response = supabase.auth.get_user(token)
    
    block_data = block.dict(exclude_unset=True)
    # Convert datetimes to strings for Supabase
    block_data["start_time"] = block_data["start_time"].isoformat()
    block_data["end_time"] = block_data["end_time"].isoformat()
    block_data["user_id"] = user_response.user.id

    response = supabase.table("time_block").insert(block_data).execute()
    return response.data



# --- TAG ENDPOINTS ---

@app.post("/tags")
def create_tag(tag: TagCreate, authorization: str = Header(...), supabase: Client = Depends(get_supabase_client)):
    token = authorization.split(" ")[1] if " " in authorization else authorization
    user_response = supabase.auth.get_user(token)
    
    tag_data = tag.dict(exclude_unset=True)
    tag_data["user_id"] = user_response.user.id

    response = supabase.table("tag").insert(tag_data).execute()
    return response.data

@app.get("/tags")
def get_all_tags(supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("tag").select("*").execute()
    return response.data

@app.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("tag").delete().eq("tag_id", tag_id).execute()
    return {"message": f"Tag {tag_id} deleted successfully"}

# --- RESOURCE ENDPOINTS ---

@app.post("/resources")
def create_resource(resource: ResourceCreate, supabase: Client = Depends(get_supabase_client)):
    resource_data = resource.dict(exclude_unset=True)
    # RLS ensures they can only add resources to tasks they actually own
    response = supabase.table("resource").insert(resource_data).execute()
    return response.data

@app.get("/tasks/{task_id}/resources")
def get_task_resources(task_id: int, supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("resource").select("*").eq("task_id", task_id).execute()
    return response.data

@app.delete("/resources/{resource_id}")
def delete_resource(resource_id: int, supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("resource").delete().eq("resource_id", resource_id).execute()
    return {"message": f"Resource {resource_id} deleted successfully"}

# --- TASK-TAG (HAS) ENDPOINTS ---

@app.post("/tasks/{task_id}/tags")
def assign_tag_to_task(task_id: int, assignment: TaskTagAssign, supabase: Client = Depends(get_supabase_client)):
    insert_data = {
        "task_id": task_id,
        "tag_id": assignment.tag_id
    }
    # RLS ensures they own the task before allowing the link
    response = supabase.table("has").insert(insert_data).execute()
    return response.data

@app.delete("/tasks/{task_id}/tags/{tag_id}")
def remove_tag_from_task(task_id: int, tag_id: int, supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("has").delete().eq("task_id", task_id).eq("tag_id", tag_id).execute()
    return {"message": "Tag removed from task"}

#testing

@app.get("/directory")
def get_project_directory(supabase: Client = Depends(get_supabase_client)):
    # Automatically grabs Tasks, and the Resources/Tags associated with those Tasks!
    response = supabase.table("project").select("*, task(*, resource(*), tag(*))").execute()
    return response.data

@app.get("/blocks-directory")
def get_blocks_directory(supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("time_block").select("*, task(*, resource(*), tag(*))").execute()
    return response.data