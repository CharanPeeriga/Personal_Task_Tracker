import os
from fastapi import FastAPI, Depends, HTTPException, Header
from starlette.middleware.base import BaseHTTPMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv


from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta


# Load environment variables from the .env file
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing Supabase credentials in .env file")

_supabase_base: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

    # Set the user's session so Supabase RLS knows who is asking!
    _supabase_base.postgrest.auth(token)

    return _supabase_base

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
    due_date: Optional[datetime] = None
    priority_level: Optional[int] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    isarchived: Optional[bool] = None  # Notice this is all lowercase!
    priority_level: Optional[int] = None

class ProjectPatch(BaseModel):
    resolved: Optional[bool] = None

# --- Task Models ---
class TaskCreate(BaseModel):
    title: str
    est_duration: Optional[int] = None
    priority_level: Optional[int] = None
    completed: Optional[bool] = False
    # Requires: ALTER TABLE public.task ALTER COLUMN project_id DROP NOT NULL;
    project_id: Optional[int] = None
    block_id: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    est_duration: Optional[int] = None
    priority_level: Optional[int] = None
    completed: Optional[bool] = None
    completed_at: Optional[datetime] = None
    project_id: Optional[int] = None
    block_id: Optional[int] = None
    due_date: Optional[datetime] = None


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
    if "due_date" in project_data and project_data["due_date"]:
        project_data["due_date"] = project_data["due_date"].isoformat()

    # 4. Insert into Supabase
    response = supabase.table("project").insert(project_data).execute()
    return response.data

@app.get("/projects")
def get_all_projects(supabase: Client = Depends(get_supabase_client)):
    # CHANGED: "Project" -> "project"
    response = supabase.table("project").select("project_id, user_id, title, description, deadline, isarchived, priority_level, due_date").execute()
    return response.data

@app.get("/projects/{project_id}")
def get_project(project_id: int, supabase: Client = Depends(get_supabase_client)):
    # CHANGED: "Project" -> "project", and "Project_ID" -> "project_id"
    response = supabase.table("project").select("project_id, user_id, title, description, deadline, isarchived, priority_level, due_date").eq("project_id", project_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return response.data[0]

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, supabase: Client = Depends(get_supabase_client)):
    # CHANGED: "Project" -> "project", and "Project_ID" -> "project_id"
    response = supabase.table("project").delete().eq("project_id", project_id).execute()
    return {"message": f"Project {project_id} deleted successfully"}

@app.patch("/projects/{project_id}")
def patch_project(project_id: int, patch: ProjectPatch, supabase: Client = Depends(get_supabase_client)):
    update_data = {}
    if patch.resolved is not None:
        update_data["isarchived"] = patch.resolved  # column name: isarchived (no underscore)
    if not update_data:
        return {"message": "No fields provided to update"}
    response = supabase.table("project").update(update_data).eq("project_id", project_id).execute()
    return response.data


# --- TASK ENDPOINTS ---

@app.post("/tasks")
def create_task(task: TaskCreate, authorization: str = Header(...), supabase: Client = Depends(get_supabase_client)):
    # 1. Extract token and get user
    token = authorization.split(" ")[1] if " " in authorization else authorization
    user_response = supabase.auth.get_user(token)
    
    # 2. Prepare data
    task_data = task.dict(exclude_unset=True)
    task_data["user_id"] = user_response.user.id

    # Serialize datetime fields for Supabase
    if "due_date" in task_data and isinstance(task_data["due_date"], datetime):
        task_data["due_date"] = task_data["due_date"].isoformat()

    # 3. Insert securely
    response = supabase.table("task").insert(task_data).execute()
    return response.data

@app.get("/tasks")
def get_all_tasks(supabase: Client = Depends(get_supabase_client)):
    # RLS ensures they only see their own tasks
    response = supabase.table("task").select("task_id, user_id, title, est_duration, priority_level, completed, project_id, block_id, completed_at, due_date").execute()
    return response.data

