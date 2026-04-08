import { useState, useEffect, useCallback } from 'react'
import { format, subDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import api from '@/api/axiosInstance'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, ChevronDown, ChevronRight, Layers,
  ExternalLink, Loader2, AlertCircle, Trophy, Calendar,
} from 'lucide-react'

// ─── GitHub-style Calendar ────────────────────────────────────────────────────

const CALENDAR_COLORS = ['#1a0a0a', '#4a1010', '#8b1f1f', '#F23B3B', '#f87878']

function GitHubCalendar({ data }) {
  const today     = new Date()
  const startDate = subDays(today, 364)
  const weeks     = 53

  const contributions = data.map((item) => ({ ...item, dateObj: new Date(item.date) }))

  function getColor(count) {
    if (count === 0) return CALENDAR_COLORS[0]
    if (count === 1) return CALENDAR_COLORS[1]
    if (count === 2) return CALENDAR_COLORS[2]
    if (count === 3) return CALENDAR_COLORS[3]
    return CALENDAR_COLORS[4]
  }

  function renderWeeks() {
    const result = []
    let weekStart = startOfWeek(startDate, { weekStartsOn: 0 })

    for (let i = 0; i < weeks; i++) {
      const days = eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 0 }),
      })

      result.push(
        <div key={i} className="flex flex-col gap-1">
          {days.map((day, idx) => {
            const hit   = contributions.find((c) => isSameDay(c.dateObj, day))
            const count = hit?.count ?? 0
            return (
              <div
                key={idx}
                className="w-3 h-3 rounded-[3px] transition-opacity hover:opacity-80"
                style={{ backgroundColor: getColor(count) }}
                title={`${format(day, 'PPP')}: ${count} task${count !== 1 ? 's' : ''} completed`}
              />
            )
          })}
        </div>
      )
      weekStart = addDays(weekStart, 7)
    }
    return result
  }

  function renderMonthLabels() {
    const labels = []
    let cur = startDate
    for (let i = 0; i < 12; i++) {
      labels.push(
        <span key={i} className="text-xs text-gray-600">{format(cur, 'MMM')}</span>
      )
      cur = addDays(cur, 30)
    }
    return labels
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="p-5 border border-gray-900/60 rounded-2xl bg-black/30 backdrop-blur-sm overflow-x-auto">
      <div className="flex">
        <div className="flex flex-col justify-between mt-6 mr-2 shrink-0">
          {dayLabels.map((d) => (
            <span key={d} className="text-xs text-gray-700 h-3 leading-none">{d}</span>
          ))}
        </div>
        <div className="min-w-0">
          <div className="flex gap-4 mb-2">{renderMonthLabels()}</div>
          <div className="flex gap-1">{renderWeeks()}</div>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2 text-xs items-center text-gray-600">
        <span>Less</span>
        {CALENDAR_COLORS.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

// ─── Resolved Project Card ────────────────────────────────────────────────────

function TagPill({ tag }) {
  const hex = tag.color_hex ?? '#6b7280'
  return (
    <span
      style={{ backgroundColor: hex + '25', borderColor: hex + '70', color: hex }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
    >
      {tag.name}
    </span>
  )
}

function ResolvedProject({ project }) {
  const [open, setOpen] = useState(false)
  const tasks = project.task ?? []

  return (
    <div className="border border-gray-900/60 rounded-xl overflow-hidden bg-black/20 hover:border-[#F23B3B]/20 transition-colors">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-black/30 hover:bg-[#F23B3B]/5 transition-colors text-left"
      >
        {open
          ? <ChevronDown  className="h-4 w-4 text-gray-600 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
        }
        <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
        <span className="flex-1 text-sm font-semibold text-white truncate">{project.title}</span>
        <span className="text-xs text-green-600 shrink-0">{tasks.length} task{tasks.length !== 1 ? 's' : ''} done</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-900/40 bg-black/10">
          {tasks.map((task) => (
            <div key={task.task_id} className="px-5 py-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="text-sm text-gray-400 line-through flex-1 truncate">{task.title}</span>
              </div>
              {((task.tag?.length ?? 0) > 0 || (task.resource?.length ?? 0) > 0) && (
                <div className="flex flex-wrap items-center gap-2 pl-6">
                  {(task.tag ?? []).map((t) => <TagPill key={t.tag_id} tag={t} />)}
                  {(task.resource ?? []).map((r) => (
                    <a
                      key={r.resource_id}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#F23B3B] hover:text-[#f87878]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {r.title || r.platform || 'Link'}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Completed Task Row ───────────────────────────────────────────────────────

function CompletedTaskRow({ task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-900/60 bg-black/20 opacity-70">
      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
      <span className="flex-1 text-sm text-gray-500 line-through truncate">{task.title}</span>
      <span className="text-xs text-[#F23B3B] shrink-0 hidden sm:block">{task.projectTitle}</span>
      {task.completed_at && (
        <span className="text-xs text-gray-700 shrink-0">
          {format(new Date(task.completed_at), 'MMM d')}
        </span>
      )}
    </div>
  )
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.get('/profile-data')
      setData(res)
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const totalCompleted      = data?.completed_tasks?.length ?? 0
  const resolvedProjects    = data?.resolved_projects ?? []
  const completedTasks      = data?.completed_tasks ?? []
  const calendarData        = data?.calendar_data ?? []

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        {user?.email && (
          <p className="text-sm text-gray-600">{user.email}</p>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-20 justify-center text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Stats strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Tasks Completed', value: totalCompleted, color: 'text-green-400' },
              { label: 'Projects Resolved', value: resolvedProjects.length, color: 'text-yellow-400' },
              { label: 'Active Days', value: calendarData.length, color: 'text-[#F23B3B]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col gap-1 p-4 rounded-xl border border-gray-900/60 bg-black/30">
                <span className={cn('text-2xl font-bold', color)}>{value}</span>
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          {/* ── Activity calendar ── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#F23B3B]" />
              <h2 className="text-sm font-semibold text-white">Task Completion Activity</h2>
            </div>
            <GitHubCalendar data={calendarData} />
            {calendarData.length === 0 && (
              <p className="text-xs text-gray-700 text-center -mt-1">
                Complete tasks to see your activity here. (Requires <code className="text-gray-500">completed_at</code> column in the task table.)
              </p>
            )}
          </section>

          {/* ── Resolved projects ── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <h2 className="text-sm font-semibold text-white">Resolved Projects</h2>
              <span className="text-xs text-gray-600">({resolvedProjects.length})</span>
            </div>
            {resolvedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-700 text-sm gap-2 border border-gray-900/40 rounded-xl">
                <Trophy className="h-8 w-8 opacity-30" />
                No fully completed projects yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {resolvedProjects.map((p) => (
                  <ResolvedProject key={p.project_id} project={p} />
                ))}
              </div>
            )}
          </section>

          {/* ── Completed tasks ── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-white">Completed Tasks</h2>
              <span className="text-xs text-gray-600">({totalCompleted})</span>
            </div>
            {completedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-700 text-sm gap-2 border border-gray-900/40 rounded-xl">
                <CheckCircle2 className="h-8 w-8 opacity-30" />
                No completed tasks yet.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {completedTasks.map((t) => (
                  <CompletedTaskRow key={t.task_id} task={t} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
