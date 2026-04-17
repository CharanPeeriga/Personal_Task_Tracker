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
  CheckCheck, Pencil,
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

const TAG_SWATCHES = [
  '#64748b', '#71717a', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
]

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
      const body = {
        title:          form.title,
        est_duration:   form.est_duration   ? parseInt(form.est_duration)   : undefined,
        priority_level: form.priority_level ? parseInt(form.priority_level) : undefined,
        due_date:       form.due_date        ? new Date(form.due_date).toISOString() : undefined,
      }
      if (form.project_id) body.project_id = parseInt(form.project_id)
      await api.post('/tasks', body)
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
            <Label htmlFor="task-project" className="text-gray-400 text-xs">Project</Label>
            <select
              id="task-project"
              value={form.project_id}
              onChange={(e) => set('project_id', e.target.value)}
              className={SELECT_CLS}
              style={{ backgroundColor: '#000', color: '#fff' }}
            >
              <option value="" style={{ backgroundColor: '#000', color: '#fff' }}>No project (standalone)</option>
              {directory.map((p) => (
                <option key={p.project_id} value={p.project_id} style={{ backgroundColor: '#000', color: '#fff' }}>{p.title}</option>
              ))}
            </select>
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

// ─── Edit Task Modal ──────────────────────────────────────────────────────────