@app.patch("/tasks/{task_id}")
@app.put("/tasks/{task_id}")
def update_task(task_id: int, task_update: TaskUpdate, supabase: Client = Depends(get_supabase_client)):
    update_data = task_update.dict(exclude_unset=True)

    if not update_data:
        return {"message": "No fields provided to update"}

    # Auto-set completed_at timestamp when marking as complete
    if update_data.get("completed") is True and "completed_at" not in update_data:
        update_data["completed_at"] = datetime.utcnow().isoformat()

    # Serialize datetime objects to ISO strings for Supabase
    if "completed_at" in update_data and isinstance(update_data["completed_at"], datetime):
        update_data["completed_at"] = update_data["completed_at"].isoformat()

    if "due_date" in update_data and isinstance(update_data["due_date"], datetime):
        update_data["due_date"] = update_data["due_date"].isoformat()

    response = supabase.table("task").update(update_data).eq("task_id", task_id).execute()

    # Surface Supabase errors explicitly for easier debugging
    if hasattr(response, "error") and response.error:
        raise HTTPException(status_code=400, detail=str(response.error))

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
    block_response = supabase.table("time_block").select("block_id, user_id, name, start_time, end_time").eq("block_id", request.block_id).execute()
    if not block_response.data:
        raise HTTPException(status_code=404, detail="Time block not found")
    
    time_block = block_response.data[0]
    
    # Calculate duration in minutes (capacity)
    start_time = datetime.fromisoformat(time_block["start_time"])
    end_time = datetime.fromisoformat(time_block["end_time"])
    capacity = int((end_time - start_time).total_seconds() / 60)

    # 3. Fetch all uncompleted, unassigned tasks with their Project Priorities
    # Note: In a real app, you might want to do a JOIN here, but we will fetch projects separately for simplicity
    tasks_response = supabase.table("task").select("task_id, user_id, title, est_duration, priority_level, completed, project_id, block_id, completed_at, due_date").eq("completed", False).is_("block_id", "null").execute()
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
        supabase.table("task").update({"block_id": request.block_id}).in_("task_id", selected_task_ids).execute()

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
    # Strip timezone info before serializing — start_time/end_time are
    # "timestamp without time zone" in the DB; a Z-suffixed string would
    # be rejected or silently coerced to the wrong value.
    block_data["start_time"] = block_data["start_time"].replace(tzinfo=None).isoformat()
    block_data["end_time"] = block_data["end_time"].replace(tzinfo=None).isoformat()
    block_data["user_id"] = user_response.user.id

    response = supabase.table("time_block").insert(block_data).execute()
    return response.data

@app.delete("/blocks/{block_id}")
def delete_block(block_id: int, supabase: Client = Depends(get_supabase_client)):
    supabase.table("task").update({"block_id": None}).eq("block_id", block_id).execute()
    supabase.table("time_block").delete().eq("block_id", block_id).execute()
    return {"message": f"Block {block_id} deleted successfully"}


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
    response = supabase.table("tag").select("tag_id, user_id, name, color_hex").execute()
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
    response = supabase.table("resource").select("resource_id, task_id, title, url, platform").eq("task_id", task_id).execute()
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
    response = supabase.table("project").select("project_id, user_id, title, description, deadline, isarchived, priority_level, due_date, task(*, resource(*), tag(*))").execute()
    return response.data

