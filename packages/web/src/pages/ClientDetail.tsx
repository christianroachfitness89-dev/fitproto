import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, MessageSquare, Dumbbell,
  Calendar, Tag, MoreHorizontal, Plus, CheckCircle2,
  Clock, Loader2, X, ChevronDown, Trash2, Send,
  ClipboardList, ChevronLeft, ChevronRight, ClipboardCheck,
  SkipForward, ExternalLink, Copy, History, BarChart2, Utensils, Lock,
  ChevronUp, Scale, Zap, TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { useTasks, useCreateTask, useToggleTask } from '@/hooks/useTasks'
import {
  useClientWorkouts, useAssignWorkout, useUpdateClientWorkoutStatus,
  useRemoveClientWorkout, useLogWorkoutSession,
} from '@/hooks/useClientWorkouts'
import { useGetOrCreateConversation } from '@/hooks/useConversations'
import { useWorkouts, useWorkoutDetail } from '@/hooks/useWorkouts'
import { useUnitSystem, weightLabel } from '@/lib/units'
import { playRestEndChime } from '@/lib/sound'
import type { DbClient, DbTask, DbClientWorkoutWithWorkout, PortalSection } from '@/lib/database.types'

type Tab = 'overview' | 'workouts' | 'history' | 'nutrition' | 'metrics' | 'notes'

// ─── Types for session history ─────────────────────────────────
interface CoachHistoryEntry {
  id: string
  completed_at: string
  workout_name: string
  set_count: number
  exercises: string[]
  notes: string | null
}

interface CoachSessionSet {
  set_number: number
  reps_achieved: number | null
  weight_used: number | null
  duration_seconds: number | null
  distance_meters: number | null
  rpe: number | null
}

interface CoachSessionExercise {
  exercise_id: string
  name: string
  muscle_group: string | null
  metric_type: string
  order_index: number
  sets: CoachSessionSet[]
}

interface CoachSessionDetail {
  workout_name: string
  completed_at: string
  notes: string | null
  exercises: CoachSessionExercise[]
}

// ─── Portal section definitions ───────────────────────────────
const PORTAL_SECTIONS: {
  id: PortalSection
  label: string
  desc: string
  icon: React.ElementType
  gradient: string
  activeRing: string
}[] = [
  {
    id:          'workouts',
    label:       'Workouts',
    desc:        'Assigned sessions & logging',
    icon:        Dumbbell,
    gradient:    'from-violet-500 to-brand-500',
    activeRing:  'ring-violet-400/40',
  },
  {
    id:          'history',
    label:       'History',
    desc:        'Past session logs',
    icon:        History,
    gradient:    'from-amber-500 to-orange-500',
    activeRing:  'ring-amber-400/40',
  },
  {
    id:          'metrics',
    label:       'Metrics',
    desc:        'Progress & measurements',
    icon:        BarChart2,
    gradient:    'from-emerald-500 to-teal-500',
    activeRing:  'ring-emerald-400/40',
  },
  {
    id:          'nutrition',
    label:       'Nutrition',
    desc:        'Meal plans & guidance',
    icon:        Utensils,
    gradient:    'from-rose-500 to-pink-500',
    activeRing:  'ring-rose-400/40',
  },
]

