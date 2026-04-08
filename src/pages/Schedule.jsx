import { useState, useEffect, useCallback } from 'react'
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
  ChevronLeft, ChevronRight, Plus, Calendar, Clock, Grid3x3,
  Loader2, Sparkles, CheckCircle2, Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Color map ────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  blue:   'bg-blue-600',
  green:  'bg-green-600',
  purple: 'bg-[#F23B3B]',
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

function toLocalDatetimeValue(date) {
  if (!date) return ''
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
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
    <div className="overflow-hidden rounded-lg border border-gray-800">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-gray-800">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-800 last:border-r-0">
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
                'min-h-24 border-b border-r border-gray-800 last:border-r-0 p-1.5',
                !isCurrentMonth && 'opacity-30',
                isCurrentMonth && 'hover:bg-gray-900/40 transition-colors',
              )}
            >
              <div className={cn(
                'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                isToday
                  ? 'bg-[#F23B3B] text-white font-bold'
                  : 'text-gray-400',
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className={cn(
                      'truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white',
                      COLOR_MAP[ev.color] ?? 'bg-[#F23B3B]',
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
    <div className="overflow-auto rounded-lg border border-gray-800 max-h-[600px]">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
        <div className="border-r border-gray-800 py-2 px-2 text-xs text-gray-600">Time</div>
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              'border-r border-gray-800 last:border-r-0 py-2 text-center text-xs',
              isSameDay(day, today) ? 'text-[#F23B3B] font-semibold' : 'text-gray-400',
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
              className="border-b border-r border-gray-800 px-2 py-1 text-[10px] text-gray-600"
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
                  className="min-h-12 border-b border-r border-gray-800 last:border-r-0 p-0.5 space-y-0.5"
                >
                  {slot.map(ev => (
                    <div
                      key={ev.id}
                      className={cn(
                        'truncate rounded px-1 py-0.5 text-[10px] font-medium text-white',
                        COLOR_MAP[ev.color] ?? 'bg-[#F23B3B]',
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
    <div className="overflow-auto rounded-lg border border-gray-800 max-h-[600px]">
      {hours.map(hour => {
        const slot = dayEvents.filter(e => e.startTime.getHours() === hour)
        return (
          <div key={hour} className="flex border-b border-gray-800 last:border-b-0">
            <div className="w-16 shrink-0 border-r border-gray-800 px-2 py-2 text-xs text-gray-600">
              {String(hour).padStart(2, '0')}:00
            </div>
            <div className="flex-1 min-h-14 p-1 space-y-1">
              {slot.map(ev => (
                <div
                  key={ev.id}
                  className={cn(
                    'rounded px-2 py-1 text-sm font-medium text-white',
                    COLOR_MAP[ev.color] ?? 'bg-[#F23B3B]',
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
  const [formLoading, setFormLoading]     = useState(false)

  // ── Fetch ──
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
      console.error('Failed to fetch blocks', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBlocks() }, [fetchBlocks])

  // ── Create block ──
  async function handleCreateBlock(e) {
    e.preventDefault()
    setFormLoading(true)
    try {
      await api.post('/blocks', {
        name:       newBlock.name,
        start_time: new Date(newBlock.start_time).toISOString(),
        end_time:   new Date(newBlock.end_time).toISOString(),
      })
      setIsDialogOpen(false)
      setNewBlock({ name: '', start_time: '', end_time: '' })
      await fetchBlocks()
    } catch (err) {
      console.error('Failed to create block', err)
    } finally {
      setFormLoading(false)
    }
  }

  // ── Auto-fill ──
  async function handleAutoFill(blockId) {
    setLoadingBlockId(blockId)
    try {
      await api.post('/assign-tasks', { block_id: blockId })
      await fetchBlocks()
    } catch (err) {
      console.error('Auto-fill failed', err)
    } finally {
      setLoadingBlockId(null)
    }
  }

  // ── Navigation ──
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
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-gray-400 text-sm">Manage time blocks · let the Knapsack algorithm fill them</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Time Block
        </Button>
      </div>

      {/* ── Calendar ── */}
      <Card className="p-4 bg-gray-950/50 border-gray-800">
        {/* Calendar toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')} className="h-8 w-8 border-gray-700 bg-transparent hover:bg-gray-800">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="border-gray-700 bg-transparent hover:bg-gray-800 text-gray-300">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')} className="h-8 w-8 border-gray-700 bg-transparent hover:bg-gray-800">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-white ml-1">{calendarLabel()}</span>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-900 p-1">
            {[
              { key: 'month', icon: Calendar,  label: 'Month' },
              { key: 'week',  icon: Grid3x3,   label: 'Week'  },
              { key: 'day',   icon: Clock,     label: 'Day'   },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  view === key
                    ? 'bg-[#F23B3B] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800',
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
            <Loader2 className="h-8 w-8 animate-spin text-[#F23B3B]" />
          </div>
        ) : (
          <>
            {view === 'month' && <MonthView currentDate={currentDate} events={events} />}
            {view === 'week'  && <WeekView  currentDate={currentDate} events={events} />}
            {view === 'day'   && <DayView   currentDate={currentDate} events={events} />}
          </>
        )}
      </Card>

      {/* ── Blocks Directory ── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Blocks Directory</h2>
          <p className="text-sm text-gray-500">Tasks auto-assigned by the Knapsack algorithm</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#F23B3B]" />
          </div>
        ) : sortedBlocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-800 py-16 text-center text-gray-500">
            No time blocks yet. Create one using the button above.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBlocks.map(block => (
              <div
                key={block.block_id}
                className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3"
              >
                {/* Block header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{block.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatBlockTime(block.start_time)} → {formatBlockTime(block.end_time)}
                      <span className="ml-1.5 text-gray-600">· {blockDuration(block)} min</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleAutoFill(block.block_id)}
                    disabled={loadingBlockId === block.block_id}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-[#F23B3B] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#c42e2e] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingBlockId === block.block_id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Sparkles className="h-4 w-4" />}
                    Auto-Fill Block
                  </button>
                </div>

                {/* Tasks */}
                {block.task && block.task.length > 0 ? (
                  <div className="space-y-1.5">
                    {block.task.map(task => (
                      <div
                        key={task.task_id}
                        className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm text-gray-300"
                      >
                        {task.completed
                          ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                          : <Circle className="h-4 w-4 shrink-0 text-gray-600" />}
                        <span className={task.completed ? 'line-through text-gray-500' : ''}>
                          {task.title}
                        </span>
                        {task.est_duration && (
                          <span className="ml-auto text-xs text-gray-500">{task.est_duration} min</span>
                        )}
                        {task.priority_level && (
                          <span className="text-xs font-bold text-[#F23B3B]">P{task.priority_level}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-gray-600">
                    No tasks assigned yet — click <span className="text-[#F23B3B] not-italic font-medium">Auto-Fill Block</span> to run the algorithm.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── New Time Block Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Time Block</DialogTitle>
            <DialogDescription>
              Define a block of time. The Knapsack algorithm will fill it with your tasks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="block-name">Block Name</Label>
              <Input
                id="block-name"
                placeholder="e.g. Morning Focus, Study Session…"
                value={newBlock.name}
                onChange={e => setNewBlock(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-start">Start Time</Label>
                <Input
                  id="block-start"
                  type="datetime-local"
                  value={newBlock.start_time}
                  onChange={e => setNewBlock(p => ({ ...p, start_time: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-end">End Time</Label>
                <Input
                  id="block-end"
                  type="datetime-local"
                  value={newBlock.end_time}
                  onChange={e => setNewBlock(p => ({ ...p, end_time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-gray-700 bg-transparent hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="gap-2">
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
