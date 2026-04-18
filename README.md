# Personal Task Tracker

A personal productivity app built as a database systems course project. It bridges the simplicity of Google Tasks with the relational structure of Notion, and adds a built-in calendar with smart scheduling powered by a 0/1 Knapsack algorithm.

**Live app:** https://personal-task-tracker-ashy.vercel.app

---

## What it does

You organize work into projects, add tasks with estimated durations and priorities, and block off time on the calendar. When you're ready to work, the auto-fill feature runs a dynamic programming algorithm to pick the best set of tasks that fit inside your available time, ranked by project priority, task priority, and task length.

There's also an availability checker that looks at your recurring events, one-time events, and existing time blocks to tell you exactly where you have free time on any given day.

---

## Features

- **Dashboard** with three views: a tile grid of active projects, a flat task list with filtering, and an expandable directory
- **Schedule page** with month, week, and day calendar views. Events are rendered with absolute positioning based on their actual start and end times so you can see exactly how long things take
- **Knapsack auto-scheduling** that fills a time block with the optimal set of tasks given the block's duration
- **Availability checker** that merges events and time blocks into a free-slot list for any date
- **Tags and resources** that can be attached to individual tasks
- **Profile page** with a GitHub-style activity heatmap built from task completion timestamps
- **Settings page** for account management
- Full CRUD on projects, tasks, tags, resources, events, and time blocks
- Keyword search across tasks and projects simultaneously
- Row Level Security on every database table so users only ever see their own data

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, Vite, React Router |
| Styling | Tailwind CSS v4, Framer Motion, Radix UI, 21st Dev |
| Backend | Python, FastAPI |
| Database + Auth | Supabase (PostgreSQL + JWT) |
| Deployment | Vercel |

---

## Running locally

### Prerequisites

- Node.js 18+
- Python 3.10+
- A Supabase project with the schema applied

### 1. Clone the repo

```bash
git clone https://github.com/CharanPeeriga/Personal_Task_Tracker.git
cd Personal_Task_Tracker
```

### 2. Set up environment variables

Create a `.env` file in the root:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

### 3. Start the backend

```bash
pip install fastapi uvicorn supabase python-dotenv
uvicorn api.index:app --reload --port 8000
```

### 4. Start the frontend

```bash
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to `http://127.0.0.1:8000` automatically.

---

## Seeding test data

Two scripts are included under `scripts/` to populate a test account with realistic student data.

```bash
pip install supabase requests python-dotenv

# create projects, tasks, events, and tags
python scripts/seed_data.py

# attach resource links to existing tasks
python scripts/seed_resources.py
```

Make sure the FastAPI server is running before executing the scripts.

---

## Project structure

```
├── api/
│   └── index.py          # fastapi backend (25 endpoints)
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Schedule.jsx
│   │   ├── Profile.jsx
│   │   ├── Settings.jsx
│   │   ├── LandingPage.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── components/
│   │   ├── DashboardLayout.jsx
│   │   └── ui/
│   └── api/
│       └── axiosInstance.js
├── scripts/
│   ├── seed_data.py
│   └── seed_resources.py
└── .env
```

---

## How the Knapsack scheduling works

When you click Auto-Fill on a time block, the backend:

1. Fetches all incomplete, unassigned tasks
2. Treats the block's duration (in minutes) as the knapsack capacity
3. Assigns each task a weight equal to its estimated duration and a value score:

```
value = (project_priority * 100) + (task_priority * 10) + (1000 / duration)
```

4. Runs the 0/1 Knapsack DP algorithm to find the highest-value combination that fits
5. Updates those task records in the database in a single batch call

Project priority is weighted most heavily so urgent work always comes first. The small bonus for shorter tasks helps build momentum when priorities are close.

---

## How the availability checker works

Given a date, the backend:

1. Queries all recurring events matching that day of the week
2. Queries all one-time events on that specific date
3. Queries all time blocks that fall within that day
4. Converts everything to minute offsets from midnight, merges overlapping intervals, and computes the gaps within a 6 AM to 11 PM window
5. Returns a list of free slots with start time, end time, and duration

---

Built for CSC4710 Database Systems at Georgia State University.
