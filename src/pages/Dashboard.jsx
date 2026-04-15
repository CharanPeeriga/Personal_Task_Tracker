import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import confetti from 'canvas-confetti'
import api from '@/api/axiosInstance'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import TetrisLoading from '@/components/ui/tetris-loader'
import {
  ChevronDown, ChevronRight, Plus, X, ExternalLink,
  CheckCircle2, Circle, Clock, Layers, List,
  AlertCircle, Loader2, Trash2, AlertTriangle, LayoutGrid, FolderPlus,
  CheckCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Confetti ─────────────────────────────────────────────────────────────────

function fireConfetti(clientX, clientY) {
  const x = clientX / window.innerWidth
  const y = clientY / window.innerHeight

  confetti({
    particleCount: 80,
    spread: 60,
    startVelocity: 28,
    decay: 0.92,
    scalar: 0.9,
    origin: { x, y },
    colors: ['#ffffff', '#a3a3a3', '#f59e0b', '#10b981', '#3b82f6', '#f97316'],
    ticks: 180,
    gravity: 1.1,
    drift: 0,
    shapes: ['square', 'circle'],
  })

  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 80,
      startVelocity: 15,
      decay: 0.9,
      scalar: 0.6,
      origin: { x, y },
      colors: ['#ffffff', '#d4d4d4'],
      ticks: 120,
      gravity: 0.8,
    })
  }, 80)
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function flattenTasks(directory) {
  return directory.flatMap((project) =>
    (project.task ?? []).map((task) => ({
      ...task,
      projectTitle:    project.title,
      projectPriority: project.priority_level,
    }))
  )
}

const PRIORITY_STYLES = {
  1: { label: 'P1', class: 'text-gray-400  bg-gray-800/80' },
  2: { label: 'P2', class: 'text-blue-400  bg-blue-950/60' },
  3: { label: 'P3', class: 'text-yellow-400 bg-yellow-950/60' },
  4: { label: 'P4', class: 'text-orange-400 bg-orange-950/60' },
  5: { label: 'P5', class: 'text-red-400   bg-red-950/60' },
}

// ─── Shared select className ───────────────────────────────────────────────────
const SELECT_CLS =
  'w-full bg-black border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-white/30 focus:border-white/30 focus:outline-none transition-colors [&>option]:bg-black [&>option]:text-white'

// ─── Micro-components ─────────────────────────────────────────────────────────

function PriorityBadge({ level }) {
  const cfg = PRIORITY_STYLES[level] ?? PRIORITY_STYLES[1]
  return (
    <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', cfg.class)}>
      {cfg.label}
    </span>
  )
}

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

function ResourceLink({ resource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
    >
      <ExternalLink className="h-3 w-3" />
      {resource.title || resource.platform || 'Link'}
    </a>
  )
}

