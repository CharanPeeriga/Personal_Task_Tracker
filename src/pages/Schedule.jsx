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
  Loader2, CheckCircle2, Circle, Plus, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Color map ────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  blue:   'bg-blue-600',
  green:  'bg-green-600',
  purple: 'bg-indigo-600',
  orange: 'bg-orange-600',
  pink:   'bg-pink-600',
  red:    'bg-red-600',
}

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
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ currentDate, events }) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days = []
  const cur = new Date(startDate)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  const today = new Date()

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800/50">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-gray-800/50 bg-gray-900/40">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-800/50 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)
          const dayEvents = events.filter(e => isSameDay(e.startTime, day))

          return (
            <div
              key={idx}
              className={cn(
                'min-h-20 border-b border-r border-gray-800/40 last:border-r-0 p-1.5 transition-colors duration-200',
                !isCurrentMonth && 'opacity-25',
                isCurrentMonth && 'hover:bg-white/3',
              )}
            >
              <div className={cn(
                'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                isToday
                  ? 'bg-white text-black font-bold'
                  : 'text-gray-500',
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className={cn(
                      'truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white',
                      COLOR_MAP[ev.color] ?? 'bg-indigo-600',
                    )}
                  >
                    {ev.title}
                  </div>
                ))}
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
    <div className="overflow-auto rounded-xl border border-gray-800/50 max-h-[500px]">
      {/* Header */}
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

      {/* Rows */}
      <div className="grid grid-cols-8">
        {hours.map(hour => (
          <>
            <div
              key={`t-${hour}`}
              className="border-b border-r border-gray-800/40 px-2 py-1 text-[10px] text-gray-600"
            >
              {String(hour).padStart(2, '0')}:00
            </div>
            {weekDays.map(day => {
              const slot = events.filter(e =>
                isSameDay(e.startTime, day) && e.startTime.getHours() === hour
              )
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="min-h-10 border-b border-r border-gray-800/40 last:border-r-0 p-0.5 space-y-0.5 hover:bg-white/3 transition-colors"
                >
                  {slot.map(ev => (
                    <div
                      key={ev.id}
                      className={cn(
                        'truncate rounded px-1 py-0.5 text-[10px] font-medium text-white',
                        COLOR_MAP[ev.color] ?? 'bg-indigo-600',
                      )}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ currentDate, events }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const dayEvents = events.filter(e => isSameDay(e.startTime, currentDate))

  return (
    <div className="overflow-auto rounded-xl border border-gray-800/50 max-h-[500px]">
      {hours.map(hour => {
        const slot = dayEvents.filter(e => e.startTime.getHours() === hour)
        return (
          <div key={hour} className="flex border-b border-gray-800/40 last:border-b-0 hover:bg-white/3 transition-colors">
            <div className="w-16 shrink-0 border-r border-gray-800/40 px-2 py-2 text-xs text-gray-600">
              {String(hour).padStart(2, '0')}:00
            </div>
            <div className="flex-1 min-h-12 p-1 space-y-1">
              {slot.map(ev => (
                <div
                  key={ev.id}
                  className={cn(
                    'rounded px-2 py-1 text-sm font-medium text-white',
                    COLOR_MAP[ev.color] ?? 'bg-indigo-600',
                  )}
                >
                  {ev.title}
                  <span className="ml-2 text-xs opacity-80">
                    {ev.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {' – '}
                    {ev.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Schedule page ───────────────────────────────────────────────────────
export default function Schedule() {
  const [blocks, setBlocks]               = useState([])
  const [events, setEvents]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [loadingBlockId, setLoadingBlockId] = useState(null)
  const [currentDate, setCurrentDate]     = useState(new Date())
  const [view, setView]                   = useState('month')
  const [isDialogOpen, setIsDialogOpen]   = useState(false)
  const [newBlock, setNewBlock]           = useState({ name: '', start_time: '', end_time: '' })
  const [formLoading, setFormLoading]         = useState(false)
  const [confirmDeleteBlockId, setConfirmDeleteBlockId] = useState(null)
  const [deletingBlockId, setDeletingBlockId] = useState(null)

  const fetchBlocks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/blocks-directory')
      setBlocks(res.data)
      setEvents(
        res.data.map(b => ({
          id:        String(b.block_id),
          title:     b.name,
          startTime: new Date(b.start_time),
          endTime:   new Date(b.end_time),
          color:     'purple',
        }))
      )
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to load time blocks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBlocks() }, [fetchBlocks])

  async function handleCreateBlock(e) {
    e.preventDefault()
    setFormLoading(true)
    try {
      // Send datetime-local values directly (YYYY-MM-DDTHH:mm) without
      // converting to ISO — start_time/end_time are "timestamp without time
      // zone" in the DB, so a Z-suffixed UTC string would be wrong.
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
      const res = await api.post('/assign-tasks', { block_id: blockId })
      const count = res.data?.assigned_task_ids?.length ?? 0
      toast.success(count > 0 ? `Auto-assigned ${count} task${count !== 1 ? 's' : ''} to block` : 'No tasks could be assigned to this block')
      await fetchBlocks()
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Auto-fill failed')
    } finally {
      setLoadingBlockId(null)
    }
  }

  function navigate(dir) {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'month') d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
      else if (view === 'week') d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
      else d.setDate(d.getDate() + (dir === 'next' ? 1 : -1))
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

  const sortedBlocks = [...blocks].sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time)
  )

  return (
    <div className="flex flex-col gap-4">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-gray-500 text-sm">Manage time blocks · let the Knapsack algorithm fill them</p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ── LEFT: Calendar ── */}
        <div className="flex-1 min-w-0">
          <Card className="p-4 bg-gray-950/70 border-gray-800/50 backdrop-blur-md">
            {/* Calendar toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('prev')}
                  neon={false}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  neon={false}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('next')}
                  neon={false}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-white ml-1">{calendarLabel()}</span>
              </div>

              {/* View switcher */}
              <div className="flex items-center gap-1 rounded-lg border border-gray-800/50 bg-black/40 p-1">
                {[
                  { key: 'month', icon: Calendar,  label: 'Month' },
                  { key: 'week',  icon: Grid3x3,   label: 'Week'  },
                  { key: 'day',   icon: Clock,     label: 'Day'   },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                      view === key
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-gray-500 hover:text-white hover:bg-white/5',
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
                {view === 'month' && <MonthView currentDate={currentDate} events={events} />}
                {view === 'week'  && <WeekView  currentDate={currentDate} events={events} />}
                {view === 'day'   && <DayView   currentDate={currentDate} events={events} />}
              </>
            )}
          </Card>
        </div>

        {/* ── RIGHT: Blocks Directory ── */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {/* Blocks header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Time Blocks</h2>
              <p className="text-xs text-gray-500">Knapsack auto-fill</p>
            </div>
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New Block
            </Button>
          </div>

          {/* Blocks list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : sortedBlocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800/50 py-12 text-center text-gray-600 text-sm">
              No time blocks yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
              {sortedBlocks.map(block => (
                <div
                  key={block.block_id}
                  className="rounded-xl border border-gray-800/50 bg-gray-950/60 backdrop-blur-sm p-3.5 space-y-2.5 hover:border-gray-700/50 transition-all duration-200"
                >
                  {/* Block header */}
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
                        size="sm"
                        variant="ghost"
                        neon={false}
                        onClick={() => handleAutoFill(block.block_id)}
                        disabled={loadingBlockId === block.block_id}
                        className="text-xs"
                      >
                        {loadingBlockId === block.block_id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : 'Auto-Fill'
                        }
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

                  {/* Tasks */}
                  {block.task && block.task.length > 0 ? (
                    <div className="space-y-1">
                      {block.task.map(task => (
                        <div
                          key={task.task_id}
                          className="flex items-center gap-2 rounded-lg bg-white/3 border border-gray-800/30 px-2.5 py-1.5 text-xs text-gray-300 hover:border-gray-700/40 transition-colors"
                        >
                          {task.completed
                            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                            : <Circle className="h-3.5 w-3.5 shrink-0 text-gray-600" />}
                          <span className={cn('truncate flex-1', task.completed && 'line-through text-gray-600')}>
                            {task.title}
                          </span>
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
              <Button
                type="button"
                variant="ghost"
                neon={false}
                onClick={() => setIsDialogOpen(false)}
              >
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
    </div>
  )
}
