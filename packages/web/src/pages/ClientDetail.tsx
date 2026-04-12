import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, MessageSquare, Dumbbell,
  Calendar, Tag, MoreHorizontal, Plus, CheckCircle2,
  Clock, Loader2, X, ChevronDown, Trash2, Send,
  ClipboardList, ChevronLeft, ChevronRight, ClipboardCheck,
  SkipForward, ExternalLink, Copy, History, BarChart2, Utensils, Lock,
  ChevronUp, Scale, Zap, TrendingUp, Search, ListChecks,
  BookOpen, Check, UserCheck, Globe, Moon, LineChart, FileText,
  Archive, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import { useClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients'
import { useTasks, useCreateTask, useToggleTask } from '@/hooks/useTasks'
import { useHabits, useCreateHabit, useDeleteHabit } from '@/hooks/useHabits'
import {
  useCheckIns, useCreateCheckIn, useDeleteCheckIn,
  useMetricDefinitions, useCustomMetricValues,
  useLogCustomMetricValue, useDeleteCustomMetricValue,
} from '@/hooks/useMetrics'
import type { DbMetricDefinition } from '@/hooks/useMetrics'
import {
  useClientWorkouts, useAssignWorkout, useUpdateClientWorkoutStatus,
  useRemoveClientWorkout, useLogWorkoutSession,
} from '@/hooks/useClientWorkouts'
import { useGetOrCreateConversation } from '@/hooks/useConversations'
import {
  useWorkouts, useWorkoutDetail, useProgramDetail,
  usePrograms, useClientProgramAssignment, useAssignProgram, useUnassignProgram,
} from '@/hooks/useWorkouts'
import { useNutritionPlan, useUpsertNutritionPlan } from '@/hooks/useNutrition'
import ProgressReport from './ProgressReport'
import { useUnitSystem, weightLabel } from '@/lib/units'
import { playRestEndChime } from '@/lib/sound'
import type { DbClient, DbTask, DbClientWorkoutWithWorkout, PortalSection } from '@/lib/database.types'

type Tab = 'overview' | 'plan' | 'workouts' | 'history' | 'nutrition' | 'metrics' | 'notes'

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
    gradient:    'from-violet-500 to-amber-300',
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

// ─── Courses section (overview tab) ───────────────────────────
function CoursesSection({ client }: { client: DbClient }) {
  const [modules, setModules]         = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set())
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({})
  const [progress, setProgress]       = useState<Record<string, number>>({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState<string | null>(null)

  useEffect(() => { load() }, [client.id, client.org_id])

  async function load() {
    setLoading(true)
    const [{ data: m }, { data: e }] = await Promise.all([
      supabase.from('community_modules').select('id,title,access_type,published').eq('org_id', client.org_id).order('position'),
      supabase.from('community_module_enrollments').select('module_id').eq('client_id', client.id),
    ])
    const mods = (m ?? []) as any[]
    setModules(mods)
    setEnrollments(new Set((e ?? []).map((x: any) => x.module_id as string)))
    if (mods.length > 0) {
      const [{ data: lessons }, { data: p }] = await Promise.all([
        supabase.from('community_lessons').select('id,module_id').in('module_id', mods.map(x => x.id)),
        supabase.from('community_lesson_progress').select('lesson_id').eq('client_id', client.id).eq('completed', true),
      ])
      const lCounts: Record<string, number> = {}
      const lessonToMod: Record<string, string> = {}
      for (const l of lessons ?? []) { lCounts[l.module_id] = (lCounts[l.module_id] ?? 0) + 1; lessonToMod[l.id] = l.module_id }
      setLessonCounts(lCounts)
      const pMap: Record<string, number> = {}
      for (const row of p ?? []) { const mod = lessonToMod[row.lesson_id]; if (mod) pMap[mod] = (pMap[mod] ?? 0) + 1 }
      setProgress(pMap)
    }
    setLoading(false)
  }

  async function toggleEnroll(moduleId: string) {
    setSaving(moduleId)
    if (enrollments.has(moduleId)) {
      await supabase.from('community_module_enrollments').delete().eq('module_id', moduleId).eq('client_id', client.id)
      setEnrollments(prev => { const n = new Set(prev); n.delete(moduleId); return n })
    } else {
      await supabase.from('community_module_enrollments').insert({ module_id: moduleId, client_id: client.id })
      setEnrollments(prev => new Set([...prev, moduleId]))
    }
    setSaving(null)
  }

  if (loading) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-[#2e3a52]" /></div>
  if (modules.length === 0) return (
    <div className="text-center py-6 text-sm text-[#3a4a62]">
      No courses created yet. <a href="/community" className="text-amber-400 font-semibold hover:underline">Create one in Community</a>.
    </div>
  )

  return (
    <div className="space-y-2">
      {modules.map(m => {
        const isAll     = m.access_type === 'all'
        const enrolled  = isAll || enrollments.has(m.id)
        const done      = progress[m.id] ?? 0
        const total     = lessonCounts[m.id] ?? 0
        const pct       = total > 0 ? Math.round((done / total) * 100) : 0
        return (
          <div key={m.id} className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
            enrolled ? 'border-amber-400/20 bg-amber-400/10/40' : 'border-[#242d40]')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-amber-300 flex items-center justify-center flex-shrink-0">
              <BookOpen size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#8a9ab5] truncate">{m.title}</p>
                {isAll && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-0.5"><Globe size={8} /> All</span>}
              </div>
              {enrolled && total > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-[#1e2535] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#3a4a62] flex-shrink-0">{done}/{total}</span>
                </div>
              )}
            </div>
            {!isAll && (
              <button onClick={() => toggleEnroll(m.id)} disabled={saving === m.id}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0',
                  enrolled
                    ? 'bg-amber-400/10 text-amber-400 hover:bg-red-50 hover:text-red-600'
                    : 'bg-[#161b27] text-[#8a9ab5] hover:bg-amber-400/10 hover:text-amber-400')}>
                {saving === m.id ? <Loader2 size={11} className="animate-spin" />
                  : enrolled ? <><UserCheck size={11} /> Enrolled</> : <><Plus size={11} /> Enroll</>}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

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
        <h3 className="font-semibold text-[#e8edf5]">Client Portal Access</h3>
        <span className="text-xs text-[#3a4a62]">
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
                  : 'bg-[#0d1117] border-[#242d40] hover:bg-[#161b27]',
              )}
            >
              {/* Toggle pill */}
              <div className={clsx(
                'absolute top-3 right-3 w-8 h-4 rounded-full transition-colors flex items-center px-0.5',
                on ? 'bg-[#161b27]/30' : 'bg-[#1e2535]',
              )}>
                <div className={clsx(
                  'w-3 h-3 rounded-full transition-all',
                  on ? 'translate-x-4 bg-[#161b27] shadow' : 'translate-x-0 bg-[#161b27] shadow',
                )} />
              </div>

              {/* Icon */}
              <div className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center mb-2.5',
                on
                  ? 'bg-[#161b27]/25'
                  : 'bg-[#1e2535]',
              )}>
                {on
                  ? <Icon size={18} className="text-white" />
                  : <Icon size={18} className="text-[#3a4a62]" />}
              </div>

              <p className={clsx('text-sm font-semibold leading-tight', on ? 'text-white' : 'text-[#8a9ab5]')}>
                {label}
              </p>
              <p className={clsx('text-[11px] mt-0.5 leading-snug', on ? 'text-white/70' : 'text-[#3a4a62]')}>
                {desc}
              </p>

              {!on && (
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Lock size={10} className="text-[#2e3a52]" />
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
        className="w-full text-left text-sm text-amber-400 font-semibold hover:text-amber-400 transition-colors py-3 flex items-center gap-1.5"
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
        className="w-full text-sm px-3 py-2 border border-[#242d40] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="flex-1 text-sm px-3 py-2 border border-[#242d40] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="px-3 py-2 bg-amber-400 text-white text-sm font-medium rounded-lg hover:bg-amber-400 disabled:opacity-60"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[#3a4a62] hover:text-[#8a9ab5]">
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
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#e8edf5]">Edit Client</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27]">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Primary Goal</label>
            <input type="text" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              placeholder="Weight Loss, Muscle Gain..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Category</label>
              <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Premium..."
                className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Group</label>
              <input type="text" value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}
                placeholder="Morning..."
                className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DbClient['status'] }))}
                className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-[#161b27]">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={update.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 transition-all">
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

// ─── Assign program modal ─────────────────────────────────────
function AssignProgramModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { data: programs = [], isLoading } = usePrograms()
  const assign = useAssignProgram(clientId)
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [error, setError]       = useState<string | null>(null)

  const filtered = programs.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setError('Please select a program'); return }
    setError(null)
    try {
      await assign.mutateAsync({ program_id: selected })
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#e8edf5]">Assign Program</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27]"><X size={18} /></button>
        </div>
        {error && <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}
        <div className="relative mb-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programs..."
            className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 min-h-0" style={{ maxHeight: 260 }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-[#2e3a52]" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[#3a4a62] text-center py-8">No programs found</p>
          ) : filtered.map(p => (
            <button key={p.id} type="button" onClick={() => setSelected(p.id)}
              className={clsx('w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                selected === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-transparent bg-[#0d1117] hover:bg-[#161b27]')}>
              <div className="flex items-center gap-3">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  selected === p.id ? 'bg-amber-400' : 'bg-[#1e2535]')}>
                  <BarChart2 size={15} className={selected === p.id ? 'text-white' : 'text-[#4a5a75]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#e8edf5] truncate">{p.name}</p>
                  <p className="text-xs text-[#4a5a75]">
                    {p.duration_weeks ? `${p.duration_weeks} weeks` : ''}
                    {p.difficulty ? ` · ${p.difficulty}` : ''}
                  </p>
                </div>
                {selected === p.id && <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0" />}
              </div>
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-3 border-t border-[#242d40] pt-4">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!selected || assign.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 transition-all">
            {assign.isPending ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> Assign</>}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Program section (overview tab) ───────────────────────────
function ProgramSection({ clientId }: { clientId: string }) {
  const [showAssign, setShowAssign] = useState(false)
  const { data: assignment, isLoading } = useClientProgramAssignment(clientId)
  const unassign = useUnassignProgram(clientId)
  const navigate = useNavigate()

  return (
    <div className="mt-4">
      {showAssign && <AssignProgramModal clientId={clientId} onClose={() => setShowAssign(false)} />}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#e8edf5]">Assigned Program</h3>
        <button onClick={() => setShowAssign(true)}
          className="flex items-center gap-1 text-xs text-amber-400 font-medium hover:text-amber-400">
          <Plus size={12} />{assignment ? 'Change' : 'Assign'}
        </button>
      </div>
      {isLoading ? (
        <div className="bg-[#0d1117] rounded-xl p-4 flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-[#2e3a52]" />
        </div>
      ) : assignment?.program ? (
        <div className="bg-amber-400/10 border border-amber-400/10 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <BarChart2 size={15} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <button onClick={() => navigate(`/library/programs/${assignment.program!.id}`)}
                className="text-sm font-semibold text-amber-400 hover:underline truncate block text-left">
                {assignment.program.name}
              </button>
              <p className="text-xs text-[#4a5a75] mt-0.5">
                {assignment.program.duration_weeks ? `${assignment.program.duration_weeks} weeks` : ''}
                {assignment.program.difficulty ? ` · ${assignment.program.difficulty}` : ''}
              </p>
            </div>
            <button onClick={() => unassign.mutate(assignment.id)} disabled={unassign.isPending}
              title="Remove program"
              className="text-[#2e3a52] hover:text-rose-400 transition-colors p-1 flex-shrink-0">
              {unassign.isPending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0d1117] rounded-xl p-4 text-center">
          <Dumbbell size={24} className="mx-auto text-[#2e3a52] mb-2" />
          <p className="text-sm text-[#4a5a75]">No program assigned</p>
          <button onClick={() => setShowAssign(true)}
            className="mt-1 text-xs text-amber-400 font-medium hover:text-amber-400">
            Assign a program
          </button>
        </div>
      )}
    </div>
  )
}

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
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#e8edf5]">Assign Workout</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27]"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

        {/* Workout search */}
        <div className="relative mb-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search workouts..."
            className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
          />
        </div>

        {/* Workout list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 min-h-0" style={{ maxHeight: 260 }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[#2e3a52]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[#3a4a62] text-center py-8">No workouts found</p>
          ) : filtered.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelected(w.id)}
              className={clsx(
                'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                selected === w.id
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-transparent bg-[#0d1117] hover:bg-[#161b27]',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  selected === w.id ? 'bg-amber-400' : 'bg-[#1e2535]')}>
                  <Dumbbell size={15} className={selected === w.id ? 'text-white' : 'text-[#4a5a75]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#e8edf5] truncate">{w.name}</p>
                  <p className="text-xs text-[#4a5a75]">
                    {(w as any).workout_exercises?.length ?? 0} exercises
                    {w.duration_minutes ? ` · ${w.duration_minutes} min` : ''}
                    {w.difficulty ? ` · ${w.difficulty}` : ''}
                  </p>
                </div>
                {selected === w.id && <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0" />}
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3 border-t border-[#242d40] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] mb-1.5 uppercase tracking-wide">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..."
                className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!selected || assign.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 transition-all">
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
  assigned:  'bg-amber-400/10 text-amber-400',
  completed: 'bg-emerald-50 text-emerald-700',
  skipped:   'bg-[#161b27] text-[#4a5a75]',
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#161b27]/95 backdrop-blur-sm rounded-2xl">
      <p className="text-xs font-semibold text-[#3a4a62] uppercase tracking-widest mb-1">Rest Period</p>
      <p className="text-sm text-[#8a9ab5] font-medium mb-6 text-center max-w-[200px]">{label}</p>
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
          <span className="text-4xl font-bold text-[#e8edf5] tabular-nums leading-none">{display}</span>
          <span className="text-[#3a4a62] text-xs mt-0.5">seconds</span>
        </div>
      </div>
      {/* ±15 s controls */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => setRemaining(r => Math.max(0, r - 15))}
          className="w-11 h-11 rounded-xl bg-[#161b27] hover:bg-[#1e2535] text-[#8a9ab5] text-sm font-bold transition-colors flex items-center justify-center"
        >
          −15
        </button>
        <button
          onClick={onDone}
          className="px-5 py-2.5 bg-[#161b27] hover:bg-[#1e2535] text-[#8a9ab5] text-sm font-semibold rounded-xl transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => setRemaining(r => r + 15)}
          className="w-11 h-11 rounded-xl bg-[#161b27] hover:bg-[#1e2535] text-[#8a9ab5] text-sm font-bold transition-colors flex items-center justify-center"
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
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] z-10">
        {/* Rest timer overlay */}
        {restTimer && (
          <CoachRestTimer
            restSeconds={restTimer.restSeconds}
            label={restTimer.label}
            onDone={() => setRestTimer(null)}
          />
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#242d40]">
          <div>
            <h2 className="text-lg font-bold text-[#e8edf5]">Log Session</h2>
            <p className="text-sm text-[#4a5a75] mt-0.5">{assignment.workout.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:bg-[#161b27]"><X size={18} /></button>
        </div>

        {/* Date picker */}
        <div className="px-6 py-3 border-b border-[#1e2535] flex items-center gap-4">
          <label className="text-xs font-semibold text-[#4a5a75] uppercase tracking-wide">Date</label>
          <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[#242d40] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
        </div>

        {/* Exercises */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#2e3a52]" /></div>
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
                  <p className="text-sm font-semibold text-[#e8edf5]">{ex.exercise_name}</p>
                  <span className="text-xs text-[#3a4a62] bg-[#161b27] px-2 py-0.5 rounded-full">
                    {ex.workout_sets.length} sets
                    {ex.exercise?.muscle_group ? ` · ${ex.exercise.muscle_group}` : ''}
                  </span>
                </div>
                {/* Column headers */}
                <div className={clsx('grid gap-2 text-xs font-semibold text-[#3a4a62] uppercase tracking-wide px-2 mb-1.5', colClass)}>
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
                      'px-2 py-1.5 text-sm text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/20 w-full',
                      done ? 'border-emerald-200 bg-emerald-50 opacity-70' : 'border-[#242d40] bg-[#161b27]',
                    )
                    return (
                      <div key={s.set_number}
                        className={clsx('grid gap-2 items-center rounded-xl px-2 py-2 transition-colors',
                          done ? 'bg-emerald-50' : 'bg-[#0d1117]',
                          colClass)}>
                        <span className={clsx('text-xs font-bold text-center',
                          done ? 'text-emerald-500' : 'text-[#3a4a62]')}>
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
                              : 'bg-[#161b27] border border-[#242d40] text-[#2e3a52] hover:border-emerald-300 hover:text-emerald-500',
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
        <div className="px-6 py-4 border-t border-[#242d40] space-y-3">
          {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">{error}</p>}
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Session notes (optional)..."
            className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">Cancel</button>
            <button onClick={submit} disabled={logSession.isPending || saved || isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 transition-all">
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
      'group relative flex flex-col bg-[#161b27] rounded-xl border transition-all hover:shadow-sm',
      a.status === 'completed' ? 'border-emerald-200' : a.status === 'skipped' ? 'border-[#242d40] opacity-60' : 'border-[#242d40]',
      compact ? 'p-2' : 'p-3.5',
    )}>
      <div className="flex items-start gap-2">
        <div className={clsx('rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
          compact ? 'w-6 h-6' : 'w-8 h-8',
          a.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-400/10')}>
          {a.status === 'completed'
            ? <CheckCircle2 size={compact ? 12 : 15} className="text-emerald-600" />
            : <Dumbbell size={compact ? 12 : 15} className="text-amber-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={clsx('font-semibold truncate', compact ? 'text-xs' : 'text-sm',
            a.status === 'completed' ? 'text-[#3a4a62] line-through' : 'text-[#e8edf5]')}>
            {a.workout.name}
          </p>
          {!compact && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_STYLES[a.status])}>
                {a.status}
              </span>
              {a.workout.difficulty && <span className="text-xs text-[#3a4a62]">{a.workout.difficulty}</span>}
              {a.notes && <span className="text-xs text-[#3a4a62] italic truncate max-w-[160px]">{a.notes}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      {a.status !== 'completed' && a.status !== 'skipped' && (
        <div className={clsx('flex items-center gap-1 mt-2', compact ? 'justify-end' : '')}>
          <button
            onClick={() => onLog(a)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-400 bg-amber-400/10 hover:bg-amber-400/10 rounded-lg transition-colors"
          >
            <ClipboardList size={11} />Log
          </button>
          <button
            onClick={() => updateStatus.mutate({ id: a.id, status: 'completed', clientId })}
            disabled={updateStatus.isPending}
            title="Mark complete"
            className="p-1 rounded-lg hover:bg-emerald-50 text-[#2e3a52] hover:text-emerald-500 transition-colors"
          >
            <CheckCircle2 size={13} />
          </button>
          <button
            onClick={() => updateStatus.mutate({ id: a.id, status: 'skipped', clientId })}
            disabled={updateStatus.isPending}
            title="Skip"
            className="p-1 rounded-lg hover:bg-[#161b27] text-[#2e3a52] hover:text-[#4a5a75] transition-colors"
          >
            <SkipForward size={13} />
          </button>
          <button
            onClick={() => remove.mutate({ id: a.id, clientId })}
            disabled={remove.isPending}
            className="p-1 rounded-lg hover:bg-rose-400/10 text-[#8a9ab5] hover:text-rose-400 transition-colors"
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
          className="p-1.5 rounded-lg hover:bg-[#161b27] text-[#4a5a75] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-[#8a9ab5]">{wkLabel}</span>
        <button onClick={() => setWkStart(d => addDays(d, 7))}
          className="p-1.5 rounded-lg hover:bg-[#161b27] text-[#4a5a75] transition-colors">
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
                isToday ? 'bg-amber-400 border-amber-400' : 'bg-[#0d1117] border-[#242d40]',
              )}>
                <p className={clsx('text-xs font-medium', isToday ? 'text-amber-400' : 'text-[#3a4a62]')}>
                  {DAY_NAMES[i]}
                </p>
                <p className={clsx('text-sm font-bold', isToday ? 'text-white' : 'text-[#8a9ab5]')}>
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
                  className="w-full py-1 text-[#2e3a52] hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors flex items-center justify-center"
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
          <p className="text-xs font-semibold text-[#3a4a62] uppercase tracking-wide mb-2">
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

// ─── Plan / Calendar tab ──────────────────────────────────────
type CalEventKind = 'program' | 'workout' | 'task'
interface CalEvent {
  kind:    CalEventKind
  id:      string
  label:   string
  status?: string   // workout status or 'done' for tasks
}

const CAL_DAY_NAMES  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CAL_MONTH_NAMES = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December']

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function calAddDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function buildCalendarWeeks(month: Date) {
  const year = month.getFullYear()
  const mon  = month.getMonth()
  const firstDay = new Date(year, mon, 1)
  // Week starts Monday: 0=Mon … 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7
  const start = calAddDays(firstDay, -startOffset)
  const weeks: Date[][] = []
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) week.push(calAddDays(start, w * 7 + d))
    weeks.push(week)
  }
  return weeks
}

// ── Quick add modal inside Plan tab ──
function AddToDayModal({
  date, clientId,
  onClose,
}: {
  date: string
  clientId: string
  onClose: () => void
}) {
  const [mode, setMode]     = useState<'workout' | 'task'>('workout')
  const [search, setSearch] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const { data: workouts = [], isLoading: wLoading } = useWorkouts(search.length >= 2 ? search : undefined)
  const assignWorkout = useAssignWorkout()
  const createTask    = useCreateTask()

  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  async function handleAssignWorkout(workoutId: string) {
    await assignWorkout.mutateAsync({ client_id: clientId, workout_id: workoutId, due_date: date })
    onClose()
  }
  async function handleAddTask() {
    if (!taskTitle.trim()) return
    await createTask.mutateAsync({ title: taskTitle.trim(), client_id: clientId, due_date: date })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-md flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242d40]">
          <div>
            <p className="text-xs text-[#3a4a62] font-medium">Add to</p>
            <h2 className="text-base font-bold text-[#e8edf5]">{label}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:bg-[#161b27]"><X size={18} /></button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-3 border-b border-[#242d40]">
          {(['workout', 'task'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={clsx(
                'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
                mode === m ? 'bg-amber-400 text-white shadow-sm' : 'text-[#4a5a75] hover:bg-[#161b27]',
              )}>
              {m === 'workout' ? '🏋️ Workout' : '✅ Task'}
            </button>
          ))}
        </div>

        {mode === 'workout' ? (
          <>
            <div className="px-4 py-3 border-b border-[#242d40]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a4a62]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workouts…"
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-3 space-y-1">
              {wLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#2e3a52]" /></div>
              ) : workouts.length === 0 ? (
                <p className="text-sm text-[#3a4a62] text-center py-8">
                  {search.length >= 2 ? 'No workouts match' : 'Type to search workouts'}
                </p>
              ) : workouts.map(w => (
                <button key={w.id} onClick={() => handleAssignWorkout(w.id)}
                  disabled={assignWorkout.isPending}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#0d1117] transition-colors group disabled:opacity-50">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={13} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#e8edf5] truncate">{w.name}</p>
                    <p className="text-xs text-[#3a4a62]">
                      {w.difficulty ?? 'Any level'}
                      {w.duration_minutes ? ` · ${w.duration_minutes}min` : ''}
                    </p>
                  </div>
                  <Plus size={13} className="text-[#2e3a52] group-hover:text-amber-400 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4 space-y-3">
            <input
              value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }}
              placeholder="Task title…"
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
            />
            <button onClick={handleAddTask}
              disabled={!taskTitle.trim() || createTask.isPending}
              className="w-full py-2.5 bg-amber-400 text-white text-sm font-semibold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {createTask.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Task
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PlanTab({ clientId }: { clientId: string }) {
  const today = new Date()
  const [month, setMonth]         = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected]   = useState<string | null>(dateKey(today))
  const [addingTo, setAddingTo]   = useState<string | null>(null)

  const { data: assignment } = useClientProgramAssignment(clientId)
  const { data: program }    = useProgramDetail(assignment?.program_id ?? undefined)
  const { data: workouts = [] } = useClientWorkouts(clientId)
  const { data: tasks = [] }    = useTasks(clientId)

  // Build event map
  const eventMap = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    function push(key: string, ev: CalEvent) {
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }

    // Program schedule → overlay onto calendar dates
    if (program && assignment?.start_date) {
      const start = parseLocalDate(assignment.start_date)
      for (const slot of program.program_workouts) {
        const d = calAddDays(start, (slot.week_number - 1) * 7 + (slot.day_number - 1))
        push(dateKey(d), {
          kind:  'program',
          id:    slot.id,
          label: slot.workout?.name ?? 'Workout',
        })
      }
    }

    // Assigned workouts (by due_date)
    for (const cw of workouts) {
      const key = cw.due_date ? cw.due_date.slice(0, 10) : cw.assigned_at?.slice(0, 10)
      if (key) push(key, { kind: 'workout', id: cw.id, label: cw.workout?.name ?? 'Workout', status: cw.status })
    }

    // Tasks
    for (const t of tasks) {
      if (t.due_date) push(t.due_date.slice(0, 10), { kind: 'task', id: t.id, label: t.title, status: t.completed ? 'done' : 'pending' })
    }

    return map
  }, [program, assignment, workouts, tasks])

  const weeks   = buildCalendarWeeks(month)
  const todayKey = dateKey(today)
  const selectedEvents = selected ? (eventMap.get(selected) ?? []) : []

  const eventDot: Record<CalEventKind, string> = {
    program: 'bg-violet-500',
    workout: 'bg-amber-400',
    task:    'bg-amber-400',
  }
  const eventChip: Record<CalEventKind, string> = {
    program: 'bg-violet-100 text-violet-700',
    workout: 'bg-amber-400/10 text-amber-400',
    task:    'bg-amber-100 text-amber-700',
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {addingTo && (
        <AddToDayModal date={addingTo} clientId={clientId} onClose={() => setAddingTo(null)} />
      )}

      {/* ── Calendar ── */}
      <div className="flex-1 min-w-0">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="p-2 rounded-xl hover:bg-[#161b27] text-[#4a5a75] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h3 className="font-bold text-[#e8edf5] text-base">
            {CAL_MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
          </h3>
          <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="p-2 rounded-xl hover:bg-[#161b27] text-[#4a5a75] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {CAL_DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-[#3a4a62] py-1.5">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="border border-[#242d40] rounded-2xl overflow-hidden">
          {weeks.map((week, wi) => (
            <div key={wi} className={clsx('grid grid-cols-7', wi < 5 && 'border-b border-[#242d40]')}>
              {week.map((day, di) => {
                const key      = dateKey(day)
                const isToday  = key === todayKey
                const isSel    = key === selected
                const inMonth  = day.getMonth() === month.getMonth()
                const isWeekend = di >= 5
                const events   = eventMap.get(key) ?? []
                const MAX_CHIPS = 2
                const shown    = events.slice(0, MAX_CHIPS)
                const overflow = events.length - MAX_CHIPS

                return (
                  <button key={key} onClick={() => setSelected(isSel ? null : key)}
                    className={clsx(
                      'relative min-h-[72px] p-1.5 text-left transition-colors',
                      di < 6 && 'border-r border-[#242d40]',
                      isSel    ? 'bg-amber-400/10'
                      : isToday ? 'bg-amber-400/5'
                      : isWeekend ? 'bg-[#0d1117]/50'
                      : 'bg-[#161b27] hover:bg-[#0d1117]',
                    )}>
                    {/* Date number */}
                    <span className={clsx(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold mb-1',
                      isToday ? 'bg-amber-400 text-white'
                      : isSel  ? 'bg-amber-400/20 text-amber-400'
                      : inMonth ? (isWeekend ? 'text-[#3a4a62]' : 'text-[#8a9ab5]')
                      : 'text-[#2e3a52]',
                    )}>
                      {day.getDate()}
                    </span>

                    {/* Event chips */}
                    <div className="space-y-0.5">
                      {shown.map((ev, i) => (
                        <div key={i} className={clsx(
                          'text-[9px] font-semibold px-1.5 py-0.5 rounded-md truncate leading-tight',
                          ev.status === 'completed' || ev.status === 'done'
                            ? 'bg-emerald-100 text-emerald-700 line-through opacity-70'
                            : eventChip[ev.kind],
                        )}>
                          {ev.label}
                        </div>
                      ))}
                      {overflow > 0 && (
                        <p className="text-[9px] text-[#3a4a62] font-medium pl-1">+{overflow} more</p>
                      )}
                    </div>

                    {/* Add button on hover */}
                    <button
                      onClick={e => { e.stopPropagation(); setAddingTo(key) }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-md bg-amber-400 text-white opacity-0 hover:opacity-100 group-hover:opacity-100 flex items-center justify-center transition-opacity shadow-sm"
                      style={{ opacity: isSel ? 1 : undefined }}
                      title={`Add to ${key}`}>
                      <Plus size={11} />
                    </button>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Today shortcut */}
        {dateKey(new Date(month.getFullYear(), month.getMonth(), 1)) !== dateKey(new Date(today.getFullYear(), today.getMonth(), 1)) && (
          <button onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(todayKey) }}
            className="mt-3 text-xs text-amber-400 font-semibold hover:underline">
            ← Back to today
          </button>
        )}
      </div>

      {/* ── Day detail panel ── */}
      <div className="lg:w-72 xl:w-80 flex-shrink-0">
        {selected ? (
          <div className="bg-[#161b27] rounded-2xl border border-[#242d40] shadow-card overflow-hidden">
            {/* Panel header */}
            <div className="px-4 py-3.5 border-b border-[#242d40] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[#3a4a62] uppercase tracking-wide">Selected</p>
                <p className="font-bold text-[#e8edf5] text-sm mt-0.5">
                  {parseLocalDate(selected).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button onClick={() => setAddingTo(selected)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-white text-xs font-semibold rounded-xl hover:bg-amber-400 transition-colors">
                <Plus size={12} /> Add
              </button>
            </div>

            {/* Events list */}
            <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
              {selectedEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#3a4a62] mb-3">Nothing planned yet</p>
                  <button onClick={() => setAddingTo(selected)}
                    className="text-xs text-amber-400 font-semibold hover:underline">
                    + Add something
                  </button>
                </div>
              ) : (
                selectedEvents.map((ev, i) => (
                  <div key={i} className={clsx(
                    'flex items-start gap-2.5 px-3 py-2.5 rounded-xl',
                    ev.status === 'completed' || ev.status === 'done' ? 'bg-emerald-50' : 'bg-[#0d1117]',
                  )}>
                    <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', eventDot[ev.kind])} />
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'text-xs font-semibold text-[#e8edf5] leading-tight',
                        (ev.status === 'completed' || ev.status === 'done') && 'line-through text-[#3a4a62]',
                      )}>{ev.label}</p>
                      <p className="text-[10px] text-[#3a4a62] mt-0.5 capitalize">
                        {ev.kind === 'program' ? 'Program session'
                         : ev.kind === 'workout' ? (ev.status ?? 'assigned')
                         : (ev.status === 'done' ? 'Completed' : 'Task')}
                      </p>
                    </div>
                    {(ev.status === 'completed' || ev.status === 'done') && (
                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#161b27] rounded-2xl border border-[#242d40] shadow-card p-6 text-center">
            <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar size={18} className="text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-[#8a9ab5] mb-1">Select a day</p>
            <p className="text-xs text-[#3a4a62]">Click any date to view or add workouts and tasks</p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 p-3 bg-[#0d1117] rounded-xl space-y-2">
          <p className="text-[10px] font-bold text-[#3a4a62] uppercase tracking-wide">Legend</p>
          {([
            { kind: 'program', label: 'Program session' },
            { kind: 'workout', label: 'Assigned workout' },
            { kind: 'task',    label: 'Task' },
          ] as const).map(({ kind, label }) => (
            <div key={kind} className="flex items-center gap-2">
              <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', eventDot[kind])} />
              <span className="text-xs text-[#4a5a75]">{label}</span>
            </div>
          ))}
        </div>
      </div>
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
    return <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-[#2e3a52]" /></div>
  }

  const completed = assignments.filter(a => a.status === 'completed').length

  return (
    <div>
      {showAssign && <AssignWorkoutModal clientId={clientId} onClose={() => setShowAssign(false)} />}
      {logTarget  && <LogSessionModal assignment={logTarget} clientId={clientId} onClose={() => setLogTarget(null)} />}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#161b27] p-0.5 rounded-xl">
          <button onClick={() => setView('list')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              view === 'list' ? 'bg-[#161b27] text-[#e8edf5] shadow-sm' : 'text-[#4a5a75] hover:text-[#8a9ab5]')}>
            <ClipboardList size={13} />List
          </button>
          <button onClick={() => setView('schedule')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              view === 'schedule' ? 'bg-[#161b27] text-[#e8edf5] shadow-sm' : 'text-[#4a5a75] hover:text-[#8a9ab5]')}>
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
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-400 to-amber-300 text-white text-xs font-semibold rounded-xl hover:from-amber-400 hover:to-amber-300 transition-all shadow-sm">
            <Plus size={13} /> Assign Workout
          </button>
        </div>
      </div>

      {/* Views */}
      {view === 'schedule' ? (
        <WorkoutCalendar clientId={clientId} assignments={assignments} onLog={setLogTarget} />
      ) : assignments.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-14 h-14 rounded-2xl bg-[#161b27] flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={28} className="text-[#2e3a52]" />
          </div>
          <p className="text-[#4a5a75] font-medium mb-1">No workouts assigned yet</p>
          <p className="text-xs text-[#3a4a62] mb-4">Push a workout from your library to this client</p>
          <button onClick={() => setShowAssign(true)}
            className="px-4 py-2 bg-amber-400/10 text-amber-400 text-sm font-semibold rounded-xl hover:bg-amber-400/10 transition-colors">
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
      <Loader2 size={24} className="text-amber-400 animate-spin" />
      <p className="text-sm text-[#3a4a62]">Loading history…</p>
    </div>
  )

  if (entries.length === 0) return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
        <History size={28} className="text-amber-400" />
      </div>
      <p className="text-[#8a9ab5] font-medium">No sessions logged yet</p>
      <p className="text-sm text-[#3a4a62] mt-1">Completed sessions will appear here with full set data.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-[#e8edf5]">Session History</h3>
        <span className="text-xs text-[#3a4a62]">{entries.length} sessions</span>
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
            className="rounded-2xl border border-[#242d40] overflow-hidden shadow-sm bg-[#161b27]">
            {/* Summary row */}
            <button
              onClick={() => toggleSession(entry.id)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-[#0d1117] transition-colors"
            >
              {/* Date badge */}
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex flex-col items-center justify-center flex-shrink-0">
                <History size={16} className="text-amber-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#e8edf5] text-[15px] leading-tight truncate">
                  {entry.workout_name}
                </p>
                <p className="text-xs text-[#3a4a62] mt-0.5 flex items-center gap-1.5">
                  <Calendar size={11} />{dateStr}
                </p>
                {entry.exercises?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.exercises.slice(0, 4).map(name => (
                      <span key={name}
                        className="text-[11px] text-[#4a5a75] bg-[#161b27] px-2 py-0.5 rounded-full">
                        {name}
                      </span>
                    ))}
                    {entry.exercises.length > 4 && (
                      <span className="text-[11px] text-[#3a4a62] px-1 py-0.5">
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
                    <p className="text-[#3a4a62] text-[10px] uppercase tracking-wide">sets</p>
                  </div>
                )}
                {isOpen
                  ? <ChevronUp size={16} className="text-[#3a4a62]" />
                  : <ChevronDown size={16} className="text-[#3a4a62]" />
                }
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-[#242d40] bg-[#0d1117]/50 px-4 py-4 space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-[#3a4a62]">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Loading sets…</span>
                  </div>
                ) : !d || d.exercises.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList size={24} className="text-[#2e3a52] mx-auto mb-2" />
                    <p className="text-sm text-[#3a4a62]">No set data recorded for this session.</p>
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
                          className="rounded-xl bg-[#161b27] border border-[#242d40] overflow-hidden">
                          {/* Exercise header */}
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#242d40]">
                            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-[11px] font-bold text-amber-600 flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#e8edf5] text-sm leading-tight">{ex.name}</p>
                              {ex.muscle_group && (
                                <p className="text-xs text-[#3a4a62] mt-0.5">{ex.muscle_group}</p>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {setsWithData.length} {setsWithData.length === 1 ? 'set' : 'sets'}
                            </span>
                          </div>

                          {/* Column headers */}
                          <div className={clsx(
                            'grid px-4 py-2 bg-[#0d1117] border-b border-[#242d40] text-[10px] font-bold uppercase tracking-wide text-[#3a4a62]',
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
                                <div className="w-5 h-5 rounded-full bg-[#161b27] flex items-center justify-center text-[11px] font-bold text-[#4a5a75]">
                                  {s.set_number}
                                </div>

                                {isWeighted && (
                                  <>
                                    <div>
                                      <span className="font-bold text-[#e8edf5]">{s.reps_achieved ?? '—'}</span>
                                      <span className="text-[#3a4a62] text-xs ml-1">reps</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-[#e8edf5]">
                                        {s.weight_used != null ? s.weight_used : '—'}
                                      </span>
                                      <span className="text-[#3a4a62] text-xs ml-1">kg</span>
                                    </div>
                                  </>
                                )}
                                {isTimed && (
                                  <div>
                                    <span className="font-bold text-[#e8edf5]">
                                      {s.duration_seconds != null ? `${s.duration_seconds}s` : '—'}
                                    </span>
                                  </div>
                                )}
                                {isDistance && (
                                  <div>
                                    <span className="font-bold text-[#e8edf5]">
                                      {s.distance_meters != null ? `${s.distance_meters}m` : '—'}
                                    </span>
                                  </div>
                                )}
                                {ex.metric_type === 'reps' && (
                                  <div>
                                    <span className="font-bold text-[#e8edf5]">{s.reps_achieved ?? '—'}</span>
                                    <span className="text-[#3a4a62] text-xs ml-1">reps</span>
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
                                    <span className="text-[#2e3a52] text-xs">—</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {d.notes && (
                      <div className="rounded-xl bg-[#161b27] border border-[#242d40] px-4 py-3">
                        <p className="text-xs font-semibold text-[#3a4a62] uppercase tracking-wide mb-1">Session notes</p>
                        <p className="text-sm text-[#8a9ab5] leading-relaxed italic">{d.notes}</p>
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

// ─── Metrics Tab ──────────────────────────────────────────────
type CheckInMetricKey = 'weight_kg' | 'body_fat_pct' | 'energy_level' | 'sleep_hours'
const CHECKIN_METRICS: { key: CheckInMetricKey; label: string; unit: string; icon: React.ReactNode; color: string }[] = [
  { key: 'weight_kg',    label: 'Weight',   unit: 'kg',  icon: <Scale size={14} />,     color: 'text-emerald-600' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%',   icon: <TrendingUp size={14} />, color: 'text-teal-600' },
  { key: 'energy_level', label: 'Energy',   unit: '/10', icon: <Zap size={14} />,        color: 'text-amber-600' },
  { key: 'sleep_hours',  label: 'Sleep',    unit: 'h',   icon: <Moon size={14} />,       color: 'text-violet-600' },
]

function LogCheckInModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const createCheckIn = useCreateCheckIn()
  const [weight, setWeight]   = useState('')
  const [fat, setFat]         = useState('')
  const [energy, setEnergy]   = useState<number | null>(null)
  const [sleep, setSleep]     = useState('')
  const [notes, setNotes]     = useState('')
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      await createCheckIn.mutateAsync({
        client_id:    clientId,
        weight_kg:    weight  ? parseFloat(weight)  : null,
        body_fat_pct: fat     ? parseFloat(fat)     : null,
        energy_level: energy,
        sleep_hours:  sleep   ? parseFloat(sleep)   : null,
        notes:        notes   || null,
        checked_in_at: date,
      })
      onSaved()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-[#e8edf5] text-lg">Log Check-in</h3>
          <button onClick={onClose} className="text-[#3a4a62] hover:text-[#8a9ab5] p-1"><X size={18} /></button>
        </div>
        {err && <p className="mb-3 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{err}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#4a5a75] uppercase tracking-wide block mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#4a5a75] flex items-center gap-1 mb-1"><Scale size={11} />Weight (kg)</label>
              <input type="number" step="0.1" min="0" value={weight} onChange={e => setWeight(e.target.value)}
                placeholder="–" className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4a5a75] flex items-center gap-1 mb-1"><TrendingUp size={11} />Body Fat (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={fat} onChange={e => setFat(e.target.value)}
                placeholder="–" className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4a5a75] flex items-center gap-1 mb-1"><Moon size={11} />Sleep (hrs)</label>
              <input type="number" step="0.5" min="0" max="24" value={sleep} onChange={e => setSleep(e.target.value)}
                placeholder="–" className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4a5a75] flex items-center gap-1 mb-1"><Zap size={11} />Energy (1–10)</label>
              <div className="flex gap-1 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} type="button" onClick={() => setEnergy(energy === n ? null : n)}
                    className={clsx('w-7 h-7 text-xs font-bold rounded-lg border transition-all',
                      energy === n ? 'bg-amber-500 border-amber-500 text-white' : 'border-[#242d40] text-[#4a5a75] hover:border-amber-300')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#4a5a75] uppercase tracking-wide block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any notes for this check-in…"
              className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LogCustomMetricModal({
  clientId,
  definitions,
  onClose,
  onSaved,
}: { clientId: string; definitions: DbMetricDefinition[]; onClose: () => void; onSaved: () => void }) {
  const logValue = useLogCustomMetricValue()
  const [defId, setDefId]   = useState(definitions[0]?.id ?? '')
  const [value, setValue]   = useState('')
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!defId || !value) return
    setSaving(true)
    try {
      await logValue.mutateAsync({ client_id: clientId, definition_id: defId, value: parseFloat(value), logged_at: date })
      onSaved()
    } finally { setSaving(false) }
  }

  const selectedDef = definitions.find(d => d.id === defId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#e8edf5]">Log Custom Metric</h3>
          <button onClick={onClose} className="text-[#3a4a62] hover:text-[#8a9ab5] p-1"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <select value={defId} onChange={e => setDefId(e.target.value)} required
            className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-[#161b27]">
            {definitions.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.name}{d.unit ? ` (${d.unit})` : ''}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" step="any" value={value} onChange={e => setValue(e.target.value)} required
              placeholder={`Value${selectedDef?.unit ? ` in ${selectedDef.unit}` : ''}…`}
              className="flex-1 px-3 py-2 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">Cancel</button>
            <button type="submit" disabled={!defId || !value || saving}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Log
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const W = 80, H = 28, pad = 3
  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-7">
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MetricsTab({ clientId }: { clientId: string }) {
  const { data: checkIns = [], isLoading: ciLoading } = useCheckIns(clientId)
  const { data: customValues = [], isLoading: cvLoading } = useCustomMetricValues(clientId)
  const { data: definitions = [] } = useMetricDefinitions()
  const deleteCheckIn = useDeleteCheckIn()
  const deleteCustom  = useDeleteCustomMetricValue()

  const [showLogCI, setShowLogCI]     = useState(false)
  const [showLogCustom, setShowLogCustom] = useState(false)
  const [expandedCI, setExpandedCI]   = useState(false)

  // Group custom values by definition
  const customByDef = useMemo(() => {
    const map = new Map<string, typeof customValues>()
    for (const v of customValues) {
      const key = v.definition_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    }
    return map
  }, [customValues])

  if (ciLoading || cvLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-amber-400" /></div>
  }

  return (
    <div className="space-y-6">
      {showLogCI && (
        <LogCheckInModal clientId={clientId} onClose={() => setShowLogCI(false)} onSaved={() => setShowLogCI(false)} />
      )}
      {showLogCustom && definitions.length > 0 && (
        <LogCustomMetricModal
          clientId={clientId}
          definitions={definitions}
          onClose={() => setShowLogCustom(false)}
          onSaved={() => setShowLogCustom(false)}
        />
      )}

      {/* ── Unified Metrics ── */}
      <div className="bg-[#161b27] rounded-2xl border border-[#242d40] shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LineChart size={16} className="text-emerald-500" />
            <h3 className="font-semibold text-[#e8edf5]">Metrics</h3>
            {checkIns.length > 0 && (
              <span className="text-xs text-[#3a4a62]">{checkIns.length} check-ins</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {definitions.length > 0 && (
              <button onClick={() => setShowLogCustom(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-lg hover:from-amber-400 hover:to-amber-300 transition-all">
                <Plus size={12} />Log Metric
              </button>
            )}
            <button onClick={() => setShowLogCI(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all">
              <Plus size={12} />Log Check-in
            </button>
          </div>
        </div>

        {checkIns.length === 0 && customValues.length === 0 ? (
          <p className="text-sm text-[#3a4a62] text-center py-6">No metrics logged yet. Log a check-in to start tracking progress.</p>
        ) : (
          <>
            {/* All metric cards in a unified grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Built-in check-in metric cards */}
              {CHECKIN_METRICS.map(m => {
                const series = checkIns.filter(c => c[m.key] != null)
                if (series.length === 0) return null
                const latestVal = series[series.length - 1][m.key] as number
                const sparkVals = series.map(c => c[m.key] as number)
                const trend = series.length > 1 ? sparkVals[sparkVals.length - 1] - sparkVals[0] : null
                return (
                  <div key={m.key} className="rounded-xl bg-[#0d1117] border border-[#242d40] p-3">
                    <div className="flex items-center gap-3">
                      <span className={clsx('flex-shrink-0', m.color)}>{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#e8edf5]">{m.label}</p>
                          {trend != null && (
                            <span className={clsx('text-[10px] font-semibold', trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-rose-500' : 'text-[#3a4a62]')}>
                              {trend > 0 ? '+' : ''}{trend.toFixed(1)}{m.unit}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#3a4a62]">{series.length} entries · latest: <strong>{latestVal}{m.unit}</strong></p>
                      </div>
                      <MiniSparkline values={sparkVals} color="#10b981" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {series.slice(-6).reverse().map(c => (
                        <div key={c.id} className="flex items-center gap-1 bg-[#161b27] border border-[#242d40] rounded-lg px-2 py-1 text-[10px]">
                          <span className="text-[#4a5a75]">{new Date(c.checked_in_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                          <span className="font-bold text-[#8a9ab5]">{c[m.key]}{m.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Custom metric cards */}
              {definitions.filter(d => customByDef.has(d.id)).map(def => {
                const vals = [...(customByDef.get(def.id) ?? [])].reverse()
                const latestCustom = vals[vals.length - 1]
                const sparkVals = vals.map(v => v.value)
                const trend = vals.length > 1 ? sparkVals[sparkVals.length - 1] - sparkVals[0] : null
                return (
                  <div key={def.id} className="rounded-xl bg-[#0d1117] border border-[#242d40] p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{def.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#e8edf5]">{def.name}</p>
                          {trend != null && (
                            <span className={clsx('text-[10px] font-semibold', trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-rose-500' : 'text-[#3a4a62]')}>
                              {trend > 0 ? '+' : ''}{trend.toFixed(1)}{def.unit}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#3a4a62]">{vals.length} entries · latest: <strong>{latestCustom.value}{def.unit}</strong></p>
                      </div>
                      <MiniSparkline values={sparkVals} color="#6366f1" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[...customByDef.get(def.id)!].slice(0, 6).map(v => (
                        <div key={v.id} className="group flex items-center gap-1 bg-[#161b27] border border-[#242d40] rounded-lg px-2 py-1 text-[10px]">
                          <span className="text-[#4a5a75]">{new Date(v.logged_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                          <span className="font-bold text-[#8a9ab5]">{v.value}{def.unit}</span>
                          <button onClick={() => deleteCustom.mutate({ id: v.id, clientId })}
                            className="opacity-0 group-hover:opacity-100 text-[#2e3a52] hover:text-rose-500 transition-all ml-0.5">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Check-in history */}
            {checkIns.length > 0 && (
              <div>
                <button onClick={() => setExpandedCI(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-[#3a4a62] hover:text-[#8a9ab5] transition-colors mb-2">
                  <ChevronDown size={13} className={clsx('transition-transform', expandedCI && 'rotate-180')} />
                  {expandedCI ? 'Hide' : 'Show'} check-in history
                </button>
                {expandedCI && (
                  <div className="space-y-1">
                    {checkIns.map(ci => (
                      <div key={ci.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#0d1117] transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#8a9ab5]">
                            {new Date(ci.checked_in_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <div className="flex gap-3 mt-0.5 flex-wrap">
                            {ci.weight_kg != null && <span className="text-[10px] text-[#3a4a62]">{ci.weight_kg}kg</span>}
                            {ci.body_fat_pct != null && <span className="text-[10px] text-[#3a4a62]">{ci.body_fat_pct}% bf</span>}
                            {ci.energy_level != null && <span className="text-[10px] text-[#3a4a62]">⚡{ci.energy_level}/10</span>}
                            {ci.sleep_hours != null && <span className="text-[10px] text-[#3a4a62]">😴{ci.sleep_hours}h</span>}
                            {ci.notes && <span className="text-[10px] text-[#3a4a62] italic truncate max-w-[140px]">"{ci.notes}"</span>}
                          </div>
                        </div>
                        <button onClick={() => deleteCheckIn.mutate({ id: ci.id, clientId })}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#2e3a52] hover:text-rose-500 hover:bg-rose-400/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Nutrition Tab ─────────────────────────────────────────────
function NutritionTab({ clientId, orgId }: { clientId: string; orgId: string }) {
  const { data: plan, isLoading } = useNutritionPlan(clientId)
  const upsert = useUpsertNutritionPlan()

  const [mfpUsername,     setMfpUsername]     = useState(plan?.mfp_username     ?? '')
  const [caloriesTarget,  setCaloriesTarget]  = useState(plan?.calories_target?.toString() ?? '')
  const [proteinG,        setProteinG]        = useState(plan?.protein_g?.toString()       ?? '')
  const [carbsG,          setCarbsG]          = useState(plan?.carbs_g?.toString()         ?? '')
  const [fatG,            setFatG]            = useState(plan?.fat_g?.toString()           ?? '')
  const [notes,           setNotes]           = useState(plan?.notes            ?? '')
  const [saved,           setSaved]           = useState(false)

  // Sync form when plan loads
  useEffect(() => {
    if (plan) {
      setMfpUsername(plan.mfp_username ?? '')
      setCaloriesTarget(plan.calories_target?.toString() ?? '')
      setProteinG(plan.protein_g?.toString() ?? '')
      setCarbsG(plan.carbs_g?.toString() ?? '')
      setFatG(plan.fat_g?.toString() ?? '')
      setNotes(plan.notes ?? '')
    }
  }, [plan])

  async function handleSave() {
    await upsert.mutateAsync({
      client_id:       clientId,
      org_id:          orgId,
      mfp_username:    mfpUsername.trim()   || null,
      calories_target: caloriesTarget ? parseInt(caloriesTarget) : null,
      protein_g:       proteinG       ? parseInt(proteinG)       : null,
      carbs_g:         carbsG         ? parseInt(carbsG)         : null,
      fat_g:           fatG           ? parseInt(fatG)           : null,
      notes:           notes.trim()   || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const diaryUrl = mfpUsername.trim()
    ? `https://www.myfitnesspal.com/food/diary/${mfpUsername.trim()}`
    : null

  if (isLoading) {
    return <div className="py-16 text-center"><Loader2 size={24} className="animate-spin text-[#3a4a62] mx-auto" /></div>
  }

  return (
    <div className="space-y-6">
      {/* MFP link preview */}
      {diaryUrl && (
        <a
          href={diaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium hover:bg-rose-100 transition-colors"
        >
          <ExternalLink size={18} />
          <span>Client's MFP Diary</span>
          <span className="ml-auto text-xs text-rose-400 truncate max-w-[200px]">{diaryUrl}</span>
        </a>
      )}

      {/* Form */}
      <div className="bg-[#161b27] rounded-2xl border border-[#242d40] divide-y divide-[#1e2535]">
        {/* MFP Username */}
        <div className="p-5 space-y-2">
          <label className="text-sm font-semibold text-[#8a9ab5]">MyFitnessPal Username</label>
          <input
            type="text"
            value={mfpUsername}
            onChange={e => setMfpUsername(e.target.value)}
            placeholder="e.g. john_doe"
            className="w-full border border-[#242d40] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          {mfpUsername.trim() && (
            <p className="text-xs text-[#3a4a62]">
              Diary URL: <span className="text-[#8a9ab5]">https://www.myfitnesspal.com/food/diary/{mfpUsername.trim()}</span>
            </p>
          )}
        </div>

        {/* Daily Targets */}
        <div className="p-5 space-y-3">
          <p className="text-sm font-semibold text-[#8a9ab5]">Daily Targets</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calories (kcal)', value: caloriesTarget, onChange: setCaloriesTarget },
              { label: 'Protein (g)',     value: proteinG,       onChange: setProteinG       },
              { label: 'Carbs (g)',       value: carbsG,         onChange: setCarbsG         },
              { label: 'Fat (g)',         value: fatG,           onChange: setFatG           },
            ].map(field => (
              <div key={field.label} className="space-y-1">
                <label className="text-xs text-[#4a5a75]">{field.label}</label>
                <input
                  type="number"
                  min={0}
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  placeholder="—"
                  className="w-full border border-[#242d40] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="p-5 space-y-2">
          <label className="text-sm font-semibold text-[#8a9ab5]">Nutrition Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder="Meal plan, food guidance, dietary restrictions..."
            className="w-full border border-[#242d40] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={upsert.isPending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d1117] text-white text-sm font-medium hover:bg-[#1e2535] disabled:opacity-50 transition-colors"
      >
        {upsert.isPending ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
        {saved ? 'Saved!' : 'Save Nutrition Plan'}
      </button>
    </div>
  )
}

// ─── Placeholder tab ──────────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-[#161b27] flex items-center justify-center mx-auto mb-4">
        <Dumbbell size={28} className="text-[#2e3a52]" />
      </div>
      <p className="text-[#4a5a75] font-medium">{label}</p>
      <p className="text-xs text-[#3a4a62] mt-1">Coming soon</p>
    </div>
  )
}

// ─── Habits Section ────────────────────────────────────────────

const HABIT_EMOJIS = ['✅','💧','🥗','🏃','🧘','😴','💊','📖','🚶','🍎','🧘‍♀️','🎯','🔥','⚡','🌿']
const HABIT_FREQS: { value: 'daily' | 'weekdays' | 'weekends' | 'weekly'; label: string }[] = [
  { value: 'daily',    label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekly',   label: 'Weekly' },
]

function HabitsSection({ clientId }: { clientId: string }) {
  const { data: habits = [], isLoading } = useHabits(clientId)
  const createHabit = useCreateHabit()
  const deleteHabit = useDeleteHabit()

  const [showForm, setShowForm]         = useState(false)
  const [name, setName]                 = useState('')
  const [emoji, setEmoji]               = useState('✅')
  const [frequency, setFrequency]       = useState<'daily' | 'weekdays' | 'weekends' | 'weekly'>('daily')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return
    await createHabit.mutateAsync({ client_id: clientId, name, emoji, frequency })
    setName(''); setEmoji('✅'); setFrequency('daily'); setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#e8edf5]">Habits</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs text-amber-400 font-semibold hover:text-amber-400 transition-colors">
          <Plus size={13} /> Add habit
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-3 p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl space-y-2.5">
          <div className="flex flex-wrap gap-1">
            {HABIT_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={clsx('w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                  emoji === e ? 'bg-amber-400/20 ring-2 ring-amber-400 scale-110' : 'hover:bg-amber-400/10')}>
                {e}
              </button>
            ))}
          </div>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Habit name (e.g. Drink 2L water)…"
            className="w-full text-sm px-3 py-2 border border-[#242d40] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
          <div className="flex gap-1 flex-wrap">
            {HABIT_FREQS.map(f => (
              <button key={f.value} onClick={() => setFrequency(f.value)}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                  frequency === f.value ? 'bg-amber-400 text-white' : 'bg-[#161b27] border border-[#242d40] text-[#8a9ab5] hover:bg-[#0d1117]')}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!name.trim() || createHabit.isPending}
              className="px-3 py-1.5 bg-amber-400 text-white text-xs font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-40 flex items-center gap-1.5">
              {createHabit.isPending && <Loader2 size={12} className="animate-spin" />} Save
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-[#3a4a62] text-xs hover:text-[#8a9ab5]">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-[#2e3a52]" /></div>
      ) : habits.length === 0 && !showForm ? (
        <p className="text-sm text-[#3a4a62] text-center py-4">No habits yet</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {habits.map(h => (
            <div key={h.id} className="flex items-center gap-2.5 p-2.5 bg-[#0d1117] rounded-xl group hover:bg-[#161b27] transition-colors">
              <span className="text-lg flex-shrink-0">{h.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#8a9ab5] truncate">{h.name}</p>
                <p className="text-xs text-[#3a4a62] capitalize">{HABIT_FREQS.find(f => f.value === h.frequency)?.label}</p>
              </div>
              {pendingDelete === h.id ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => deleteHabit.mutate({ id: h.id, clientId })}
                    className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">Del</button>
                  <button onClick={() => setPendingDelete(null)}
                    className="text-[10px] text-[#3a4a62] px-1.5 py-0.5 rounded font-bold">No</button>
                </div>
              ) : (
                <button onClick={() => setPendingDelete(h.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#2e3a52] hover:text-red-400 transition-all flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab]     = useState<Tab>('overview')
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set(['overview']))
  const [showEdit, setShowEdit]       = useState(false)
  const [copied, setCopied]           = useState(false)
  const [showReport, setShowReport]   = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  async function handleArchive() {
    if (!id || !client) return
    setMenuOpen(false)
    await updateClient.mutateAsync({ id, status: client.status === 'inactive' ? 'active' : 'inactive' })
  }

  async function handleDelete() {
    if (!id) return
    setDeleteLoading(true)
    try {
      await deleteClient.mutateAsync(id)
      navigate('/clients')
    } finally {
      setDeleteLoading(false)
    }
  }

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
        <Loader2 size={24} className="animate-spin text-[#2e3a52]" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#4a5a75]">Client not found.</p>
        <Link to="/clients" className="text-amber-400 mt-2 inline-block hover:underline">Back to clients</Link>
      </div>
    )
  }

  const initials = client.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const pendingTasks = tasks.filter(t => !t.completed).length

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'plan',      label: 'Plan' },
    { key: 'workouts',  label: 'Workouts' },
    { key: 'history',   label: 'History' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'metrics',   label: 'Metrics' },
    { key: 'notes',     label: 'Notes' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {showEdit   && <EditClientModal client={client} onClose={() => setShowEdit(false)} />}
      {showReport && <ProgressReport  client={client} onClose={() => setShowReport(false)} />}

      {/* Back */}
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-[#4a5a75] hover:text-[#8a9ab5] transition-colors">
        <ArrowLeft size={16} />
        Back to Clients
      </Link>

      {/* Profile header */}
      <div className="bg-[#161b27] rounded-2xl border border-[#242d40] shadow-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-300 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-2xl font-bold text-[#e8edf5]">{client.name}</h2>
              <span className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit',
                client.status === 'active'   && 'bg-emerald-50 text-emerald-700',
                client.status === 'pending'  && 'bg-amber-50 text-amber-700',
                client.status === 'inactive' && 'bg-[#161b27] text-[#8a9ab5]',
              )}>
                <span className={clsx('w-1.5 h-1.5 rounded-full',
                  client.status === 'active'   && 'bg-emerald-500',
                  client.status === 'pending'  && 'bg-amber-500',
                  client.status === 'inactive' && 'bg-[#3a4a62]',
                )} />
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {client.email && (
                <div className="flex items-center gap-1.5 text-sm text-[#4a5a75]">
                  <Mail size={14} />{client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5 text-sm text-[#4a5a75]">
                  <Phone size={14} />{client.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-[#4a5a75]">
                <Calendar size={14} />
                Joined {new Date(client.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
            {client.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {client.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#161b27] text-[#8a9ab5] rounded-full text-xs">
                    <Tag size={10} />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share portal link */}
            <div className="flex items-center gap-1 bg-[#0d1117] border border-[#242d40] rounded-xl overflow-hidden">
              <button
                onClick={copyPortalLink}
                title="Copy client portal link"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#8a9ab5] hover:bg-[#161b27] transition-colors"
              >
                {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <div className="w-px h-5 bg-[#1e2535]" />
              <button
                onClick={openPortal}
                title="Open client portal"
                className="px-2.5 py-2 text-[#4a5a75] hover:bg-[#161b27] transition-colors"
              >
                <ExternalLink size={13} />
              </button>
            </div>
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#161b27] text-[#8a9ab5] text-sm font-semibold rounded-xl hover:bg-[#1e2535] transition-colors"
            >
              <FileText size={15} />
              Report
            </button>
            <button
              onClick={openMessage}
              disabled={getOrCreate.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-300 text-white text-sm font-semibold rounded-xl hover:from-amber-400 hover:to-amber-300 transition-all shadow-sm disabled:opacity-60"
            >
              {getOrCreate.isPending
                ? <Loader2 size={15} className="animate-spin" />
                : <MessageSquare size={15} />
              }
              Message
            </button>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-2 rounded-xl border border-[#242d40] text-[#4a5a75] hover:bg-[#0d1117] transition-colors"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#161b27] rounded-xl shadow-lg border border-[#242d40] py-1 z-20">
                  <button
                    onClick={() => { setMenuOpen(false); setShowEdit(true) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#8a9ab5] hover:bg-[#0d1117] transition-colors"
                  >
                    <MoreHorizontal size={15} className="text-[#3a4a62]" />
                    Edit Details
                  </button>
                  <button
                    onClick={handleArchive}
                    disabled={updateClient.isPending}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#8a9ab5] hover:bg-[#0d1117] transition-colors disabled:opacity-50"
                  >
                    <Archive size={15} className="text-amber-500" />
                    {client?.status === 'inactive' ? 'Unarchive' : 'Archive'}
                  </button>
                  <div className="my-1 border-t border-[#242d40]" />
                  <button
                    onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-rose-600 hover:bg-rose-400/10 transition-colors"
                  >
                    <Trash2 size={15} />
                    Delete Client
                  </button>
                </div>
              )}
            </div>

            {/* Delete confirm modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
                  <div className="flex flex-col items-center text-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                      <AlertTriangle size={22} className="text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#e8edf5]">Delete {client?.name}?</h3>
                      <p className="text-sm text-[#4a5a75] mt-1">This will permanently remove the client and all their data. This cannot be undone.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors"
                    >
                      {deleteLoading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Status',        value: client.status.charAt(0).toUpperCase() + client.status.slice(1), icon: <span className={clsx('w-3 h-3 rounded-full', client.status === 'active' ? 'bg-emerald-500' : client.status === 'pending' ? 'bg-amber-500' : 'bg-[#3a4a62]')} /> },
          { label: 'Category',      value: client.category ?? '—',     icon: <Tag size={16} className="text-amber-400" /> },
          { label: 'Group',         value: client.group_name ?? '—',   icon: <ChevronDown size={16} className="text-violet-500" /> },
          { label: 'Pending Tasks', value: loadingTasks ? '—' : pendingTasks, icon: <Clock size={16} className="text-amber-500" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-[#161b27] rounded-2xl border border-[#242d40] p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1.5">{stat.icon}<span className="text-xs text-[#4a5a75]">{stat.label}</span></div>
            <p className="text-lg font-bold text-[#e8edf5]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-[#161b27] rounded-2xl border border-[#242d40] shadow-card overflow-hidden">
        <div className="border-b border-[#242d40]">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setMountedTabs(prev => new Set([...prev, tab.key])); setActiveTab(tab.key) }}
                className={clsx(
                  'flex-shrink-0 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-[#4a5a75] hover:text-[#8a9ab5]',
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
                <h3 className="font-semibold text-[#e8edf5]">Client Info</h3>
                <div className="space-y-1">
                  {[
                    { label: 'Primary Goal', value: client.goal },
                    { label: 'Category',     value: client.category },
                    { label: 'Group',        value: client.group_name },
                    { label: 'Email',        value: client.email },
                    { label: 'Phone',        value: client.phone },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-[#1e2535]">
                      <span className="text-sm text-[#4a5a75]">{item.label}</span>
                      <span className="text-sm font-medium text-[#e8edf5]">{item.value || '—'}</span>
                    </div>
                  ))}
                </div>

                <ProgramSection clientId={client.id} />
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#e8edf5]">Tasks</h3>
                  <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                    {pendingTasks} pending
                  </span>
                </div>

                {loadingTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-[#2e3a52]" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-xl hover:bg-[#161b27] transition-colors">
                          <button
                            onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
                            className={clsx(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200'
                                : 'border-[#2e3a52] hover:border-amber-400',
                            )}
                          >
                            {task.completed && <CheckCircle2 size={11} className="text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-sm font-medium truncate', task.completed ? 'line-through text-[#3a4a62]' : 'text-[#8a9ab5]')}>
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-xs text-[#3a4a62] flex items-center gap-1 mt-0.5">
                                <Clock size={10} />
                                {new Date(task.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <p className="text-sm text-[#3a4a62] text-center py-4">No tasks yet</p>
                      )}
                    </div>
                    <AddTaskRow clientId={client.id} />
                  </>
                )}
              </div>

              {/* Habits */}
              <div>
                <HabitsSection clientId={client.id} />
              </div>

              {/* Portal Access — spans full width */}
              <div className="lg:col-span-2 border-t border-[#242d40] pt-6">
                <PortalAccessCard client={client} />
              </div>

              {/* Community Courses — spans full width */}
              <div className="lg:col-span-2 border-t border-[#242d40] pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#e8edf5] flex items-center gap-2">
                    <BookOpen size={16} className="text-violet-500" /> Community Courses
                  </h3>
                </div>
                <CoursesSection client={client} />
              </div>
            </div>
          )}

          {mountedTabs.has('plan')      && <div className={activeTab !== 'plan'      ? 'hidden' : ''}><PlanTab clientId={client.id} /></div>}
          {mountedTabs.has('workouts')  && <div className={activeTab !== 'workouts'  ? 'hidden' : ''}><WorkoutsTab clientId={client.id} /></div>}
          {mountedTabs.has('history')   && <div className={activeTab !== 'history'   ? 'hidden' : ''}><HistoryTab clientId={client.id} /></div>}
          {mountedTabs.has('nutrition') && <div className={activeTab !== 'nutrition' ? 'hidden' : ''}><NutritionTab clientId={client.id} orgId={client.org_id} /></div>}
          {mountedTabs.has('metrics')   && <div className={activeTab !== 'metrics'   ? 'hidden' : ''}><MetricsTab clientId={client.id} /></div>}
          {mountedTabs.has('notes')     && <div className={activeTab !== 'notes'     ? 'hidden' : ''}><ComingSoon label="Coach notes" /></div>}
        </div>
      </div>
    </div>
  )
}