function EditTaskModal({ task, directory, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title:          task.title || '',
    est_duration:   task.est_duration ? String(task.est_duration) : '',
    priority_level: String(task.priority_level || 3),
    project_id:     task.project_id ? String(task.project_id) : '',
    due_date:       task.due_date ? task.due_date.slice(0, 10) : '',
  })
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')

  const [taskTags, setTaskTags]           = useState(task.tag ?? [])
  const [allTags, setAllTags]             = useState([])
  const [selectedTagId, setSelectedTagId] = useState('')
  const [newTagName, setNewTagName]       = useState('')
  const [newTagColor, setNewTagColor]     = useState('#64748b')
  const [tagLoading, setTagLoading]       = useState(false)

  const [resources, setResources]         = useState(task.resource ?? [])
  const [resForm, setResForm]             = useState({ title: '', url: '', platform: '' })
  const [resLoading, setResLoading]       = useState(false)

  useEffect(() => {
    api.get('/tags').then(res => setAllTags(res.data)).catch(() => {})
  }, [])

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.patch(`/tasks/${task.task_id}`, {
        title:          form.title,
        est_duration:   form.est_duration   ? parseInt(form.est_duration)   : undefined,
        priority_level: form.priority_level ? parseInt(form.priority_level) : undefined,
        project_id:     form.project_id     ? parseInt(form.project_id)     : null,
        due_date:       form.due_date        ? new Date(form.due_date).toISOString() : undefined,
      })
      toast.success('Task updated')
      onSuccess()
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Failed to update task.'
      setError(msg)
      toast.error(msg)
      setSaving(false)
    }
  }

  async function handleRemoveTag(tagId) {
    setTagLoading(true)
    try {
      await api.delete(`/tasks/${task.task_id}/tags/${tagId}`)
      setTaskTags(prev => prev.filter(t => t.tag_id !== tagId))
    } catch {
      toast.error('Failed to remove tag')
    } finally {
      setTagLoading(false)
    }
  }

  async function handleAddTag() {
    if (!selectedTagId) return
    setTagLoading(true)
    try {
      await api.post(`/tasks/${task.task_id}/tags`, { tag_id: parseInt(selectedTagId) })
      const tag = allTags.find(t => t.tag_id === parseInt(selectedTagId))
      if (tag) setTaskTags(prev => [...prev, tag])
      setSelectedTagId('')
    } catch {
      toast.error('Failed to add tag')
    } finally {
      setTagLoading(false)
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    setTagLoading(true)
    try {
      const res = await api.post('/tags', { name: newTagName.trim(), color_hex: newTagColor })
      const created = res.data[0]
      setAllTags(prev => [...prev, created])
      await api.post(`/tasks/${task.task_id}/tags`, { tag_id: created.tag_id })
      setTaskTags(prev => [...prev, created])
      setNewTagName('')
      setNewTagColor('#64748b')
    } catch {
      toast.error('Failed to create tag')
    } finally {
      setTagLoading(false)
    }
  }

  async function handleAddResource() {
    if (!resForm.title.trim()) return
    setResLoading(true)
    try {
      const res = await api.post('/resources', {
        title:    resForm.title.trim(),
        url:      resForm.url.trim() || undefined,
        platform: resForm.platform.trim() || undefined,
        task_id:  task.task_id,
      })
      setResources(prev => [...prev, res.data[0]])
      setResForm({ title: '', url: '', platform: '' })
    } catch {
      toast.error('Failed to add resource')
    } finally {
      setResLoading(false)
    }
  }

  async function handleDeleteResource(resourceId) {
    setResLoading(true)
    try {
      await api.delete(`/resources/${resourceId}`)
      setResources(prev => prev.filter(r => r.resource_id !== resourceId))
    } catch {
      toast.error('Failed to delete resource')
    } finally {
      setResLoading(false)
    }
  }

  const availableTags = allTags.filter(t => !taskTags.some(tt => tt.tag_id === t.tag_id))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-gray-950/95 backdrop-blur-xl border border-gray-800/60 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800/50 sticky top-0 bg-gray-950/95 z-10">
          <h2 className="text-base font-semibold text-white">Edit Task</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title" className="text-gray-400 text-xs">Title *</Label>
            <Input
              id="edit-title"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-duration" className="text-gray-400 text-xs">Duration (min)</Label>
              <Input
                id="edit-duration"
                type="number"
                min="1"
                value={form.est_duration}
                onChange={(e) => set('est_duration', e.target.value)}
                placeholder="60"
                className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-priority" className="text-gray-400 text-xs">Priority (1–5)</Label>
              <select
                id="edit-priority"
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
            <Label htmlFor="edit-project" className="text-gray-400 text-xs">Project</Label>
            <select
              id="edit-project"
              value={form.project_id}
              onChange={(e) => set('project_id', e.target.value)}
              className={SELECT_CLS}
              style={{ backgroundColor: '#000', color: '#fff' }}
            >
              <option value="" style={{ backgroundColor: '#000', color: '#fff' }}>No project (standalone)</option>
              {directory.map((p) => (
                <option key={p.project_id} value={p.project_id} style={{ backgroundColor: '#000', color: '#fff' }}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-due" className="text-gray-400 text-xs">Due Date</Label>
            <Input
              id="edit-due"
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
              className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <Label className="text-gray-400 text-xs">Tags</Label>
            {taskTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {taskTags.map(tag => (
                  <span
                    key={tag.tag_id}
                    style={{ backgroundColor: (tag.color_hex ?? '#6b7280') + '25', borderColor: (tag.color_hex ?? '#6b7280') + '70', color: tag.color_hex ?? '#6b7280' }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.tag_id)}
                      disabled={tagLoading}
                      className="hover:opacity-70 transition-opacity ml-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {availableTags.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(e.target.value)}
                  className="flex-1 bg-black border border-gray-800 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-black [&>option]:text-white"
                  style={{ backgroundColor: '#000', color: '#fff' }}
                >
                  <option value="" style={{ backgroundColor: '#000', color: '#fff' }}>Add existing tag…</option>
                  {availableTags.map(t => (
                    <option key={t.tag_id} value={t.tag_id} style={{ backgroundColor: '#000', color: '#fff' }}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!selectedTagId || tagLoading}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-gray-800 rounded-lg text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="New tag name…"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30 text-xs h-8"
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || tagLoading}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-gray-800 rounded-lg text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TAG_SWATCHES.map(color => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={cn(
                      'h-5 w-5 rounded-full transition-all shrink-0',
                      newTagColor === color && 'ring-2 ring-white ring-offset-1 ring-offset-black'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-2">
            <Label className="text-gray-400 text-xs">Resources</Label>
            {resources.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {resources.map(r => (
                  <div key={r.resource_id} className="flex items-start gap-2 rounded-lg bg-white/3 border border-gray-800/30 px-2.5 py-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{r.title}</div>
                      {r.platform && <div className="text-xs text-gray-400">{r.platform}</div>}
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors truncate block">
                          {r.url}
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteResource(r.resource_id)}
                      disabled={resLoading}
                      className="text-gray-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 p-3 rounded-lg border border-gray-800/50 bg-black/30">
              <Input
                placeholder="Resource title *"
                value={resForm.title}
                onChange={(e) => setResForm(p => ({ ...p, title: e.target.value }))}
                className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30 text-xs h-8"
              />
              <Input
                placeholder="URL"
                value={resForm.url}
                onChange={(e) => setResForm(p => ({ ...p, url: e.target.value }))}
                className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30 text-xs h-8"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Platform (optional)"
                  value={resForm.platform}
                  onChange={(e) => setResForm(p => ({ ...p, platform: e.target.value }))}
                  className="flex-1 bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30 text-xs h-8"
                />
                <button
                  type="button"
                  onClick={handleAddResource}
                  disabled={!resForm.title.trim() || resLoading}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-gray-800 rounded-lg text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
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
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save Changes'}
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

function TaskRow({ task, onDelete, onToggleComplete, onEdit }) {
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
            <span className={cn('text-base font-medium', done ? 'line-through text-gray-600' : 'text-white')}>
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DurationBadge minutes={task.est_duration} />
            {task.priority_level && <PriorityBadge level={task.priority_level} />}
            {task.due_date && (
              <span className="text-xs text-gray-500">
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {!task.due_date && (
              <span className="text-xs text-gray-700">no due date</span>
            )}
            <button
              onClick={() => onEdit(task)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-white"
              title="Edit task"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
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
          {(task.tag ?? []).map((t) => <TagPill key={t.tag_id} tag={t} />)}
          {(task.resource ?? []).map((r) => <ResourceLink key={r.resource_id} resource={r} />)}
        </div>
    </div>
  )
}

function AllTasksView({ directory, standaloneTasks, onDeleteTask, onToggleComplete, onEdit }) {
  const [completionFilter, setCompletionFilter] = useState('all')
  const [priorityFilter, setPriorityFilter]     = useState('all')

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

  let filtered = sorted
  if (completionFilter === 'incomplete') filtered = filtered.filter(t => !t.completed)
  else if (completionFilter === 'completed') filtered = filtered.filter(t => t.completed)
  if (priorityFilter !== 'all') filtered = filtered.filter(t => String(t.priority_level) === priorityFilter)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex bg-gray-950/80 border border-gray-800/50 rounded-lg p-0.5 gap-0.5">
          {[['all', 'All'], ['incomplete', 'Incomplete'], ['completed', 'Completed']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setCompletionFilter(val)}
              className={cn(
                'px-3 py-1 rounded-md text-sm transition-colors',
                completionFilter === val ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-black border border-gray-800 text-sm text-gray-400 rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-black [&>option]:text-white"
          style={{ backgroundColor: '#000', color: '#9ca3af' }}
        >
          <option value="all" style={{ backgroundColor: '#000', color: '#fff' }}>All Priorities</option>
          {[1, 2, 3, 4, 5].map(p => (
            <option key={p} value={String(p)} style={{ backgroundColor: '#000', color: '#fff' }}>P{p}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600 text-sm gap-2">
          <List className="h-6 w-6 opacity-40" />
          No tasks match the current filters.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => (
            <TaskRow key={task.task_id} task={task} onDelete={onDeleteTask} onToggleComplete={onToggleComplete} onEdit={onEdit} />
          ))}
        </div>
      )}
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
      <span className={cn('text-sm truncate', task.completed ? 'line-through text-gray-600' : 'text-gray-300')}>
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
  const sorted  = [...tasks].sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0))
  const preview = sorted.slice(0, 3)
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [resolving, setResolving]         = useState(false)
  const [detailOpen, setDetailOpen]       = useState(false)

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
      <div className="group cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:-rotate-[0.5deg]">
        <div
          className="relative flex flex-col rounded-2xl border border-gray-800/60 bg-gray-950/80 shadow-lg backdrop-blur-xl overflow-hidden hover:border-gray-700/60 transition-all duration-300"
          onClick={() => setDetailOpen(true)}
        >

          {/* Subtle top gradient */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
          </div>

          {/* ── Content ── */}
          <div className="relative z-10 flex flex-col flex-1">

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white truncate">
                  {project.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {project.priority_level && <PriorityBadge level={project.priority_level} />}
                  <span className="text-xs text-gray-600">{done}/{tasks.length} done</span>
                  {project.due_date && (
                    <span className="text-xs text-gray-500">
                      Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {!project.due_date && (
                    <span className="text-xs text-gray-700">no due date</span>
                  )}
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
                onClick={(e) => { e.stopPropagation(); onSeeAllTasks(project.project_id) }}
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
      {detailOpen && (
        <ProjectDetailModal project={project} onClose={() => setDetailOpen(false)} />
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

function ProjectDetailModal({ project, onClose }) {
  const tasks = [...(project.task ?? [])].sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-gray-950/95 backdrop-blur-xl border border-gray-800/60 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-gray-800/50 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-white">{project.title}</h2>
            <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {project.priority_level && <PriorityBadge level={project.priority_level} />}
            {project.due_date && (
              <span className="text-xs text-gray-500">
                Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-gray-400 mt-2">{project.description}</p>
          )}
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">No tasks in this project.</p>
          ) : (
            tasks.map(task => (
              <div key={task.task_id} className="rounded-xl border border-gray-800/40 bg-gray-900/40 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {task.completed
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    : <Circle       className="h-4 w-4 text-gray-700 shrink-0" />
                  }
                  <span className={cn('text-sm flex-1', task.completed ? 'line-through text-gray-600' : 'text-white')}>
                    {task.title}
                  </span>
                  {task.priority_level && <PriorityBadge level={task.priority_level} />}
                </div>
                {(task.tag ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {task.tag.map(t => <TagPill key={t.tag_id} tag={t} />)}
                  </div>
                )}
                {(task.resource ?? []).length > 0 && (
                  <div className="flex flex-col gap-1 pl-6 mt-1">
                    {task.resource.map(r => (
                      <div key={r.resource_id} className="flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3 text-gray-600 shrink-0" />
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 truncate"
                        >
                          {r.title || r.platform || 'Link'}
                        </a>
                        {r.platform && (
                          <span className="text-xs text-gray-600 bg-gray-800/50 px-1.5 py-0.5 rounded shrink-0">
                            {r.platform}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ProjectsTileView({ directory, standaloneTasks, onSeeAllTasks, onDeleteProject, onDeleteTask, onToggleComplete, onResolveProject }) {
  const activeProjects = directory.filter(p => !p.isarchived)

  if (activeProjects.length === 0 && (!standaloneTasks || standaloneTasks.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600 text-sm gap-2">
        <LayoutGrid className="h-8 w-8 opacity-40" />
        No projects yet. Create one with the button above.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {activeProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.map((project) => (
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

function AccordionTaskRow({ task, onDeleteTask, onToggleComplete, onEditTask }) {
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
        <span className={cn('flex-1 text-base', task.completed ? 'line-through text-gray-600' : 'text-gray-200')}>
          {task.title}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <DurationBadge minutes={task.est_duration} />
          {task.priority_level && <PriorityBadge level={task.priority_level} />}
          {task.due_date && (
            <span className="text-xs text-gray-500">
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {!task.due_date && (
            <span className="text-xs text-gray-700">no due date</span>
          )}
          <button
            onClick={() => onEditTask(task)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-white"
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
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

function ProjectAccordion({ project, expanded, onToggle, onDeleteProject, onDeleteTask, onToggleComplete, onResolveProject, onEditTask }) {
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
                onEditTask={onEditTask}
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

function ProjectsDirectoryView({ directory, expandedProjects, onToggleExpand, onDeleteProject, onDeleteTask, onToggleComplete, onResolveProject, onEditTask }) {
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
          onEditTask={onEditTask}
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
  const [editingTask,       setEditingTask]        = useState(null)

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
      const { data } = await api.get('/tasks')
      setStandaloneTasks(Array.isArray(data) ? data.filter(t => !t.project_id) : [])
    } catch {
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
    const project = directory.find(p => p.project_id === projectId)
    if (!project || !project.task || project.task.length === 0 || !project.task.every(t => t.completed)) {
      toast.error('Complete all tasks before resolving this project')
      return
    }
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
          onEdit={setEditingTask}
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
          onEditTask={setEditingTask}
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

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          directory={directory}
          onClose={() => {
            setEditingTask(null)
            fetchDirectory()
            fetchStandaloneTasks()
          }}
          onSuccess={() => {
            setEditingTask(null)
            fetchDirectory()
            fetchStandaloneTasks()
          }}
        />
      )}
    </div>
  )
}
