import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import api from '@/api/axiosInstance'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Grid3x3,
  Loader2, CheckCircle2, Circle, Plus, Trash2, Pencil, X, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PRIORITY_STYLES = {
  1: { label: 'P1', class: 'text-gray-400' },
  2: { label: 'P2', class: 'text-blue-400' },
  3: { label: 'P3', class: 'text-yellow-400' },
  4: { label: 'P4', class: 'text-orange-400' },
  5: { label: 'P5', class: 'text-red-400' },
}

const PRIORITY_BADGE_CLS = {
  1: 'text-gray-400 bg-gray-800/80',
  2: 'text-blue-400 bg-blue-950/60',
  3: 'text-yellow-400 bg-yellow-950/60',
  4: 'text-orange-400 bg-orange-950/60',
  5: 'text-red-400 bg-red-950/60',
}

const EVENT_COLORS = ['#3b82f6', '#22c55e', '#6366f1', '#f97316', '#ec4899', '#eab308']
const DAY_LABELS   = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const HOUR_HEIGHT  = 56
const COLOR_MAP    = {}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBlockTime(isoStr) {
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function blockDuration(block) {
  return Math.round((new Date(block.end_time) - new Date(block.start_time)) / 60000)
}

function isSameDay(a, b) {
  return (
    a.getDate()     === b.getDate()     &&
    a.getMonth()    === b.getMonth()    &&
    a.getFullYear() === b.getFullYear()
  )
}

function expandEventsForRange(dbEvents, startDate, endDate) {
  const result = []
  dbEvents.forEach(ev => {
    if (ev.is_recurring && ev.day_of_week != null) {
      const days = Array.isArray(ev.day_of_week) ? ev.day_of_week : [ev.day_of_week]
      const recStart = ev.recurrence_start ? new Date(ev.recurrence_start + 'T00:00:00') : null
      const recEnd   = ev.recurrence_end   ? new Date(ev.recurrence_end   + 'T23:59:59') : null
      const cur = new Date(startDate)
      cur.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      while (cur <= end) {
        if (days.includes(cur.getDay())) {
          if ((!recStart || cur >= recStart) && (!recEnd || cur <= recEnd)) {
            const [sh, sm] = ev.start_time.substring(0, 5).split(':').map(Number)
            const [eh, em] = ev.end_time.substring(0, 5).split(':').map(Number)
            const startTime = new Date(cur)
            startTime.setHours(sh, sm, 0, 0)
            const endTime = new Date(cur)
            endTime.setHours(eh, em, 0, 0)
            result.push({
              id: `evt-${ev.event_id}-${cur.toDateString()}`,
              title: ev.title,
              startTime,
              endTime,
              color: ev.color ?? '#3b82f6',
              isCalendarEvent: true,
            })
          }
        }
        cur.setDate(cur.getDate() + 1)
      }
    } else if (!ev.is_recurring && ev.specific_date) {
      const [sh, sm] = ev.start_time.substring(0, 5).split(':').map(Number)
      const [eh, em] = ev.end_time.substring(0, 5).split(':').map(Number)
      const [year, month, day] = ev.specific_date.split('-').map(Number)
      const startTime = new Date(year, month - 1, day, sh, sm, 0, 0)
      const endTime   = new Date(year, month - 1, day, eh, em, 0, 0)
      result.push({
        id: `evt-${ev.event_id}`,
        title: ev.title,
        startTime,
        endTime,
        color: ev.color ?? '#3b82f6',
        isCalendarEvent: true,
      })
    }
  })
  return result
}

function to12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDuration(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m free`
  return m > 0 ? `${h}h ${m}m free` : `${h}h free`
}

// ─── Event chip components ────────────────────────────────────────────────────
function EventChip({ ev, className }) {
  if (ev.isCalendarEvent) {
    return (
      <div
        className={cn('truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white opacity-80', className)}
        style={{ backgroundColor: ev.color }}
      >
        {ev.title}
      </div>
    )
  }
  return (
    <div className={cn('truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white bg-indigo-600', className)}>
      {ev.title}
    </div>
  )
}

function EventChipSm({ ev }) {
  if (ev.isCalendarEvent) {
    return (
      <div
        className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white opacity-80"
        style={{ backgroundColor: ev.color }}
      >
        {ev.title}
      </div>
    )
  }
  return (
    <div className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white bg-indigo-600">
      {ev.title}
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ currentDate, events }) {
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay   = new Date(year, month, 1)
  const startDate  = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days = []
  const cur  = new Date(startDate)
  for (let i = 0; i < 42; i++) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }

  const today = new Date()

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800/50">
      <div className="grid grid-cols-7 border-b border-gray-800/50 bg-gray-900/40">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-800/50 last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday        = isSameDay(day, today)
          const dayEvents      = events.filter(e => isSameDay(e.startTime, day))
          return (
            <div
              key={idx}
              className={cn(
                'min-h-20 border-b border-r border-gray-800/40 last:border-r-0 p-1.5 transition-colors duration-200',
                !isCurrentMonth && 'opacity-25',
                isCurrentMonth  && 'hover:bg-white/3',
              )}
            >
              <div className={cn(
                'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                isToday ? 'bg-white text-black font-bold' : 'text-gray-500',
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => <EventChip key={ev.id} ev={ev} />)}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500 pl-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ currentDate, events }) {
  const startOfWeek = new Date(currentDate)
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const today = new Date()

  return (
    <div className="overflow-auto rounded-xl border border-gray-800/50 max-h-[560px]">
      <div className="grid grid-cols-8 border-b border-gray-800/50 sticky top-0 bg-gray-950/95 backdrop-blur-md z-10">
        <div className="border-r border-gray-800/50 py-2 px-2 text-xs text-gray-600">Time</div>
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              'border-r border-gray-800/50 last:border-r-0 py-2 text-center text-xs',
              isSameDay(day, today) ? 'text-white font-semibold' : 'text-gray-500',
            )}
          >
            <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div className="text-[10px] text-gray-600">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-8" style={{ height: 24 * HOUR_HEIGHT }}>
        <div className="border-r border-gray-800/40 relative">
          {hours.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-gray-800/30 px-2 flex items-start pt-1">
              <span className="text-[10px] text-gray-600">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        {weekDays.map(day => {
          const dayEvents = events.filter(e => isSameDay(e.startTime, day))
          return (
            <div key={day.toISOString()} className="border-r border-gray-800/40 last:border-r-0 relative">
              {hours.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-gray-800/20 hover:bg-white/[0.01] transition-colors" />
              ))}
              {dayEvents.map(ev => {
                const startMins = ev.startTime.getHours() * 60 + ev.startTime.getMinutes()
                const endMins   = ev.endTime.getHours()   * 60 + ev.endTime.getMinutes()
                const topPx     = (startMins / 60) * HOUR_HEIGHT
                const heightPx  = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 20)
                return (
                  <div
                    key={ev.id}
                    style={{
                      position: 'absolute',
                      top: topPx,
                      height: heightPx,
                      left: 2,
                      right: 2,
                      backgroundColor: ev.color?.startsWith('#') ? ev.color : undefined,
                    }}
                    className={cn(
                      'rounded px-1.5 py-0.5 overflow-hidden z-10',
                      !ev.color?.startsWith('#') && (COLOR_MAP[ev.color] ?? 'bg-indigo-600'),
                      ev.isCalendarEvent ? 'opacity-75' : 'opacity-100',
                    )}
                  >
                    <div className="text-[10px] font-medium text-white truncate">{ev.title}</div>
                    {heightPx > 30 && (
                      <div className="text-[9px] text-white/70">
                        {ev.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ currentDate, events }) {
  const hours     = Array.from({ length: 24 }, (_, i) => i)
  const dayEvents = events.filter(e => isSameDay(e.startTime, currentDate))

  return (
    <div className="overflow-auto rounded-xl border border-gray-800/50 max-h-[560px]">
      <div className="flex" style={{ height: 24 * HOUR_HEIGHT }}>
        <div className="w-16 shrink-0 border-r border-gray-800/40 relative">
          {hours.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-gray-800/30 px-2 flex items-start pt-1">
              <span className="text-[10px] text-gray-600">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        <div className="flex-1 relative">
          {hours.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-gray-800/20 hover:bg-white/[0.01] transition-colors" />
          ))}
          {dayEvents.map(ev => {
            const startMins = ev.startTime.getHours() * 60 + ev.startTime.getMinutes()
            const endMins   = ev.endTime.getHours()   * 60 + ev.endTime.getMinutes()
            const topPx     = (startMins / 60) * HOUR_HEIGHT
            const heightPx  = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 24)
            return (
              <div
                key={ev.id}
                style={{
                  position: 'absolute',
                  top: topPx,
                  height: heightPx,
                  left: 8,
                  right: 8,
                  backgroundColor: ev.color?.startsWith('#') ? ev.color : undefined,
                }}
                className={cn(
                  'rounded-lg px-3 py-1 overflow-hidden z-10',
                  !ev.color?.startsWith('#') && (COLOR_MAP[ev.color] ?? 'bg-indigo-600'),
                  ev.isCalendarEvent ? 'opacity-75' : 'opacity-100',
                )}
              >
                <div className="text-sm font-medium text-white truncate">{ev.title}</div>
                {heightPx > 36 && (
                  <div className="text-xs text-white/70">
                    {ev.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {' – '}
                    {ev.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Schedule Project Detail Modal ────────────────────────────────────────────
function ScheduleProjectModal({ project, onClose }) {
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
            {project.priority_level && (
              <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', PRIORITY_BADGE_CLS[project.priority_level])}>
                P{project.priority_level}
              </span>
            )}
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
                  {task.priority_level && (
                    <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', PRIORITY_BADGE_CLS[task.priority_level])}>
                      P{task.priority_level}
                    </span>
                  )}
                </div>
                {(task.tag ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {task.tag.map(t => {
                      const hex = t.color_hex ?? '#6b7280'
                      return (
                        <span
                          key={t.tag_id}
                          style={{ backgroundColor: hex + '25', borderColor: hex + '70', color: hex }}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                        >
                          {t.name}
                        </span>
                      )
                    })}
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

// ─── Main Schedule page ───────────────────────────────────────────────────────
export default function Schedule() {
  const [blocks, setBlocks]                   = useState([])
  const [dbEvents, setDbEvents]               = useState([])
  const [calendarEvents, setCalendarEvents]   = useState([])
  const [loading, setLoading]                 = useState(true)
  const [loadingBlockId, setLoadingBlockId]   = useState(null)
  const [currentDate, setCurrentDate]         = useState(new Date())
  const [view, setView]                       = useState('month')
  const [isDialogOpen, setIsDialogOpen]       = useState(false)
  const [newBlock, setNewBlock]               = useState({ name: '', start_time: '', end_time: '' })
  const [formLoading, setFormLoading]         = useState(false)
  const [confirmDeleteBlockId, setConfirmDeleteBlockId] = useState(null)
  const [deletingBlockId, setDeletingBlockId] = useState(null)

  // Events state
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [eventFormLoading, setEventFormLoading]   = useState(false)
  const [deletingEventId, setDeletingEventId]     = useState(null)
  const [eventForm, setEventForm] = useState({
    title: '', color: '#3b82f6', is_recurring: true,
    day_of_week: [], specific_date: '', start_time: '', end_time: '',
    recurrence_start: '', recurrence_end: '',
  })

  // Edit event state
  const [editingEvent, setEditingEvent]               = useState(null)
  const [isEditEventDialogOpen, setIsEditEventDialogOpen] = useState(false)
  const [editEventFormLoading, setEditEventFormLoading]   = useState(false)
  const [editEventForm, setEditEventForm] = useState({
    title: '', color: '#3b82f6', is_recurring: true,
    day_of_week: [], specific_date: '', start_time: '', end_time: '',
    recurrence_start: '', recurrence_end: '',
  })

  // Project detail state (Change 5)
  const [detailProject, setDetailProject]   = useState(null)
  const [detailLoading, setDetailLoading]   = useState(false)

  // Availability state
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false)
  const [availDate, setAvailDate]   = useState(new Date().toISOString().slice(0, 10))
  const [availSlots, setAvailSlots] = useState(null)
  const [availLoading, setAvailLoading] = useState(false)

  const fetchBlocks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/blocks-directory')
      setBlocks(res.data)
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to load time blocks')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/events')
      setDbEvents(res.data)
    } catch {
      // Events are non-critical
    }
  }, [])

  useEffect(() => {
    fetchBlocks()
    fetchEvents()
  }, [fetchBlocks, fetchEvents])

  // Merge block events + expanded calendar events whenever source data changes
  useEffect(() => {
    const rangeStart = new Date()
    rangeStart.setMonth(rangeStart.getMonth() - 3)
    const rangeEnd = new Date()
    rangeEnd.setMonth(rangeEnd.getMonth() + 3)

    const blockEvts = blocks.map(b => ({
      id: String(b.block_id),
      title: b.name,
      startTime: new Date(b.start_time),
      endTime: new Date(b.end_time),
      color: null,
      isCalendarEvent: false,
    }))

    setCalendarEvents([
      ...blockEvts,
      ...expandEventsForRange(dbEvents, rangeStart, rangeEnd),
    ])
  }, [blocks, dbEvents])

  async function handleCreateBlock(e) {
    e.preventDefault()
    setFormLoading(true)
    try {
      await api.post('/blocks', {
        name:       newBlock.name,
        start_time: newBlock.start_time,
        end_time:   newBlock.end_time,
      })
      toast.success(`Time block "${newBlock.name}" created`)
      setIsDialogOpen(false)
      setNewBlock({ name: '', start_time: '', end_time: '' })
      await fetchBlocks()
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to create time block')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDeleteBlock(blockId) {
    setDeletingBlockId(blockId)
    try {
      await api.delete(`/blocks/${blockId}`)
      toast.success('Time block deleted')
      setConfirmDeleteBlockId(null)
      await fetchBlocks()
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to delete block')
    } finally {
      setDeletingBlockId(null)
    }
  }

  async function handleAutoFill(blockId) {
    setLoadingBlockId(blockId)
    try {
      const res   = await api.post('/assign-tasks', { block_id: blockId })
      const count = res.data?.assigned_task_ids?.length ?? 0
      toast.success(count > 0
        ? `Auto-assigned ${count} task${count !== 1 ? 's' : ''} to block`
        : 'No tasks could be assigned to this block')
      await fetchBlocks()
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Auto-fill failed')
    } finally {
      setLoadingBlockId(null)
    }
  }

  async function handleCreateEvent(e) {
    e.preventDefault()
    if (eventForm.is_recurring && eventForm.day_of_week.length === 0) {
      toast.error('Select at least one day')
      return
    }
    setEventFormLoading(true)
    try {
      if (eventForm.is_recurring) {
        await Promise.all(eventForm.day_of_week.map(day => {
          const body = {
            title:        eventForm.title,
            color:        eventForm.color,
            is_recurring: true,
            day_of_week:  day,
            start_time:   eventForm.start_time,
            end_time:     eventForm.end_time,
          }
          if (eventForm.recurrence_start) body.recurrence_start = eventForm.recurrence_start
          if (eventForm.recurrence_end)   body.recurrence_end   = eventForm.recurrence_end
          return api.post('/events', body)
        }))
      } else {
        await api.post('/events', {
          title:         eventForm.title,
          color:         eventForm.color,
          is_recurring:  false,
          specific_date: eventForm.specific_date,
          start_time:    eventForm.start_time,
          end_time:      eventForm.end_time,
        })
      }
      toast.success(`Event "${eventForm.title}" created`)
      setIsEventDialogOpen(false)
      setEventForm({ title: '', color: '#3b82f6', is_recurring: true, day_of_week: [], specific_date: '', start_time: '', end_time: '', recurrence_start: '', recurrence_end: '' })
      await fetchEvents()
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to create event')
    } finally {
      setEventFormLoading(false)
    }
  }

  function handleStartEditEvent(ev) {
    setEditingEvent(ev)
    setEditEventForm({
      title:            ev.title ?? '',
      color:            ev.color ?? '#3b82f6',
      is_recurring:     ev.is_recurring ?? false,
      day_of_week:      Array.isArray(ev.day_of_week) ? ev.day_of_week : (ev.day_of_week != null ? [ev.day_of_week] : []),
      specific_date:    ev.specific_date ?? '',
      start_time:       ev.start_time?.substring(0, 5) ?? '',
      end_time:         ev.end_time?.substring(0, 5) ?? '',
      recurrence_start: ev.recurrence_start ?? '',
      recurrence_end:   ev.recurrence_end   ?? '',
    })
    setIsEditEventDialogOpen(true)
  }

  async function handleUpdateEvent(e) {
    e.preventDefault()
    if (editEventForm.is_recurring && editEventForm.day_of_week.length === 0) {
      toast.error('Select at least one day')
      return
    }
    setEditEventFormLoading(true)
    try {
      const body = {
        title:        editEventForm.title,
        color:        editEventForm.color,
        is_recurring: editEventForm.is_recurring,
        start_time:   editEventForm.start_time,
        end_time:     editEventForm.end_time,
      }
      if (editEventForm.is_recurring) {
        body.day_of_week = editEventForm.day_of_week[0] ?? null
        body.recurrence_start = editEventForm.recurrence_start || null
        body.recurrence_end   = editEventForm.recurrence_end   || null
      } else {
        body.specific_date    = editEventForm.specific_date
        body.day_of_week      = null
        body.recurrence_start = null
        body.recurrence_end   = null
      }
      await api.patch(`/events/${editingEvent.event_id}`, body)
      toast.success('Event updated')
      setIsEditEventDialogOpen(false)
      setEditingEvent(null)
      await fetchEvents()
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to update event')
    } finally {
      setEditEventFormLoading(false)
    }
  }

  async function handleDeleteEvent(eventId) {
    setDeletingEventId(eventId)
    try {
      await api.delete(`/events/${eventId}`)
      toast.success('Event deleted')
      await fetchEvents()
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to delete event')
    } finally {
      setDeletingEventId(null)
    }
  }

  async function handleCheckAvailability() {
    setAvailLoading(true)
    setAvailSlots(null)
    try {
      const res = await api.get(`/availability?date=${availDate}`)
      setAvailSlots(res.data)
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to check availability')
    } finally {
      setAvailLoading(false)
    }
  }

  async function handleTaskClick(task) {
    if (!task.project_id) return
    setDetailLoading(true)
    setDetailProject(null)
    try {
      const res = await api.get('/directory')
      const found = res.data.find(p => p.project_id === task.project_id)
      if (found) setDetailProject(found)
    } catch {
      toast.error('Failed to load project details')
    } finally {
      setDetailLoading(false)
    }
  }

  function navigate(dir) {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'month')      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
      else if (view === 'week')  d.setDate(d.getDate()   + (dir === 'next' ? 7 : -7))
      else                       d.setDate(d.getDate()   + (dir === 'next' ? 1 : -1))
      return d
    })
  }

  function calendarLabel() {
    if (view === 'month')
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (view === 'week') {
      const start = new Date(currentDate)
      start.setDate(currentDate.getDate() - currentDate.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  function recurrenceLabel(ev) {
    if (ev.is_recurring && ev.day_of_week != null) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const arr  = Array.isArray(ev.day_of_week) ? ev.day_of_week : [ev.day_of_week]
      return `Every ${arr.map(d => days[d]).join(', ')}`
    }
    if (!ev.is_recurring && ev.specific_date) return ev.specific_date
    return ''
  }

  const sortedBlocks = [...blocks].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

  return (
    <div className="flex flex-col gap-4">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <p className="text-gray-500 text-sm">Manage time blocks · let the Knapsack algorithm fill them</p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ── LEFT: Calendar ── */}
        <div className="flex-1 min-w-0">
          <Card className="p-4 bg-gray-950/70 border-gray-800/50 backdrop-blur-md">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigate('prev')} neon={false}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} neon={false}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate('next')} neon={false}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-white ml-1">{calendarLabel()}</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-gray-800/50 bg-black/40 p-1">
                {[
                  { key: 'month', icon: Calendar, label: 'Month' },
                  { key: 'week',  icon: Grid3x3,  label: 'Week'  },
                  { key: 'day',   icon: Clock,    label: 'Day'   },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                      view === key ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-white hover:bg-white/5',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar body */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : (
              <>
                {view === 'month' && <MonthView currentDate={currentDate} events={calendarEvents} />}
                {view === 'week'  && <WeekView  currentDate={currentDate} events={calendarEvents} />}
                {view === 'day'   && <DayView   currentDate={currentDate} events={calendarEvents} />}
              </>
            )}
          </Card>
        </div>

        {/* ── RIGHT: Blocks + Events ── */}
        <div className="w-80 shrink-0 flex flex-col gap-3">

          {/* Blocks header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Time Blocks</h2>
              <p className="text-xs text-gray-500">Knapsack auto-fill</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" neon={false} onClick={() => setIsAvailabilityOpen(true)}>
                Availability
              </Button>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New Block
              </Button>
            </div>
          </div>

          {/* Blocks list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : sortedBlocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800/50 py-8 text-center text-gray-600 text-sm">
              No time blocks yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[280px] pr-1">
              {sortedBlocks.map(block => (
                <div
                  key={block.block_id}
                  className="rounded-xl border border-gray-800/50 bg-gray-950/60 backdrop-blur-sm p-3.5 space-y-2.5 hover:border-gray-700/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">{block.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatBlockTime(block.start_time)} → {formatBlockTime(block.end_time)}
                        <span className="ml-1 text-gray-600">· {blockDuration(block)} min</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm" variant="ghost" neon={false}
                        onClick={() => handleAutoFill(block.block_id)}
                        disabled={loadingBlockId === block.block_id}
                        className="text-xs"
                      >
                        {loadingBlockId === block.block_id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : 'Auto-Fill'}
                      </Button>
                      <button
                        onClick={() => setConfirmDeleteBlockId(block.block_id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1"
                        title="Delete block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {confirmDeleteBlockId === block.block_id && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-red-950/30 border border-red-900/30 px-3 py-2">
                      <span className="text-xs text-red-400">Delete this block?</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setConfirmDeleteBlockId(null)}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteBlock(block.block_id)}
                          disabled={deletingBlockId === block.block_id}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                        >
                          {deletingBlockId === block.block_id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}

                  {block.task && block.task.length > 0 ? (
                    <div className="space-y-1">
                      {block.task.map(task => (
                        <div
                          key={task.task_id}
                          onClick={() => handleTaskClick(task)}
                          className={cn(
                            'flex items-center gap-2 rounded-lg bg-white/3 border border-gray-800/30 px-2.5 py-1.5 text-xs text-gray-300 hover:border-gray-700/40 transition-colors',
                            task.project_id ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'
                          )}
                        >
                          {task.completed
                            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                            : <Circle       className="h-3.5 w-3.5 shrink-0 text-gray-600" />}
                          <span className={cn('truncate flex-1', task.completed && 'line-through text-gray-600')}>
                            {task.title}
                          </span>
                          {task.priority_level && (
                            <span className={cn('text-[10px] font-bold shrink-0', PRIORITY_STYLES[task.priority_level]?.class)}>
                              {PRIORITY_STYLES[task.priority_level]?.label}
                            </span>
                          )}
                          {task.est_duration && (
                            <span className="ml-auto text-gray-600 shrink-0">{task.est_duration}m</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-gray-600">
                      No tasks assigned — click Auto-Fill to run the algorithm.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Events section ── */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-800/30">
            <h2 className="text-sm font-semibold text-white">Events</h2>
            <Button size="sm" variant="ghost" neon={false} onClick={() => setIsEventDialogOpen(true)}>
              Add Event
            </Button>
          </div>

          {dbEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800/50 py-6 text-center text-gray-600 text-sm">
              No events yet.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[250px] pr-1">
              {dbEvents.map(ev => (
                <div
                  key={ev.event_id}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-800/50 bg-gray-950/60 px-3 py-2.5 hover:border-gray-700/50 transition-colors"
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ev.color ?? '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{ev.title}</div>
                    <div className="text-xs text-gray-500">{recurrenceLabel(ev)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEditEvent(ev)}
                      className="text-gray-600 hover:text-white transition-colors"
                      title="Edit event"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(ev.event_id)}
                      disabled={deletingEventId === ev.event_id}
                      className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete event"
                    >
                      {deletingEventId === ev.event_id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2  className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── New Time Block Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-gray-950/95 border-gray-800/50 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">New Time Block</DialogTitle>
            <DialogDescription className="text-gray-500">
              Define a block of time. The Knapsack algorithm will fill it with your tasks.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="block-name" className="text-gray-400 text-xs">Block Name</Label>
              <Input
                id="block-name"
                placeholder="e.g. Morning Focus, Study Session…"
                value={newBlock.name}
                onChange={e => setNewBlock(p => ({ ...p, name: e.target.value }))}
                required
                className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-start" className="text-gray-400 text-xs">Start Time</Label>
                <Input
                  id="block-start"
                  type="datetime-local"
                  value={newBlock.start_time}
                  onChange={e => setNewBlock(p => ({ ...p, start_time: e.target.value }))}
                  required
                  className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-end" className="text-gray-400 text-xs">End Time</Label>
                <Input
                  id="block-end"
                  type="datetime-local"
                  value={newBlock.end_time}
                  onChange={e => setNewBlock(p => ({ ...p, end_time: e.target.value }))}
                  required
                  className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" neon={false} onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="solid" disabled={formLoading}>
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Block
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Event Dialog ── */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-md bg-gray-950/95 border-gray-800/50 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Title</Label>
              <Input
                placeholder="e.g. CS 4710 Lecture"
                value={eventForm.title}
                onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                required
                className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Color</Label>
              <div className="flex gap-2">
                {EVENT_COLORS.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setEventForm(p => ({ ...p, color: hex }))}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all shrink-0',
                      eventForm.color === hex && 'ring-2 ring-white ring-offset-2 ring-offset-black',
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Type</Label>
              <div className="inline-flex rounded-lg border border-gray-800/50 bg-black/40 p-1 gap-1">
                {[{ label: 'Recurring', value: true }, { label: 'One-time', value: false }].map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setEventForm(p => ({ ...p, is_recurring: value, day_of_week: [], specific_date: '' }))}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
                      eventForm.is_recurring === value
                        ? 'bg-white/10 text-white'
                        : 'text-gray-500 hover:text-white hover:bg-white/5',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {eventForm.is_recurring ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Days of Week</Label>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEventForm(p => ({
                          ...p,
                          day_of_week: p.day_of_week.includes(idx)
                            ? p.day_of_week.filter(d => d !== idx)
                            : [...p.day_of_week, idx],
                        }))}
                        className={cn(
                          'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                          eventForm.day_of_week.includes(idx)
                            ? 'bg-white/10 text-white ring-1 ring-white/20'
                            : 'text-gray-500 border border-gray-800/50 hover:text-white hover:bg-white/5',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-400 text-xs">Starts on</Label>
                    <Input
                      type="date"
                      value={eventForm.recurrence_start}
                      onChange={e => setEventForm(p => ({ ...p, recurrence_start: e.target.value }))}
                      className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-400 text-xs">Ends on</Label>
                    <Input
                      type="date"
                      value={eventForm.recurrence_end}
                      onChange={e => setEventForm(p => ({ ...p, recurrence_end: e.target.value }))}
                      className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">Date</Label>
                <Input
                  type="date"
                  value={eventForm.specific_date}
                  onChange={e => setEventForm(p => ({ ...p, specific_date: e.target.value }))}
                  required
                  className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={eventForm.start_time}
                  onChange={e => setEventForm(p => ({ ...p, start_time: e.target.value }))}
                  required
                  className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">End Time</Label>
                <Input
                  type="time"
                  value={eventForm.end_time}
                  onChange={e => setEventForm(p => ({ ...p, end_time: e.target.value }))}
                  required
                  className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" neon={false} onClick={() => setIsEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="solid" disabled={eventFormLoading}>
                {eventFormLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Event Dialog ── */}
      <Dialog open={isEditEventDialogOpen} onOpenChange={setIsEditEventDialogOpen}>
        <DialogContent className="max-w-md bg-gray-950/95 border-gray-800/50 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateEvent} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Title</Label>
              <Input
                value={editEventForm.title}
                onChange={e => setEditEventForm(p => ({ ...p, title: e.target.value }))}
                required
                className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Color</Label>
              <div className="flex gap-2">
                {EVENT_COLORS.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setEditEventForm(p => ({ ...p, color: hex }))}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all shrink-0',
                      editEventForm.color === hex && 'ring-2 ring-white ring-offset-2 ring-offset-black',
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Type</Label>
              <div className="inline-flex rounded-lg border border-gray-800/50 bg-black/40 p-1 gap-1">
                {[{ label: 'Recurring', value: true }, { label: 'One-time', value: false }].map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setEditEventForm(p => ({ ...p, is_recurring: value, day_of_week: [], specific_date: '' }))}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
                      editEventForm.is_recurring === value
                        ? 'bg-white/10 text-white'
                        : 'text-gray-500 hover:text-white hover:bg-white/5',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {editEventForm.is_recurring ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Days of Week</Label>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditEventForm(p => ({
                          ...p,
                          day_of_week: p.day_of_week.includes(idx)
                            ? p.day_of_week.filter(d => d !== idx)
                            : [...p.day_of_week, idx],
                        }))}
                        className={cn(
                          'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                          editEventForm.day_of_week.includes(idx)
                            ? 'bg-white/10 text-white ring-1 ring-white/20'
                            : 'text-gray-500 border border-gray-800/50 hover:text-white hover:bg-white/5',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-400 text-xs">Starts on</Label>
                    <Input
                      type="date"
                      value={editEventForm.recurrence_start}
                      onChange={e => setEditEventForm(p => ({ ...p, recurrence_start: e.target.value }))}
                      className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-400 text-xs">Ends on</Label>
                    <Input
                      type="date"
                      value={editEventForm.recurrence_end}
                      onChange={e => setEditEventForm(p => ({ ...p, recurrence_end: e.target.value }))}
                      className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">Date</Label>
                <Input
                  type="date"
                  value={editEventForm.specific_date}
                  onChange={e => setEditEventForm(p => ({ ...p, specific_date: e.target.value }))}
                  required
                  className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={editEventForm.start_time}
                  onChange={e => setEditEventForm(p => ({ ...p, start_time: e.target.value }))}
                  required
                  className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">End Time</Label>
                <Input
                  type="time"
                  value={editEventForm.end_time}
                  onChange={e => setEditEventForm(p => ({ ...p, end_time: e.target.value }))}
                  required
                  className="bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" neon={false} onClick={() => setIsEditEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="solid" disabled={editEventFormLoading}>
                {editEventFormLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Project Detail Modal (Change 5) ── */}
      {detailProject && (
        <ScheduleProjectModal
          project={detailProject}
          onClose={() => setDetailProject(null)}
        />
      )}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* ── Availability Dialog ── */}
      <Dialog open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
        <DialogContent className="max-w-sm bg-gray-950/95 border-gray-800/50 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Check Availability</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Date</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={availDate}
                  onChange={e => setAvailDate(e.target.value)}
                  className="flex-1 bg-black border-gray-800 text-white focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
                />
                <Button
                  variant="solid"
                  size="sm"
                  onClick={handleCheckAvailability}
                  disabled={availLoading || !availDate}
                >
                  {availLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                </Button>
              </div>
            </div>

            {availLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            )}

            {!availLoading && availSlots !== null && (
              availSlots.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No availability found for this day.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {availSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-gray-900/60 border border-gray-800/40 rounded-xl px-4 py-3"
                    >
                      <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      <div>
                        <div className="text-sm text-white">{to12h(slot.start)} – {to12h(slot.end)}</div>
                        <div className="text-xs text-gray-500">{formatDuration(slot.duration_minutes)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