// ─── Portal access card ────────────────────────────────────────
function PortalAccessCard({ client }: { client: DbClient }) {
  const update   = useUpdateClient()
  const sections = client.portal_sections ?? []

  async function toggle(id: PortalSection) {
    const next = sections.includes(id)
      ? sections.filter(s => s !== id)
      : [...sections, id]
    await update.mutateAsync({ id: client.id, portal_sections: next })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Client Portal Access</h3>
        <span className="text-xs text-gray-400">
          {sections.length} / {PORTAL_SECTIONS.length} sections on
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PORTAL_SECTIONS.map(({ id, label, desc, icon: Icon, gradient, activeRing }) => {
          const on = sections.includes(id)
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              disabled={update.isPending}
              className={clsx(
                'relative rounded-2xl border p-4 text-left transition-all group',
                on
                  ? `bg-gradient-to-br ${gradient} bg-opacity-10 border-transparent ring-2 ${activeRing} shadow-md`
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100',
              )}
            >
              {/* Toggle pill */}
              <div className={clsx(
                'absolute top-3 right-3 w-8 h-4 rounded-full transition-colors flex items-center px-0.5',
                on ? 'bg-white/30' : 'bg-gray-200',
              )}>
                <div className={clsx(
                  'w-3 h-3 rounded-full transition-all',
                  on ? 'translate-x-4 bg-white shadow' : 'translate-x-0 bg-white shadow',
                )} />
              </div>

              {/* Icon */}
              <div className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center mb-2.5',
                on
                  ? 'bg-white/25'
                  : 'bg-gray-200',
              )}>
                {on
                  ? <Icon size={18} className="text-white" />
                  : <Icon size={18} className="text-gray-400" />}
              </div>

              <p className={clsx('text-sm font-semibold leading-tight', on ? 'text-white' : 'text-gray-700')}>
                {label}
              </p>
              <p className={clsx('text-[11px] mt-0.5 leading-snug', on ? 'text-white/70' : 'text-gray-400')}>
                {desc}
              </p>

              {!on && (
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Lock size={10} className="text-gray-300" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Add task inline form ─────────────────────────────────────
function AddTaskRow({ clientId }: { clientId: string }) {
  const [open, setOpen]   = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const create = useCreateTask()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await create.mutateAsync({ title, client_id: clientId, due_date: dueDate || undefined })
    setTitle('')
    setDueDate('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-sm text-brand-600 font-semibold hover:text-brand-700 transition-colors py-3 flex items-center gap-1.5"
      >
        <Plus size={14} /> Add task
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title..."
        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    </form>
  )
}

// ─── Edit client modal ────────────────────────────────────────
function EditClientModal({ client, onClose }: { client: DbClient; onClose: () => void }) {
  const update = useUpdateClient()
  const [form, setForm] = useState({
    name:       client.name,
    email:      client.email ?? '',
    phone:      client.phone ?? '',
    goal:       client.goal ?? '',
    category:   client.category ?? '',
    group_name: client.group_name ?? '',
    status:     client.status,
  })
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setError(null)
    try {
      await update.mutateAsync({
        id:         client.id,
        name:       form.name,
        email:      form.email || null,
        phone:      form.phone || null,
        goal:       form.goal || null,
        category:   form.category || null,
        group_name: form.group_name || null,
        status:     form.status,
      })
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit Client</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Primary Goal</label>
            <input type="text" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              placeholder="Weight Loss, Muscle Gain..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
              <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Premium..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Group</label>
              <input type="text" value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}
                placeholder="Morning..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DbClient['status'] }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={update.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-60 transition-all">
              {update.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Date helpers ─────────────────────────────────────────────
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function weekMonday(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Assign workout modal ─────────────────────────────────────
function AssignWorkoutModal({ clientId, defaultDate, onClose }: { clientId: string; defaultDate?: string; onClose: () => void }) {
  const { data: workouts = [], isLoading } = useWorkouts()
  const assign = useAssignWorkout()
  const [search, setSearch]   = useState('')
  const [dueDate, setDueDate] = useState(defaultDate ?? '')
  const [notes, setNotes]     = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const filtered = workouts.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setError('Please select a workout'); return }
    setError(null)
    try {
      await assign.mutateAsync({
        client_id:  clientId,
        workout_id: selected,
        due_date:   dueDate || undefined,
        notes:      notes   || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Assign Workout</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

        {/* Workout search */}
        <div className="relative mb-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search workouts..."
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>

        {/* Workout list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 min-h-0" style={{ maxHeight: 260 }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No workouts found</p>
          ) : filtered.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelected(w.id)}
              className={clsx(
                'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                selected === w.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-transparent bg-gray-50 hover:bg-gray-100',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  selected === w.id ? 'bg-brand-600' : 'bg-gray-200')}>
                  <Dumbbell size={15} className={selected === w.id ? 'text-white' : 'text-gray-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{w.name}</p>
                  <p className="text-xs text-gray-500">
                    {(w as any).workout_exercises?.length ?? 0} exercises
                    {w.duration_minutes ? ` · ${w.duration_minutes} min` : ''}
                    {w.difficulty ? ` · ${w.difficulty}` : ''}
                  </p>
                </div>
                {selected === w.id && <CheckCircle2 size={16} className="text-brand-600 flex-shrink-0" />}
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!selected || assign.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-50 transition-all">
              {assign.isPending ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> Assign</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Status helpers ───────────────────────────────────────────
const STATUS_STYLES: Record<DbClientWorkoutWithWorkout['status'], string> = {
  assigned:  'bg-brand-50 text-brand-700',
  completed: 'bg-emerald-50 text-emerald-700',
  skipped:   'bg-gray-100 text-gray-500',
}

// ─── Rest timer (coach modal) ─────────────────────────────────
function CoachRestTimer({ restSeconds, label, onDone }: { restSeconds: number; label: string; onDone: () => void }) {
  const [remaining, setRemaining] = useState(restSeconds)

  useEffect(() => {
    if (remaining <= 0) { playRestEndChime(); onDone(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const radius       = 52
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference * (1 - (restSeconds > 0 ? remaining / restSeconds : 0))
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}`

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-2xl">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Rest Period</p>
      <p className="text-sm text-gray-600 font-medium mb-6 text-center max-w-[200px]">{label}</p>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={radius} stroke="#f3f4f6" strokeWidth="8" fill="none" />
          <circle cx="60" cy="60" r={radius}
            stroke="url(#coachTimerGrad)" strokeWidth="8" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 0.85s linear' }} />
          <defs>
            <linearGradient id="coachTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">{display}</span>
          <span className="text-gray-400 text-xs mt-0.5">seconds</span>
        </div>
      </div>
      {/* ±15 s controls */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => setRemaining(r => Math.max(0, r - 15))}
          className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold transition-colors flex items-center justify-center"
        >
          −15
        </button>
        <button
          onClick={onDone}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => setRemaining(r => r + 15)}
          className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold transition-colors flex items-center justify-center"
        >
          +15
        </button>
      </div>
    </div>
  )
}

// ─── Log session modal ────────────────────────────────────────
type SetEntry = { reps: string; weight: string; duration: string; distance: string; rpe: string }

function LogSessionModal({
  assignment, clientId, onClose,
}: {
  assignment: DbClientWorkoutWithWorkout
  clientId: string
  onClose: () => void
}) {
  const { data: workout, isLoading } = useWorkoutDetail(assignment.workout_id)
  const logSession = useLogWorkoutSession()
  const unit  = useUnitSystem()
  const wLabel = weightLabel(unit)
  const [completedAt, setCompletedAt] = useState(todayStr)
  const [notes, setNotes]     = useState('')
  const [entries, setEntries] = useState<Record<string, SetEntry>>({})
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [doneSets, setDoneSets] = useState<Set<string>>(new Set())
  const [restTimer, setRestTimer] = useState<{ restSeconds: number; label: string } | null>(null)

  useEffect(() => {
    if (!workout) return
    const init: Record<string, SetEntry> = {}
    for (const ex of workout.workout_exercises) {
      for (const s of ex.workout_sets) {
        init[`${ex.id}-${s.set_number}`] = {
          reps: s.reps?.toString() ?? '',
          weight: s.weight?.toString() ?? '',
          duration: s.duration_seconds?.toString() ?? '',
          distance: s.distance_meters?.toString() ?? '',
          rpe: '',
        }
      }
    }
    setEntries(init)
  }, [workout?.id])

  function setField(key: string, field: keyof SetEntry, value: string) {
    setEntries(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function handleSetDone(key: string, exerciseName: string, setNumber: number, restSeconds: number) {
    setDoneSets(prev => new Set([...prev, key]))
    if (restSeconds > 0) {
      setRestTimer({ restSeconds, label: `${exerciseName} — Set ${setNumber} complete` })
    }
  }

  async function submit() {
    if (!workout) return
    setError(null)
    try {
      const setLogs = workout.workout_exercises.flatMap(ex =>
        ex.workout_sets.map(s => {
          const e = entries[`${ex.id}-${s.set_number}`] ?? {} as SetEntry
          return {
            workout_exercise_id: ex.id,
            set_number:          s.set_number,
            reps_achieved:       e.reps     ? parseInt(e.reps)      : null,
            weight_used:         e.weight   ? parseFloat(e.weight)  : null,
            duration_seconds:    e.duration ? parseInt(e.duration)  : null,
            distance_meters:     e.distance ? parseFloat(e.distance): null,
            rpe:                 e.rpe      ? parseInt(e.rpe)       : null,
          }
        })
      )
      await logSession.mutateAsync({ clientId, clientWorkoutId: assignment.id, workoutId: assignment.workout_id, completedAt, notes, setLogs })
      setSaved(true)
      setTimeout(onClose, 1200)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] z-10">
        {/* Rest timer overlay */}
        {restTimer && (
          <CoachRestTimer
            restSeconds={restTimer.restSeconds}
            label={restTimer.label}
            onDone={() => setRestTimer(null)}
          />
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Log Session</h2>
            <p className="text-sm text-gray-500 mt-0.5">{assignment.workout.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        {/* Date picker */}
        <div className="px-6 py-3 border-b border-gray-50 flex items-center gap-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</label>
          <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>

        {/* Exercises */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : (workout?.workout_exercises ?? []).map(ex => {
            const metric = ex.exercise?.metric_type ?? 'reps_weight'
            const isWeighted  = metric === 'reps_weight'
            const isTimed     = metric === 'time'
            const isDistance  = metric === 'distance'
            const colClass = isWeighted
              ? 'grid-cols-[28px_1fr_1fr_64px_40px]'
              : 'grid-cols-[28px_1fr_64px_40px]'
            return (
              <div key={ex.id}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-800">{ex.exercise_name}</p>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {ex.workout_sets.length} sets
                    {ex.exercise?.muscle_group ? ` · ${ex.exercise.muscle_group}` : ''}
                  </span>
                </div>
                {/* Column headers */}
                <div className={clsx('grid gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-1.5', colClass)}>
                  <span>#</span>
                  {isWeighted && <><span>Reps</span><span>Weight ({wLabel})</span></>}
                  {isTimed    && <span>Duration (s)</span>}
                  {isDistance && <span>Distance (m)</span>}
                  {metric === 'reps' && <span>Reps</span>}
                  <span>RPE</span>
                  <span />
                </div>
                <div className="space-y-1.5">
                  {ex.workout_sets.map(s => {
                    const key  = `${ex.id}-${s.set_number}`
                    const e    = entries[key] ?? { reps: '', weight: '', duration: '', distance: '', rpe: '' }
                    const done = doneSets.has(key)
                    const inp  = clsx(
                      'px-2 py-1.5 text-sm text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full',
                      done ? 'border-emerald-200 bg-emerald-50 opacity-70' : 'border-gray-200 bg-white',
                    )
                    return (
                      <div key={s.set_number}
                        className={clsx('grid gap-2 items-center rounded-xl px-2 py-2 transition-colors',
                          done ? 'bg-emerald-50' : 'bg-gray-50',
                          colClass)}>
                        <span className={clsx('text-xs font-bold text-center',
                          done ? 'text-emerald-500' : 'text-gray-400')}>
                          {s.set_number}
                        </span>
                        {isWeighted && (
                          <>
                            <input type="number" min={0} value={e.reps}
                              onChange={ev => setField(key, 'reps', ev.target.value)}
                              placeholder={s.reps?.toString() ?? '—'} className={inp} />
                            <input type="number" min={0} step={0.5} value={e.weight}
                              onChange={ev => setField(key, 'weight', ev.target.value)}
                              placeholder={s.weight?.toString() ?? '—'} className={inp} />
                          </>
                        )}
                        {isTimed && (
                          <input type="number" min={0} value={e.duration}
                            onChange={ev => setField(key, 'duration', ev.target.value)}
                            placeholder={s.duration_seconds?.toString() ?? '—'} className={inp} />
                        )}
                        {isDistance && (
                          <input type="number" min={0} step={0.1} value={e.distance}
                            onChange={ev => setField(key, 'distance', ev.target.value)}
                            placeholder={s.distance_meters?.toString() ?? '—'} className={inp} />
                        )}
                        {metric === 'reps' && (
                          <input type="number" min={0} value={e.reps}
                            onChange={ev => setField(key, 'reps', ev.target.value)}
                            placeholder={s.reps?.toString() ?? '—'} className={inp} />
                        )}
                        <input type="number" min={1} max={10} value={e.rpe}
                          onChange={ev => setField(key, 'rpe', ev.target.value)}
                          placeholder="—" className={inp} />
                        {/* Done button */}
                        <button
                          type="button"
                          onClick={() => handleSetDone(key, ex.exercise_name, s.set_number, s.rest_seconds ?? 0)}
                          className={clsx(
                            'w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                            done
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-white border border-gray-200 text-gray-300 hover:border-emerald-300 hover:text-emerald-500',
                          )}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Notes + submit */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">{error}</p>}
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Session notes (optional)..."
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
            <button onClick={submit} disabled={logSession.isPending || saved || isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-50 transition-all">
              {logSession.isPending
                ? <><Loader2 size={15} className="animate-spin" />Saving…</>
                : saved
                  ? <><CheckCircle2 size={15} />Saved!</>
                  : <><ClipboardCheck size={15} />Save Session</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Assignment card (shared by list + calendar) ──────────────
function AssignmentCard({
  a, clientId, compact = false,
  onLog,
}: {
  a: DbClientWorkoutWithWorkout
  clientId: string
  compact?: boolean
  onLog: (a: DbClientWorkoutWithWorkout) => void
}) {
  const updateStatus = useUpdateClientWorkoutStatus()
  const remove = useRemoveClientWorkout()

  return (
    <div className={clsx(
      'group relative flex flex-col bg-white rounded-xl border transition-all hover:shadow-sm',
      a.status === 'completed' ? 'border-emerald-200' : a.status === 'skipped' ? 'border-gray-200 opacity-60' : 'border-gray-200',
      compact ? 'p-2' : 'p-3.5',
    )}>
      <div className="flex items-start gap-2">
        <div className={clsx('rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
          compact ? 'w-6 h-6' : 'w-8 h-8',
          a.status === 'completed' ? 'bg-emerald-100' : 'bg-brand-100')}>
          {a.status === 'completed'
            ? <CheckCircle2 size={compact ? 12 : 15} className="text-emerald-600" />
            : <Dumbbell size={compact ? 12 : 15} className="text-brand-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={clsx('font-semibold truncate', compact ? 'text-xs' : 'text-sm',
            a.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800')}>
            {a.workout.name}
          </p>
          {!compact && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_STYLES[a.status])}>
                {a.status}
              </span>
              {a.workout.difficulty && <span className="text-xs text-gray-400">{a.workout.difficulty}</span>}
              {a.notes && <span className="text-xs text-gray-400 italic truncate max-w-[160px]">{a.notes}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      {a.status !== 'completed' && a.status !== 'skipped' && (
        <div className={clsx('flex items-center gap-1 mt-2', compact ? 'justify-end' : '')}>
          <button
            onClick={() => onLog(a)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
          >
            <ClipboardList size={11} />Log
          </button>
          <button
            onClick={() => updateStatus.mutate({ id: a.id, status: 'completed', clientId })}
            disabled={updateStatus.isPending}
            title="Mark complete"
            className="p-1 rounded-lg hover:bg-emerald-50 text-gray-300 hover:text-emerald-500 transition-colors"
          >
            <CheckCircle2 size={13} />
          </button>
          <button
            onClick={() => updateStatus.mutate({ id: a.id, status: 'skipped', clientId })}
            disabled={updateStatus.isPending}
            title="Skip"
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <SkipForward size={13} />
          </button>
          <button
            onClick={() => remove.mutate({ id: a.id, clientId })}
            disabled={remove.isPending}
            className="p-1 rounded-lg hover:bg-rose-50 text-gray-200 hover:text-rose-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Weekly calendar ──────────────────────────────────────────
function WorkoutCalendar({
  clientId, assignments, onLog,
}: {
  clientId: string
  assignments: DbClientWorkoutWithWorkout[]
  onLog: (a: DbClientWorkoutWithWorkout) => void
}) {
  const [wkStart, setWkStart] = useState(() => weekMonday(new Date()))
  const [assignDate, setAssignDate] = useState<string | null>(null)
  const today = todayStr()

  const days = Array.from({ length: 7 }, (_, i) => addDays(wkStart, i))

  const byDate = useMemo(() => {
    const map: Record<string, DbClientWorkoutWithWorkout[]> = {}
    for (const a of assignments) {
      if (a.due_date) (map[a.due_date] ??= []).push(a)
    }
    return map
  }, [assignments])

  const unscheduled = useMemo(
    () => assignments.filter(a => !a.due_date && a.status !== 'completed'),
    [assignments],
  )

  const wkEnd   = addDays(wkStart, 6)
  const wkLabel = `${wkStart.getDate()} ${MONTH_NAMES[wkStart.getMonth()]} – ${wkEnd.getDate()} ${MONTH_NAMES[wkEnd.getMonth()]} ${wkEnd.getFullYear()}`

  return (
    <div>
      {assignDate !== null && (
        <AssignWorkoutModal clientId={clientId} defaultDate={assignDate} onClose={() => setAssignDate(null)} />
      )}

      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWkStart(d => addDays(d, -7))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-700">{wkLabel}</span>
        <button onClick={() => setWkStart(d => addDays(d, 7))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 7-column grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const ds       = dateToStr(day)
          const isToday  = ds === today
          const dayItems = byDate[ds] ?? []
          return (
            <div key={ds} className="flex flex-col">
              {/* Day header */}
              <div className={clsx(
                'text-center py-2 rounded-t-xl border-b mb-1',
                isToday ? 'bg-brand-600 border-brand-600' : 'bg-gray-50 border-gray-200',
              )}>
                <p className={clsx('text-xs font-medium', isToday ? 'text-brand-100' : 'text-gray-400')}>
                  {DAY_NAMES[i]}
                </p>
                <p className={clsx('text-sm font-bold', isToday ? 'text-white' : 'text-gray-700')}>
                  {day.getDate()}
                </p>
              </div>
              {/* Assignment cards */}
              <div className="space-y-1.5 min-h-[80px]">
                {dayItems.map(a => (
                  <AssignmentCard key={a.id} a={a} clientId={clientId} compact onLog={onLog} />
                ))}
                <button
                  onClick={() => setAssignDate(ds)}
                  className="w-full py-1 text-gray-300 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Unscheduled ({unscheduled.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {unscheduled.map(a => (
              <AssignmentCard key={a.id} a={a} clientId={clientId} onLog={onLog} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Workouts tab ─────────────────────────────────────────────
type WorkoutsView = 'list' | 'schedule'

function WorkoutsTab({ clientId }: { clientId: string }) {
  const { data: assignments = [], isLoading } = useClientWorkouts(clientId)
  const [view, setView]           = useState<WorkoutsView>('list')
  const [showAssign, setShowAssign] = useState(false)
  const [logTarget, setLogTarget] = useState<DbClientWorkoutWithWorkout | null>(null)

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
  }

  const completed = assignments.filter(a => a.status === 'completed').length

  return (
    <div>
      {showAssign && <AssignWorkoutModal clientId={clientId} onClose={() => setShowAssign(false)} />}
      {logTarget  && <LogSessionModal assignment={logTarget} clientId={clientId} onClose={() => setLogTarget(null)} />}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-100 p-0.5 rounded-xl">
          <button onClick={() => setView('list')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              view === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <ClipboardList size={13} />List
          </button>
          <button onClick={() => setView('schedule')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              view === 'schedule' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Calendar size={13} />Schedule
          </button>
        </div>
        <div className="flex items-center gap-2">
          {completed > 0 && (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
              {completed} completed
            </span>
          )}
          <button onClick={() => setShowAssign(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-xs font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all shadow-sm">
            <Plus size={13} /> Assign Workout
          </button>
        </div>
      </div>

      {/* Views */}
      {view === 'schedule' ? (
        <WorkoutCalendar clientId={clientId} assignments={assignments} onLog={setLogTarget} />
      ) : assignments.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium mb-1">No workouts assigned yet</p>
          <p className="text-xs text-gray-400 mb-4">Push a workout from your library to this client</p>
          <button onClick={() => setShowAssign(true)}
            className="px-4 py-2 bg-brand-50 text-brand-600 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors">
            + Assign Workout
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => (
            <AssignmentCard key={a.id} a={a} clientId={clientId} onLog={setLogTarget} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── History tab ──────────────────────────────────────────────
function HistoryTab({ clientId }: { clientId: string }) {
  const [entries, setEntries]   = useState<CoachHistoryEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail]     = useState<Record<string, CoachSessionDetail>>({})
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('get_portal_history', { p_client_id: clientId }).then(({ data }) => {
      setEntries((data as CoachHistoryEntry[]) ?? [])
      setLoading(false)
    })
  }, [clientId])

  async function toggleSession(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (detail[id]) return
    setLoadingDetail(id)
    const { data } = await supabase.rpc('get_portal_session_detail', {
      p_client_id: clientId, p_workout_log_id: id,
    })
    setDetail(prev => ({ ...prev, [id]: data as CoachSessionDetail }))
    setLoadingDetail(null)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 size={24} className="text-brand-500 animate-spin" />
      <p className="text-sm text-gray-400">Loading history…</p>
    </div>
  )

  if (entries.length === 0) return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
        <History size={28} className="text-amber-400" />
      </div>
      <p className="text-gray-600 font-medium">No sessions logged yet</p>
      <p className="text-sm text-gray-400 mt-1">Completed sessions will appear here with full set data.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-800">Session History</h3>
        <span className="text-xs text-gray-400">{entries.length} sessions</span>
      </div>

      {entries.map(entry => {
        const isOpen   = expanded === entry.id
        const d        = detail[entry.id]
        const isLoading = loadingDetail === entry.id
        const dateStr  = new Date(entry.completed_at).toLocaleDateString('en-AU', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        })

        return (
          <div key={entry.id}
            className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">
            {/* Summary row */}
            <button
              onClick={() => toggleSession(entry.id)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              {/* Date badge */}
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex flex-col items-center justify-center flex-shrink-0">
                <History size={16} className="text-amber-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-[15px] leading-tight truncate">
                  {entry.workout_name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <Calendar size={11} />{dateStr}
                </p>
                {entry.exercises?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.exercises.slice(0, 4).map(name => (
                      <span key={name}
                        className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {name}
                      </span>
                    ))}
                    {entry.exercises.length > 4 && (
                      <span className="text-[11px] text-gray-400 px-1 py-0.5">
                        +{entry.exercises.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {entry.set_count > 0 && (
                  <div className="text-right">
                    <p className="text-amber-500 font-bold text-lg leading-none">{entry.set_count}</p>
                    <p className="text-gray-400 text-[10px] uppercase tracking-wide">sets</p>
                  </div>
                )}
                {isOpen
                  ? <ChevronUp size={16} className="text-gray-400" />
                  : <ChevronDown size={16} className="text-gray-400" />
                }
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4 space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Loading sets…</span>
                  </div>
                ) : !d || d.exercises.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No set data recorded for this session.</p>
                  </div>
                ) : (
                  <>
                    {d.exercises.map((ex, idx) => {
                      const isWeighted = ex.metric_type === 'reps_weight'
                      const isTimed    = ex.metric_type === 'time'
                      const isDistance = ex.metric_type === 'distance'
                      const setsWithData = ex.sets.filter(s =>
                        s.reps_achieved != null || s.weight_used != null ||
                        s.duration_seconds != null || s.distance_meters != null
                      )
                      if (setsWithData.length === 0) return null

                      return (
                        <div key={ex.exercise_id}
                          className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                          {/* Exercise header */}
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-[11px] font-bold text-amber-600 flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm leading-tight">{ex.name}</p>
                              {ex.muscle_group && (
                                <p className="text-xs text-gray-400 mt-0.5">{ex.muscle_group}</p>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {setsWithData.length} {setsWithData.length === 1 ? 'set' : 'sets'}
                            </span>
                          </div>

                          {/* Column headers */}
                          <div className={clsx(
                            'grid px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400',
                            isWeighted ? 'grid-cols-[28px_1fr_1fr_52px]' : 'grid-cols-[28px_1fr_52px]',
                          )}>
                            <span>#</span>
                            {isWeighted && <><span>Reps</span><span>Weight</span></>}
                            {isTimed    && <span>Duration</span>}
                            {isDistance && <span>Distance</span>}
                            {ex.metric_type === 'reps' && <span>Reps</span>}
                            <span className="text-right">RPE</span>
                          </div>

                          {/* Set rows */}
                          <div className="divide-y divide-gray-50">
                            {setsWithData.map(s => (
                              <div key={s.set_number}
                                className={clsx(
                                  'grid items-center px-4 py-2.5 text-sm',
                                  isWeighted ? 'grid-cols-[28px_1fr_1fr_52px]' : 'grid-cols-[28px_1fr_52px]',
                                )}>
                                {/* Set number */}
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">
                                  {s.set_number}
                                </div>

                                {isWeighted && (
                                  <>
                                    <div>
                                      <span className="font-bold text-gray-900">{s.reps_achieved ?? '—'}</span>
                                      <span className="text-gray-400 text-xs ml-1">reps</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-gray-900">
                                        {s.weight_used != null ? s.weight_used : '—'}
                                      </span>
                                      <span className="text-gray-400 text-xs ml-1">kg</span>
                                    </div>
                                  </>
                                )}
                                {isTimed && (
                                  <div>
                                    <span className="font-bold text-gray-900">
                                      {s.duration_seconds != null ? `${s.duration_seconds}s` : '—'}
                                    </span>
                                  </div>
                                )}
                                {isDistance && (
                                  <div>
                                    <span className="font-bold text-gray-900">
                                      {s.distance_meters != null ? `${s.distance_meters}m` : '—'}
                                    </span>
                                  </div>
                                )}
                                {ex.metric_type === 'reps' && (
                                  <div>
                                    <span className="font-bold text-gray-900">{s.reps_achieved ?? '—'}</span>
                                    <span className="text-gray-400 text-xs ml-1">reps</span>
                                  </div>
                                )}

                                {/* RPE */}
                                <div className="text-right">
                                  {s.rpe != null ? (
                                    <span className={clsx(
                                      'inline-block text-xs font-bold px-2 py-0.5 rounded-full',
                                      s.rpe <= 6  ? 'bg-emerald-50 text-emerald-600' :
                                      s.rpe <= 8  ? 'bg-amber-50 text-amber-600' :
                                                    'bg-rose-50 text-rose-600',
                                    )}>
                                      {s.rpe}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 text-xs">—</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {d.notes && (
                      <div className="rounded-xl bg-white border border-gray-100 px-4 py-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Session notes</p>
                        <p className="text-sm text-gray-600 leading-relaxed italic">{d.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Placeholder tab ──────────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Dumbbell size={28} className="text-gray-300" />
      </div>
      <p className="text-gray-500 font-medium">{label}</p>
      <p className="text-xs text-gray-400 mt-1">Coming soon</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: client, isLoading, error } = useClient(id!)
  const { data: tasks = [], isLoading: loadingTasks } = useTasks(id)
  const toggleTask = useToggleTask()
  const navigate = useNavigate()
  const getOrCreate = useGetOrCreateConversation()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showEdit, setShowEdit]   = useState(false)
  const [copied, setCopied]       = useState(false)

  async function openMessage() {
    if (!id) return
    const convo = await getOrCreate.mutateAsync(id)
    navigate(`/inbox?c=${convo.id}`)
  }

  function copyPortalLink() {
    const url = `${window.location.origin}${window.location.pathname}#/portal/${id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function openPortal() {
    window.open(`${window.location.origin}${window.location.pathname}#/portal/${id}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Client not found.</p>
        <Link to="/clients" className="text-brand-600 mt-2 inline-block hover:underline">Back to clients</Link>
      </div>
    )
  }

  const initials = client.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const pendingTasks = tasks.filter(t => !t.completed).length

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'workouts',  label: 'Workouts' },
    { key: 'history',   label: 'History' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'metrics',   label: 'Metrics' },
    { key: 'notes',     label: 'Notes' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {showEdit && <EditClientModal client={client} onClose={() => setShowEdit(false)} />}

      {/* Back */}
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={16} />
        Back to Clients
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
              <span className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit',
                client.status === 'active'   && 'bg-emerald-50 text-emerald-700',
                client.status === 'pending'  && 'bg-amber-50 text-amber-700',
                client.status === 'inactive' && 'bg-gray-100 text-gray-600',
              )}>
                <span className={clsx('w-1.5 h-1.5 rounded-full',
                  client.status === 'active'   && 'bg-emerald-500',
                  client.status === 'pending'  && 'bg-amber-500',
                  client.status === 'inactive' && 'bg-gray-400',
                )} />
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {client.email && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail size={14} />{client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={14} />{client.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar size={14} />
                Joined {new Date(client.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
            {client.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {client.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    <Tag size={10} />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share portal link */}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={copyPortalLink}
                title="Copy client portal link"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <button
                onClick={openPortal}
                title="Open client portal"
                className="px-2.5 py-2 text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ExternalLink size={13} />
              </button>
            </div>
            <button
              onClick={openMessage}
              disabled={getOrCreate.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all shadow-sm disabled:opacity-60"
            >
              {getOrCreate.isPending
                ? <Loader2 size={15} className="animate-spin" />
                : <MessageSquare size={15} />
              }
              Message
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Status',        value: client.status.charAt(0).toUpperCase() + client.status.slice(1), icon: <span className={clsx('w-3 h-3 rounded-full', client.status === 'active' ? 'bg-emerald-500' : client.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400')} /> },
          { label: 'Category',      value: client.category ?? '—',     icon: <Tag size={16} className="text-brand-500" /> },
          { label: 'Group',         value: client.group_name ?? '—',   icon: <ChevronDown size={16} className="text-violet-500" /> },
          { label: 'Pending Tasks', value: loadingTasks ? '—' : pendingTasks, icon: <Clock size={16} className="text-amber-500" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1.5">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex-shrink-0 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Client Info</h3>
                <div className="space-y-1">
                  {[
                    { label: 'Primary Goal', value: client.goal },
                    { label: 'Category',     value: client.category },
                    { label: 'Group',        value: client.group_name },
                    { label: 'Email',        value: client.email },
                    { label: 'Phone',        value: client.phone },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                      <span className="text-sm text-gray-500">{item.label}</span>
                      <span className="text-sm font-medium text-gray-800">{item.value || '—'}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Assigned Program</h3>
                    <button className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:text-brand-700">
                      <Plus size={12} />Assign
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Dumbbell size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No program assigned</p>
                    <button className="mt-1 text-xs text-brand-600 font-medium hover:text-brand-700">
                      Assign a program
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Tasks</h3>
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {pendingTasks} pending
                  </span>
                </div>

                {loadingTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-gray-300" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <button
                            onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
                            className={clsx(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200'
                                : 'border-gray-300 hover:border-brand-400',
                            )}
                          >
                            {task.completed && <CheckCircle2 size={11} className="text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-sm font-medium truncate', task.completed ? 'line-through text-gray-400' : 'text-gray-700')}>
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock size={10} />
                                {new Date(task.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>
                      )}
                    </div>
                    <AddTaskRow clientId={client.id} />
                  </>
                )}
              </div>

              {/* Portal Access — spans full width */}
              <div className="lg:col-span-2 border-t border-gray-100 pt-6">
                <PortalAccessCard client={client} />
              </div>
            </div>
          )}

          {activeTab === 'workouts'  && <WorkoutsTab clientId={client.id} />}
          {activeTab === 'history'   && <HistoryTab clientId={client.id} />}
          {activeTab === 'nutrition' && <ComingSoon label="Nutrition plans" />}
          {activeTab === 'metrics'   && <ComingSoon label="Client metrics" />}
          {activeTab === 'notes'     && <ComingSoon label="Coach notes" />}
        </div>
      </div>
    </div>
  )
}