function DurationBadge({ minutes }) {
  if (!minutes) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Clock className="h-3 w-3" />{minutes}m
    </span>
  )
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({ directory, onClose, onSuccess }) {
  const [form, setForm]     = useState({ title: '', est_duration: '', priority_level: '3', project_id: '', due_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(field, value) { setForm((prev) => ({ ...prev, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/tasks', {
        title:          form.title,
        project_id:     form.project_id ? parseInt(form.project_id) : undefined,
        est_duration:   form.est_duration   ? parseInt(form.est_duration)   : undefined,
        priority_level: form.priority_level ? parseInt(form.priority_level) : undefined,
        due_date:       form.due_date       ? new Date(form.due_date).toISOString() : undefined,
      })
      toast.success(`Task "${form.title}" created`)
      onSuccess()
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Failed to create task.'
      setError(msg)
      toast.error(msg)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-gray-950/95 backdrop-blur-xl border border-gray-800/60 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800/50">
          <h2 className="text-base font-semibold text-white">Create Task</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title" className="text-gray-400 text-xs">Title *</Label>
            <Input
              id="task-title"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Write unit tests"
              className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-duration" className="text-gray-400 text-xs">Duration (min)</Label>
              <Input
                id="task-duration"
                type="number"
                min="1"
                value={form.est_duration}
                onChange={(e) => set('est_duration', e.target.value)}
                placeholder="60"
                className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority" className="text-gray-400 text-xs">Priority (1–5)</Label>
              <select
                id="task-priority"
                value={form.priority_level}
                onChange={(e) => set('priority_level', e.target.value)}
                className={SELECT_CLS}
                style={{ backgroundColor: '#000', color: '#fff' }}
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p} style={{ backgroundColor: '#000', color: '#fff' }}>
                    {p} — {['Lowest', 'Low', 'Medium', 'High', 'Critical'][p - 1]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-due" className="text-gray-400 text-xs">Due Date</Label>
            <Input
              id="task-due"
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
              className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-project" className="text-gray-400 text-xs">Project (optional)</Label>
            <select
              id="task-project"
              value={form.project_id}
              onChange={(e) => set('project_id', e.target.value)}
              className={SELECT_CLS}
              style={{ backgroundColor: '#000', color: '#fff' }}
            >
              <option value="" style={{ backgroundColor: '#000', color: '#fff' }}>— No Project —</option>
              {directory.map((p) => (
                <option key={p.project_id} value={p.project_id} style={{ backgroundColor: '#000', color: '#fff' }}>{p.title}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" onClick={onClose} variant="ghost" neon={false} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} variant="solid" size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Creating…' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Create Project Modal ─────────────────────────────────────────────────────

function CreateProjectModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ title: '', priority_level: '3', due_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(field, value) { setForm((prev) => ({ ...prev, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/projects', {
        title:          form.title,
        priority_level: form.priority_level ? parseInt(form.priority_level) : undefined,
        due_date:       form.due_date        ? new Date(form.due_date).toISOString() : undefined,
      })
      toast.success(`Project "${form.title}" created`)
      onSuccess()
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Failed to create project.'
      setError(msg)
      toast.error(msg)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-gray-950/95 backdrop-blur-xl border border-gray-800/60 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800/50">
          <h2 className="text-base font-semibold text-white">Create Project</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-title" className="text-gray-400 text-xs">Title *</Label>
            <Input
              id="proj-title"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Database Systems Project"
              className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-priority" className="text-gray-400 text-xs">Priority (1–5)</Label>
            <select
              id="proj-priority"
              value={form.priority_level}
              onChange={(e) => set('priority_level', e.target.value)}
              className={SELECT_CLS}
              style={{ backgroundColor: '#000', color: '#fff' }}
            >
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p} style={{ backgroundColor: '#000', color: '#fff' }}>
                  {p} — {['Lowest', 'Low', 'Medium', 'High', 'Critical'][p - 1]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-due" className="text-gray-400 text-xs">Due Date</Label>
            <Input
              id="proj-due"
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
              className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" onClick={onClose} variant="ghost" neon={false} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} variant="solid" size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
              {saving ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

function ConfirmDeleteModal({ title, message, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-sm bg-gray-950/95 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel} variant="ghost" neon={false} size="sm">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="destructive" size="sm">
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onDelete, onToggleComplete }) {
  const done = task.completed
  const checkRef = useRef(null)

  function handleCheckClick() {
    const rect = checkRef.current?.getBoundingClientRect()
    if (!done && rect) fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2)
    onToggleComplete(task.task_id, !done)
  }

  return (
    <div className={cn(
      'group flex flex-col gap-2 p-4 rounded-xl border transition-colors backdrop-blur-sm',
      done
        ? 'border-gray-800/40 bg-gray-900/30 opacity-50'
        : 'border-gray-800/40 bg-gray-900/30 hover:border-gray-700/50 hover:bg-gray-900/50'
    )}>
      <div className="flex items-start gap-3">
        <button
          ref={checkRef}
          onClick={handleCheckClick}
          className="mt-0.5 shrink-0 transition-colors hover:scale-110"
          title={done ? 'Mark incomplete' : 'Mark complete'}
        >
          {done
            ? <CheckCircle2 className="h-4 w-4 text-green-600 hover:text-gray-500 transition-colors" />
            : <Circle       className="h-4 w-4 text-gray-700 hover:text-green-500 transition-colors" />
          }
        </button>
          <div className="flex-1 min-w-0">
            <span className={cn('text-sm font-medium', done ? 'line-through text-gray-600' : 'text-white')}>
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DurationBadge minutes={task.est_duration} />
            {task.priority_level && <PriorityBadge level={task.priority_level} />}
            <button
              onClick={() => onDelete(task.task_id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400"
              title="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-7">
          {task.projectTitle && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-400">
              <Layers className="h-3 w-3" />
              {task.projectTitle}
            </span>
          )}
          {!task.projectTitle && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-500">
              Standalone
            </span>
          )}
          {task.due_date && (
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
              new Date(task.due_date) < new Date()
                ? 'bg-red-950/40 border-red-900/30 text-red-400'
                : 'bg-gray-900/60 border-gray-800 text-gray-400'
            )}>
              <Clock className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {(task.tag ?? []).map((t) => <TagPill key={t.tag_id} tag={t} />)}
          {(task.resource ?? []).map((r) => <ResourceLink key={r.resource_id} resource={r} />)}
        </div>
    </div>
  )
}

function AllTasksView({ directory, standaloneTasks, onDeleteTask, onToggleComplete }) {
  const projectTasks = flattenTasks(directory)
  const allTasks = [
    ...projectTasks,
    ...(standaloneTasks ?? []).map(t => ({ ...t, projectTitle: null })),
  ]

  if (allTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600 text-sm gap-2">
        <List className="h-8 w-8 opacity-40" />
        No tasks yet. Create one with the button above.
      </div>
    )
  }

  const sorted = [...allTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return (b.priority_level ?? 0) - (a.priority_level ?? 0)
  })

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((task) => (
        <TaskRow key={task.task_id} task={task} onDelete={onDeleteTask} onToggleComplete={onToggleComplete} />
      ))}
    </div>
  )
}

// ─── Project Tiles View ────────────────────────────────────────────────────────

function TileTaskRow({ task, onToggleComplete }) {
  const checkRef = useRef(null)

  function handleCheck(e) {
    e.stopPropagation()
    const rect = checkRef.current?.getBoundingClientRect()
    if (!task.completed && rect) fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2)
    onToggleComplete(task.task_id, !task.completed)
  }

  return (
    <div className="flex items-center gap-2">
      <button ref={checkRef} onClick={handleCheck} className="shrink-0 hover:scale-110 transition-transform">
        {task.completed
          ? <CheckCircle2 className="h-3 w-3 text-green-700 hover:text-gray-500 transition-colors" />
          : <Circle       className="h-3 w-3 text-gray-700 hover:text-green-500 transition-colors" />
        }
      </button>
      <span className={cn('text-xs truncate', task.completed ? 'line-through text-gray-600' : 'text-gray-300')}>
        {task.title}
      </span>
      {task.priority_level && (
        <span className={cn('text-xs font-bold ml-auto shrink-0', PRIORITY_STYLES[task.priority_level]?.class ?? '')}>
          {PRIORITY_STYLES[task.priority_level]?.label}
        </span>
      )}
    </div>
  )
}

function ProjectTile({ project, onSeeAllTasks, onDeleteProject, onDeleteTask, onToggleComplete, onResolveProject }) {
  const tasks    = project.task ?? []
  const done     = tasks.filter((t) => t.completed).length
  const preview  = tasks.slice(0, 3)
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [resolving, setResolving]         = useState(false)

  function handleDeleteClick(e) {
    e.stopPropagation()
    if (tasks.length > 0) {
      setConfirmDelete(true)
    } else {
      onDeleteProject(project.project_id)
    }
  }

  async function handleResolve(e) {
    e.stopPropagation()
    setResolving(true)
    try {
      await onResolveProject(project.project_id)
    } finally {
      setResolving(false)
    }
  }

  return (
    <>
      <div className="group cursor-default transform transition-all duration-300 hover:scale-[1.02] hover:-rotate-[0.5deg]">
        <div className="relative flex flex-col rounded-2xl border border-gray-800/60 bg-gray-950/80 shadow-lg backdrop-blur-xl overflow-hidden hover:border-gray-700/60 transition-all duration-300">

          {/* Subtle top gradient */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
          </div>

          {/* ── Content ── */}
          <div className="relative z-10 flex flex-col flex-1">

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">
                  {project.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {project.priority_level && <PriorityBadge level={project.priority_level} />}
                  <span className="text-xs text-gray-600">{done}/{tasks.length} done</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="text-gray-600 hover:text-green-400 transition-colors"
                  title="Mark project as resolved"
                >
                  {resolving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCheck className="h-3.5 w-3.5" />
                  }
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {tasks.length > 0 && (
              <div className="px-5 pb-3">
                <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white/20 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Task preview */}
            <div className="flex-1 px-5 pb-3 flex flex-col gap-1.5">
              {tasks.length === 0 ? (
                <p className="text-xs text-gray-700 py-2 text-center">No tasks yet.</p>
              ) : (
                preview.map((task) => (
                  <TileTaskRow key={task.task_id} task={task} onToggleComplete={onToggleComplete} />
                ))
              )}
              {tasks.length > 3 && (
                <p className="text-xs text-gray-700 mt-0.5">+{tasks.length - 3} more</p>
              )}
            </div>

            {/* See all tasks */}
            <div className="px-5 pb-4 pt-1 border-t border-gray-800/40">
              <button
                onClick={() => onSeeAllTasks(project.project_id)}
                className="w-full text-xs text-gray-500 hover:text-white py-1.5 transition-colors"
              >
                See all tasks →
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDeleteModal
          title={`Delete "${project.title}"?`}
          message={`This project has ${tasks.length} task${tasks.length !== 1 ? 's' : ''}. Deleting it will also remove all associated tasks.`}
          onConfirm={() => { setConfirmDelete(false); onDeleteProject(project.project_id) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

function StandaloneTasksCard({ tasks, onToggleComplete }) {
  if (!tasks || tasks.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-800/50 bg-gray-950/60 backdrop-blur-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <List className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-300">Standalone Tasks</span>
        <span className="text-xs text-gray-600">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {tasks.map((task) => (
          <TileTaskRow key={task.task_id} task={task} onToggleComplete={onToggleComplete} />
        ))}
      </div>
    </div>
  )
}

function ProjectsTileView({ directory, standaloneTasks, onSeeAllTasks, onDeleteProject, onDeleteTask, onToggleComplete, onResolveProject }) {
  if (directory.length === 0 && (!standaloneTasks || standaloneTasks.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600 text-sm gap-2">
        <LayoutGrid className="h-8 w-8 opacity-40" />
        No projects yet. Create one with the button above.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {directory.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directory.map((project) => (
            <ProjectTile
              key={project.project_id}
              project={project}
              onSeeAllTasks={onSeeAllTasks}
              onDeleteProject={onDeleteProject}
              onDeleteTask={onDeleteTask}
              onToggleComplete={onToggleComplete}
              onResolveProject={onResolveProject}
            />
          ))}
        </div>
      )}
      <StandaloneTasksCard tasks={standaloneTasks} onToggleComplete={onToggleComplete} />
    </div>
  )
}

// ─── Projects Directory View (accordion) ─────────────────────────────────────

function AccordionTaskRow({ task, onDeleteTask, onToggleComplete }) {
  const checkRef = useRef(null)

  function handleCheck() {
    const rect = checkRef.current?.getBoundingClientRect()
    if (!task.completed && rect) fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2)
    onToggleComplete(task.task_id, !task.completed)
  }

  return (
    <div className={cn(
      'group px-5 py-3.5 flex flex-col gap-2 hover:bg-white/3 transition-colors',
      task.completed && 'opacity-50'
    )}>
      <div className="flex items-center gap-3">
        <button
          ref={checkRef}
          onClick={handleCheck}
          className="shrink-0 hover:scale-110 transition-transform"
          title={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed
            ? <CheckCircle2 className="h-4 w-4 text-green-600 hover:text-gray-500 transition-colors" />
            : <Circle       className="h-4 w-4 text-gray-700 hover:text-green-500 transition-colors" />
          }
        </button>
        <span className={cn('flex-1 text-sm', task.completed ? 'line-through text-gray-600' : 'text-gray-200')}>
          {task.title}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <DurationBadge minutes={task.est_duration} />
          {task.priority_level && <PriorityBadge level={task.priority_level} />}
          <button
            onClick={() => onDeleteTask(task.task_id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {((task.tag?.length ?? 0) > 0 || (task.resource?.length ?? 0) > 0) && (
        <div className="flex flex-wrap items-center gap-2 pl-7">
          {(task.tag ?? []).map((t) => <TagPill key={t.tag_id} tag={t} />)}
          {(task.resource ?? []).map((r) => <ResourceLink key={r.resource_id} resource={r} />)}
        </div>
      )}
    </div>
  )
}

function ProjectAccordion({ project, expanded, onToggle, onDeleteProject, onDeleteTask, onToggleComplete, onResolveProject }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [resolving, setResolving]         = useState(false)
  const tasks = project.task ?? []
  const done  = tasks.filter((t) => t.completed).length

  function handleDeleteClick(e) {
    e.stopPropagation()
    if (tasks.length > 0) {
      setConfirmDelete(true)
    } else {
      onDeleteProject(project.project_id)
    }
  }

  async function handleResolve(e) {
    e.stopPropagation()
    setResolving(true)
    try {
      await onResolveProject(project.project_id)
    } finally {
      setResolving(false)
    }
  }

  return (
    <>
      <div className="border border-gray-800/50 rounded-xl overflow-hidden hover:border-gray-700/50 transition-colors backdrop-blur-sm bg-gray-950/60">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors text-left group"
        >
          {expanded
            ? <ChevronDown  className="h-4 w-4 text-gray-600 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
          }
          <span className="flex-1 text-sm font-semibold text-white truncate">{project.title}</span>
          <div className="flex items-center gap-3 shrink-0">
            {project.priority_level && <PriorityBadge level={project.priority_level} />}
            <span className="text-xs text-gray-600">{done}/{tasks.length} done</span>
            {tasks.length > 0 && (
              <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/20 transition-all duration-500"
                  style={{ width: `${(done / tasks.length) * 100}%` }}
                />
              </div>
            )}
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-green-400 ml-1"
              title="Mark project as resolved"
            >
              {resolving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCheck className="h-3.5 w-3.5" />
              }
            </button>
            <button
              onClick={handleDeleteClick}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 ml-1"
              title="Delete project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </button>

        {expanded && (
          <div className="divide-y divide-gray-800/30 bg-black/20">
            {tasks.length === 0 && (
              <p className="px-10 py-4 text-sm text-gray-700 text-center">No tasks in this project.</p>
            )}
            {tasks.map((task) => (
              <AccordionTaskRow
                key={task.task_id}
                task={task}
                onDeleteTask={onDeleteTask}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDeleteModal
          title={`Delete "${project.title}"?`}
          message={`This project has ${tasks.length} task${tasks.length !== 1 ? 's' : ''}. Deleting it will also remove all associated tasks. This cannot be undone.`}
          onConfirm={() => { setConfirmDelete(false); onDeleteProject(project.project_id) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

function ProjectsDirectoryView({ directory, expandedProjects, onToggleExpand, onDeleteProject, onDeleteTask, onToggleComplete, onResolveProject }) {
  if (directory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600 text-sm gap-2">
        <Layers className="h-8 w-8 opacity-40" />
        No projects found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {directory.map((project) => (
        <ProjectAccordion
          key={project.project_id}
          project={project}
          expanded={expandedProjects.has(project.project_id)}
          onToggle={() => onToggleExpand(project.project_id)}
          onDeleteProject={onDeleteProject}
          onDeleteTask={onDeleteTask}
          onToggleComplete={onToggleComplete}
          onResolveProject={onResolveProject}
        />
      ))}
    </div>
  )
}

// ─── Dashboard (main export) ──────────────────────────────────────────────────

export default function Dashboard() {
  const [directory,         setDirectory]         = useState([])
  const [standaloneTasks,   setStandaloneTasks]   = useState([])
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState('')
  const [activeView,        setActiveView]        = useState('projects')
  const [showTaskModal,     setShowTaskModal]      = useState(false)
  const [showProjectModal,  setShowProjectModal]  = useState(false)
  const [isDeletingGlobal,  setIsDeletingGlobal]  = useState(false)
  const [expandedProjects,  setExpandedProjects]  = useState(new Set())

  const fetchDirectory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/directory')
      setDirectory(data)
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStandaloneTasks = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks?standalone=true')
      setStandaloneTasks(Array.isArray(data) ? data : [])
    } catch {
      // Standalone tasks endpoint may not exist — fail silently
      setStandaloneTasks([])
    }
  }, [])

  useEffect(() => {
    fetchDirectory()
    fetchStandaloneTasks()
  }, [fetchDirectory, fetchStandaloneTasks])

  async function handleDeleteTask(taskId) {
    setIsDeletingGlobal(true)
    try {
      await api.delete(`/tasks/${taskId}`)
      await Promise.all([fetchDirectory(), fetchStandaloneTasks()])
    } finally {
      setIsDeletingGlobal(false)
    }
  }

  async function handleDeleteProject(projectId) {
    setIsDeletingGlobal(true)
    try {
      await api.delete(`/projects/${projectId}`)
      await fetchDirectory()
    } finally {
      setIsDeletingGlobal(false)
    }
  }

  async function handleResolveProject(projectId) {
    try {
      await api.patch(`/projects/${projectId}`, { resolved: true })
      toast.success('Project marked as resolved')
      await fetchDirectory()
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to resolve project.')
    }
  }

  async function handleToggleComplete(taskId, completed) {
    setDirectory((prev) =>
      prev.map((project) => ({
        ...project,
        task: (project.task ?? []).map((t) =>
          t.task_id === taskId ? { ...t, completed } : t
        ),
      }))
    )
    setStandaloneTasks((prev) =>
      prev.map((t) => t.task_id === taskId ? { ...t, completed } : t)
    )
    try {
      const payload = completed
        ? { completed: true }
        : { completed: false, completed_at: null }
      await api.patch(`/tasks/${taskId}`, payload)
    } catch {
      toast.error('Failed to update task — changes rolled back')
      await Promise.all([fetchDirectory(), fetchStandaloneTasks()])
    }
  }

  function handleSeeAllTasks(projectId) {
    setExpandedProjects((prev) => new Set([...prev, projectId]))
    setActiveView('directory')
  }

  function toggleExpand(projectId) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      next.has(projectId) ? next.delete(projectId) : next.add(projectId)
      return next
    })
  }

  const allTasks  = [...flattenTasks(directory), ...standaloneTasks]
  const doneTasks = allTasks.filter((t) => t.completed).length

  const tabs = [
    { id: 'projects',   label: 'Projects',           icon: LayoutGrid },
    { id: 'tasks',      label: 'All Tasks',           icon: List       },
    { id: 'directory',  label: 'Projects Directory',  icon: Layers     },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">

      {/* ── Tetris deletion overlay ── */}
      {isDeletingGlobal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
          <TetrisLoading size="md" speed="fast" loadingText="Deleting…" />
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-1">
              {doneTasks}/{allTasks.length} tasks completed across {directory.length} project{directory.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={() => setShowProjectModal(true)}
            variant="ghost"
            size="sm"
            neon={false}
          >
            New Project
          </Button>
          <Button
            onClick={() => setShowTaskModal(true)}
            size="sm"
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* ── View tabs ── */}
      <div className="inline-flex self-start bg-gray-950/80 backdrop-blur-sm border border-gray-800/50 rounded-lg p-1 gap-0.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeView === id
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
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

      {!loading && !error && activeView === 'projects' && (
        <ProjectsTileView
          directory={directory}
          standaloneTasks={standaloneTasks}
          onSeeAllTasks={handleSeeAllTasks}
          onDeleteProject={handleDeleteProject}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
          onResolveProject={handleResolveProject}
        />
      )}

      {!loading && !error && activeView === 'tasks' && (
        <AllTasksView
          directory={directory}
          standaloneTasks={standaloneTasks}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
        />
      )}

      {!loading && !error && activeView === 'directory' && (
        <ProjectsDirectoryView
          directory={directory}
          expandedProjects={expandedProjects}
          onToggleExpand={toggleExpand}
          onDeleteProject={handleDeleteProject}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
          onResolveProject={handleResolveProject}
        />
      )}

      {/* ── Modals ── */}
      {showTaskModal && (
        <CreateTaskModal
          directory={directory}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => { setShowTaskModal(false); fetchDirectory(); fetchStandaloneTasks() }}
        />
      )}

      {showProjectModal && (
        <CreateProjectModal
          onClose={() => setShowProjectModal(false)}
          onSuccess={() => { setShowProjectModal(false); fetchDirectory() }}
        />
      )}
    </div>
  )
}