@app.get("/blocks-directory")
def get_blocks_directory(supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("time_block").select("block_id, user_id, name, start_time, end_time, task(*, resource(*), tag(*))").execute()
    return response.data

@app.get("/profile-data")
def get_profile_data(supabase: Client = Depends(get_supabase_client)):
    # Fetch all projects with their tasks
    projects_response = supabase.table("project").select("project_id, user_id, title, description, deadline, isarchived, priority_level, due_date, task(*, resource(*), tag(*))").execute()
    projects = projects_response.data

    # Completed tasks (for calendar and resolved tasks list)
    completed_tasks = []
    calendar_counts: dict = {}

    for project in projects:
        for task in project.get("task", []):
            if task.get("completed"):
                task["projectTitle"] = project["title"]
                completed_tasks.append(task)
                # Group by date for calendar
                completed_at = task.get("completed_at")
                if completed_at:
                    date_key = completed_at[:10]  # YYYY-MM-DD
                    calendar_counts[date_key] = calendar_counts.get(date_key, 0) + 1

    calendar_data = [{"date": k, "count": v} for k, v in calendar_counts.items()]

    resolved_projects = [p for p in projects if p.get("isarchived") == True]

    return {
        "calendar_data": calendar_data,
        "resolved_projects": resolved_projects,
        "completed_tasks": completed_tasks,
    }


# --- SEARCH ENDPOINT ---

@app.get("/search")
def search(q: str, supabase: Client = Depends(get_supabase_client)):
    tasks_response = supabase.table("task").select("task_id, title, est_duration, priority_level, completed, project_id, block_id, due_date").ilike("title", f"%{q}%").execute()
    projects_response = supabase.table("project").select("project_id, title, description, priority_level, isarchived, due_date").ilike("title", f"%{q}%").execute()
    return {
        "tasks": tasks_response.data,
        "projects": projects_response.data,
    }


# --- STATS ENDPOINTS ---

@app.get("/stats/completions-by-date")
def get_completions_by_date(supabase: Client = Depends(get_supabase_client)):
    response = supabase.rpc("get_completions_by_date").execute()
    return response.data


# --- EVENT MODELS ---

class EventCreate(BaseModel):
    title: str
    color: Optional[str] = '#3b82f6'
    is_recurring: bool
    day_of_week: Optional[int] = None
    specific_date: Optional[str] = None
    start_time: str
    end_time: str
    recurrence_start: Optional[str] = None
    recurrence_end:   Optional[str] = None

class EventPatch(BaseModel):
    title: Optional[str] = None
    color: Optional[str] = None
    is_recurring: Optional[bool] = None
    day_of_week: Optional[int] = None
    specific_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    recurrence_start: Optional[str] = None
    recurrence_end:   Optional[str] = None


# --- EVENT ENDPOINTS ---

@app.post("/events")
def create_event(event: EventCreate, authorization: str = Header(...), supabase: Client = Depends(get_supabase_client)):
    token = authorization.split(" ")[1] if " " in authorization else authorization
    user_response = supabase.auth.get_user(token)
    event_data = event.dict(exclude_unset=True)
    event_data["user_id"] = user_response.user.id
    response = supabase.table("event").insert(event_data).execute()
    return response.data

@app.get("/events")
def get_events(supabase: Client = Depends(get_supabase_client)):
    response = supabase.table("event").select("*").execute()
    return response.data

@app.patch("/events/{event_id}")
def patch_event(event_id: int, patch: EventPatch, supabase: Client = Depends(get_supabase_client)):
    update_data = patch.dict(exclude_unset=True)
    if not update_data:
        return {"message": "No fields provided to update"}
    response = supabase.table("event").update(update_data).eq("event_id", event_id).execute()
    return response.data

@app.delete("/events/{event_id}")
def delete_event(event_id: int, supabase: Client = Depends(get_supabase_client)):
    supabase.table("event").delete().eq("event_id", event_id).execute()
    return {"message": f"Event {event_id} deleted successfully"}


# --- AVAILABILITY ENDPOINT ---

@app.get("/availability")
def check_availability(date: str, supabase: Client = Depends(get_supabase_client)):
    date_obj = datetime.strptime(date, '%Y-%m-%d')
    # Python weekday(): 0=Mon … 6=Sun → DB day_of_week: 0=Sun, 1=Mon … 6=Sat
    db_day = (date_obj.weekday() + 1) % 7
    next_date = (date_obj + timedelta(days=1)).strftime('%Y-%m-%d')

    recurring   = supabase.table("event").select("start_time, end_time, recurrence_start, recurrence_end").eq("is_recurring", True).eq("day_of_week", db_day).execute()
    one_time    = supabase.table("event").select("start_time, end_time").eq("is_recurring", False).eq("specific_date", date).execute()
    blocks_resp = supabase.table("time_block").select("start_time, end_time").gte("start_time", f"{date}T00:00:00").lt("start_time", f"{next_date}T00:00:00").execute()

    def to_minutes(t: str) -> int:
        parts = t.split(':')
        return int(parts[0]) * 60 + int(parts[1])

    busy = []
    for ev in (recurring.data or []):
        rec_start = ev.get('recurrence_start')
        rec_end   = ev.get('recurrence_end')
        if rec_start and date < rec_start: continue
        if rec_end   and date > rec_end:   continue
        busy.append([to_minutes(ev['start_time']), to_minutes(ev['end_time'])])
    for ev in (one_time.data or []):
        busy.append([to_minutes(ev['start_time']), to_minutes(ev['end_time'])])
    for block in (blocks_resp.data or []):
        st = datetime.fromisoformat(block['start_time'])
        et = datetime.fromisoformat(block['end_time'])
        busy.append([st.hour * 60 + st.minute, et.hour * 60 + et.minute])

    busy.sort()
    merged = []
    for start, end in busy:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])

    DAY_START, DAY_END, MIN_GAP = 360, 1380, 15
    free_slots = []
    cursor = DAY_START

    for start, end in merged:
        if start > cursor:
            gap_s = cursor
            gap_e = min(start, DAY_END)
            if gap_e > gap_s and gap_e - gap_s >= MIN_GAP:
                free_slots.append({
                    'start': f"{gap_s // 60:02d}:{gap_s % 60:02d}",
                    'end':   f"{gap_e // 60:02d}:{gap_e % 60:02d}",
                    'duration_minutes': gap_e - gap_s,
                })
        cursor = max(cursor, end)

    if cursor < DAY_END and DAY_END - cursor >= MIN_GAP:
        free_slots.append({
            'start': f"{cursor // 60:02d}:{cursor % 60:02d}",
            'end':   f"{DAY_END // 60:02d}:{DAY_END % 60:02d}",
            'duration_minutes': DAY_END - cursor,
        })

    return free_slots