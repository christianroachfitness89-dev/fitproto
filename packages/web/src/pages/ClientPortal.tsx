import { useState, useEffect, useRef, useMemo } from 'react'
import type React from 'react'
import { useParams } from 'react-router-dom'
import {
  Dumbbell, CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp,
  Loader2, Target, ClipboardList, ArrowLeft, Lock,
  BarChart2, Utensils, History, TrendingUp, Scale, Zap, Moon, ChevronRight, ChevronLeft,
  X, Home, Menu, MessageCircle, Settings, Send, GripVertical,
  Users2, Heart, BookOpen, Video, Headphones, FileText, AlignLeft, ExternalLink,
  Download, Eye, EyeOff, Check, Repeat2, Play, Plus,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { playRestEndChime } from '@/lib/sound'
import clsx from 'clsx'

// ─── Types ─────────────────────────────────────────────────────
type ActiveSection = 'workouts' | 'history' | 'metrics' | 'nutrition' | 'messages' | 'plan' | 'community' | 'habits' | 'accountability' | null

interface PortalSessionTask {
  id: string
  name: string
  punishment: string
  completed: boolean | null
  punishment_notes: string
}
interface PortalSessionLog {
  id: string
  session_date: string
  workout_type: string | null
  tasks: PortalSessionTask[]
  reviewed_at?: string | null
}
interface PortalAccountabilityData {
  open_sessions:    PortalSessionLog[]
  recent_completed: PortalSessionLog[]
}

interface PortalMessage {
  id: string
  conversation_id: string
  sender_type: string
  content: string
  read: boolean
  created_at: string
}

interface PortalWorkout {
  id: string
  status: 'assigned' | 'completed' | 'skipped'
  assigned_at: string
  due_date: string | null
  notes: string | null
  workout: {
    id: string
    name: string
    description: string | null
    difficulty: 'beginner' | 'intermediate' | 'advanced' | null
    category: string | null
    duration_minutes: number | null
  }
}

interface PortalProgramSlot {
  week_number: number
  day_number: number
  workout: {
    id: string
    name: string
    difficulty: string | null
    duration_minutes: number | null
  }
}

interface PortalProgram {
  id: string
  name: string
  duration_weeks: number | null
  start_date: string | null
  schedule: PortalProgramSlot[]
}

interface PortalData {
  name: string
  status: string
  goal: string | null
  workouts: PortalWorkout[]
  portal_sections: string[]
  program?: PortalProgram | null
}

interface PortalSet {
  set_number: number
  reps: number | null
  weight: number | null
  duration_seconds: number | null
  distance_meters: number | null
  rest_seconds: number | null
  last_reps: number | null
  last_weight: number | null
  suggested_weight: number | null
}

interface PortalExercise {
  id: string
  name: string
  order_index: number
  metric_type: string
  muscle_group: string | null
  equipment: string | null
  video_url: string | null
  progression_type: string | null
  progression_value: number | null
  sets: PortalSet[] | null
}

interface PortalWorkoutDetail {
  client_workout_id: string
  workout_name: string
  workout_description: string | null
  exercises: PortalExercise[] | null
}

interface PortalHistoryEntry {
  id: string
  completed_at: string
  notes: string | null
  workout_name: string
  set_count: number
  exercises: string[]
}

interface PortalSessionSet {
  set_number: number
  reps_achieved: number | null
  weight_used: number | null
  duration_seconds: number | null
  distance_meters: number | null
  rpe: number | null
}

interface PortalSessionExercise {
  exercise_id: string
  name: string
  muscle_group: string | null
  metric_type: string
  order_index: number
  sets: PortalSessionSet[]
}

interface PortalSessionDetail {
  workout_name: string
  completed_at: string
  notes: string | null
  exercises: PortalSessionExercise[]
}

interface PortalHabit {
  id: string
  name: string
  description: string | null
  emoji: string
  frequency: string
  completed_today: boolean
  streak: number
  metric_definition_id: string | null
  metric_name: string | null
  metric_unit: string | null
  metric_emoji: string | null
}

interface PortalTask {
  id: string
  title: string
  type: string | null
  due_date: string | null
  completed: boolean
  metric_definition_id: string | null
  metric_name: string | null
  metric_unit: string | null
  metric_emoji: string | null
}

interface PortalMetricEntry {
  id: string
  checked_in_at: string
  weight_kg: number | null
  body_fat_pct: number | null
  energy_level: number | null
  sleep_hours: number | null
  notes: string | null
}

// ─── Constants ─────────────────────────────────────────────────
const DIFFICULTY_COLORS = {
  beginner:     'bg-emerald-500/20 text-emerald-300',
  intermediate: 'bg-amber-500/20 text-amber-300',
  advanced:     'bg-rose-500/20 text-rose-300',
}

const SECTION_DEFS = [
  {
    id:       'workouts' as const,
    label:    'Workouts',
    desc:     'Your training sessions',
    icon:     Dumbbell,
    gradient: 'from-violet-600 to-brand-600',
    glow:     'shadow-violet-500/40',
    bg:       'bg-violet-500/10',
  },
  {
    id:       'history' as const,
    label:    'History',
    desc:     'Past sessions & logs',
    icon:     History,
    gradient: 'from-amber-500 to-orange-500',
    glow:     'shadow-amber-500/40',
    bg:       'bg-amber-500/10',
  },
  {
    id:       'metrics' as const,
    label:    'Metrics',
    desc:     'Progress & measurements',
    icon:     BarChart2,
    gradient: 'from-emerald-500 to-teal-500',
    glow:     'shadow-emerald-500/40',
    bg:       'bg-emerald-500/10',
  },
  {
    id:       'nutrition' as const,
    label:    'Nutrition',
    desc:     'Meal plans & guidance',
    icon:     Utensils,
    gradient: 'from-rose-500 to-pink-500',
    glow:     'shadow-rose-500/40',
    bg:       'bg-rose-500/10',
  },
  {
    id:       'accountability' as const,
    label:    'Accountability',
    desc:     'Tasks & commitments',
    icon:     Zap,
    gradient: 'from-orange-500 to-rose-500',
    glow:     'shadow-orange-500/40',
    bg:       'bg-orange-500/10',
  },
]

type SetEntry = { reps: string; weight: string; duration: string; distance: string; rpe: string }

// ─── Rest timer overlay ────────────────────────────────────────
function RestTimer({ restSeconds, label, onDone }: {
  restSeconds: number
  label: string
  onDone: () => void
}) {
  const [remaining, setRemaining] = useState(restSeconds)

  useEffect(() => {
    if (remaining <= 0) { playRestEndChime(); onDone(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const circumference = 2 * Math.PI * 64
  const strokeOffset  = circumference * (1 - (restSeconds > 0 ? remaining / restSeconds : 0))
  const mins    = Math.floor(remaining / 60)
  const secs    = remaining % 60
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}`

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#060616]/98 backdrop-blur-xl">
      <p className="text-brand-400/70 text-[10px] font-bold uppercase tracking-[0.25em] mb-1">Rest Period</p>
      <p className="text-white/50 text-sm font-medium mb-2 max-w-[240px] text-center px-4 leading-relaxed">{label}</p>
      <p className="text-white/20 text-[10px] uppercase tracking-widest font-semibold mb-6">Time remaining</p>

      <div className="relative w-56 h-56">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r="64" stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
          <circle cx="80" cy="80" r="64"
            stroke="url(#timerGrad)" strokeWidth="10" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 0.85s linear' }} />
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-black text-white tabular-nums leading-none">{display}</span>
          <span className="text-white/25 text-[10px] uppercase tracking-widest font-semibold mt-1">seconds</span>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => setRemaining(r => Math.max(0, r - 15))}
          className="w-12 h-12 rounded-2xl bg-white/8 hover:bg-white/15 text-white/60 hover:text-white text-sm font-bold transition-all border border-white/10 flex items-center justify-center hover:scale-105 active:scale-95"
        >−15</button>
        <button
          onClick={onDone}
          className="px-8 py-3 bg-white/10 hover:bg-white/18 text-white/80 hover:text-white text-sm font-semibold rounded-full transition-all border border-white/15"
        >Skip</button>
        <button
          onClick={() => setRemaining(r => r + 15)}
          className="w-12 h-12 rounded-2xl bg-white/8 hover:bg-white/15 text-white/60 hover:text-white text-sm font-bold transition-all border border-white/10 flex items-center justify-center hover:scale-105 active:scale-95"
        >+15</button>
      </div>
    </div>
  )
}

// ─── Accountability section ────────────────────────────────────
function AccountabilityView({ data }: { data: PortalAccountabilityData | null }) {
  const bg = 'min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040]'

  if (!data) return (
    <div className={bg + ' flex items-center justify-center'}>
      <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const openSessions    = data.open_sessions    ?? []
  const completedSessions = data.recent_completed ?? []

  function taskStatusIcon(t: PortalSessionTask) {
    if (t.completed === true)  return <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0"><CheckCircle2 size={12} className="text-emerald-400" /></span>
    if (t.completed === false) return <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0"><X size={12} className="text-rose-400" /></span>
    return <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex-shrink-0" />
  }

  return (
    <div className={bg}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-5 border-b border-white/8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base">Accountability</p>
          <p className="text-white/35 text-xs">Your commitments &amp; outcomes</p>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-6 mt-5">

        {/* Active commitments */}
        {openSessions.length > 0 ? (
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Active Commitments</p>
            <div className="space-y-3">
              {openSessions.map(session => (
                <div key={session.id} className="rounded-2xl bg-white/6 border border-white/10 overflow-hidden">
                  {/* Session meta */}
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-bold">
                        {session.workout_type ?? 'PT Session'}
                      </p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full">
                      Pending review
                    </span>
                  </div>
                  {/* Tasks */}
                  <div className="px-4 pb-4 space-y-2">
                    {session.tasks.map(task => (
                      <div key={task.id} className="bg-white/4 border border-white/8 rounded-xl p-3">
                        <div className="flex items-start gap-2.5">
                          {taskStatusIcon(task)}
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-sm font-semibold leading-snug">{task.name}</p>
                            {task.punishment && (
                              <p className="text-rose-400/70 text-xs mt-1 flex items-start gap-1">
                                <Zap size={10} className="flex-shrink-0 mt-px" />
                                {task.punishment}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-white/8 p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <p className="text-white/70 font-semibold">All clear!</p>
            <p className="text-white/30 text-sm mt-1">No active commitments from your coach right now.</p>
          </div>
        )}

        {/* Completed history */}
        {completedSessions.length > 0 && (
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Recent History</p>
            <div className="space-y-3">
              {completedSessions.map(session => {
                const failed = session.tasks.filter(t => t.completed === false)
                const done   = session.tasks.filter(t => t.completed === true)
                return (
                  <div key={session.id} className="rounded-2xl bg-white/6 border border-white/10 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm font-bold">
                          {session.workout_type ?? 'PT Session'}
                        </p>
                        <p className="text-white/30 text-xs mt-0.5">
                          {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={clsx(
                        'text-[11px] font-bold border px-2 py-0.5 rounded-full',
                        failed.length > 0
                          ? 'bg-rose-500/20 text-rose-300 border-rose-400/20'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/20'
                      )}>
                        {done.length}/{session.tasks.length} done
                      </span>
                    </div>
                    <div className="px-4 pb-4 space-y-2">
                      {session.tasks.map(task => (
                        <div key={task.id} className={clsx(
                          'border rounded-xl p-3',
                          task.completed === true  ? 'bg-emerald-500/8 border-emerald-500/15' :
                          task.completed === false ? 'bg-rose-500/8 border-rose-500/15' :
                          'bg-white/4 border-white/8'
                        )}>
                          <div className="flex items-start gap-2.5">
                            {taskStatusIcon(task)}
                            <div className="flex-1 min-w-0">
                              <p className={clsx(
                                'text-sm font-semibold leading-snug',
                                task.completed === true  ? 'text-emerald-300 line-through opacity-70' :
                                task.completed === false ? 'text-white/80' : 'text-white/60'
                              )}>
                                {task.name}
                              </p>
                              {/* Failed — show punishment + evidence if recorded */}
                              {task.completed === false && (
                                <div className="mt-1.5 space-y-1">
                                  <p className="text-rose-400/80 text-xs flex items-start gap-1">
                                    <Zap size={10} className="flex-shrink-0 mt-px" />
                                    {task.punishment}
                                  </p>
                                  {task.punishment_notes && (
                                    <p className="text-white/30 text-xs bg-white/4 rounded-lg px-2.5 py-1.5 border border-white/8">
                                      {task.punishment_notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Log session overlay ───────────────────────────────────────
function PortalLogOverlay({ cw, clientId, onClose, onDone }: {
  cw: PortalWorkout
  clientId: string
  onClose: () => void
  onDone: (id: string) => void
}) {
  const [detail, setDetail]         = useState<PortalWorkoutDetail | null>(null)
  const [loading, setLoading]       = useState(true)
  const [entries, setEntries]       = useState<Record<string, SetEntry>>({})
  const [doneSets, setDoneSets]     = useState<Set<string>>(new Set())
  const [restTimer, setRestTimer]   = useState<{ restSeconds: number; label: string } | null>(null)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [notes, setNotes]           = useState('')
  const [completedAt, setCompletedAt] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const [activeExIdx, setActiveExIdx] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [extraSets, setExtraSets]     = useState<Record<string, number>>({})
  const [videoOpen, setVideoOpen]     = useState(false)

  useEffect(() => {
    supabase.rpc('get_portal_workout_detail', {
      p_client_workout_id: cw.id, p_client_id: clientId,
    }).then(({ data, error: err }) => {
      if (!err && data) {
        const d = data as PortalWorkoutDetail
        setDetail(d)
        const init: Record<string, SetEntry> = {}
        for (const ex of d.exercises ?? [])
          for (const s of ex.sets ?? [])
            init[`${ex.id}-${s.set_number}`] = { reps: '', weight: '', duration: '', distance: '', rpe: '' }
        setEntries(init)
      }
      setLoading(false)
    })
  }, [cw.id, clientId])

  function setField(key: string, field: keyof SetEntry, value: string) {
    setEntries(prev => ({ ...prev, [key]: { ...(prev[key] ?? { reps: '', weight: '', duration: '', distance: '', rpe: '' }), [field]: value } }))
  }

  function handleSetDone(key: string, exerciseName: string, setNumber: number, restSeconds: number) {
    setDoneSets(prev => new Set([...prev, key]))
    if (restSeconds > 0) setRestTimer({ restSeconds, label: `${exerciseName} — Set ${setNumber} complete` })
  }

  function getAllSets(ex: PortalExercise): PortalSet[] {
    const base  = ex.sets ?? []
    const extra = extraSets[ex.id] ?? 0
    if (!extra) return base
    const last = base[base.length - 1]
    return [
      ...base,
      ...Array.from({ length: extra }, (_, i) => ({
        set_number:       base.length + i + 1,
        reps:             last?.reps ?? null,
        weight:           last?.weight ?? null,
        duration_seconds: last?.duration_seconds ?? null,
        distance_meters:  last?.distance_meters ?? null,
        rest_seconds:     last?.rest_seconds ?? null,
        last_reps:        null as number | null,
        last_weight:      null as number | null,
        suggested_weight: last?.suggested_weight ?? last?.weight ?? null,
      } as PortalSet)),
    ]
  }

  function markAllSets(ex: PortalExercise) {
    getAllSets(ex).forEach(s => {
      const key = `${ex.id}-${s.set_number}`
      setDoneSets(prev => new Set([...prev, key]))
    })
  }

  async function submit() {
    setError(null); setSaving(true)
    const exList = detail?.exercises ?? []
    const setLogs = exList.flatMap(ex =>
      getAllSets(ex).map(s => {
        const e = entries[`${ex.id}-${s.set_number}`] ?? {} as SetEntry
        return {
          workout_exercise_id: ex.id,
          set_number:          s.set_number,
          reps_achieved:       e.reps     ?? '',
          weight_used:         e.weight   ?? '',
          duration_seconds:    e.duration ?? '',
          distance_meters:     e.distance ?? '',
          rpe:                 e.rpe      ?? '',
        }
      })
    )
    const { data: result, error: err } = await supabase.rpc('log_portal_workout', {
      p_client_workout_id: cw.id, p_client_id: clientId,
      p_completed_at: completedAt, p_notes: notes, p_set_logs: setLogs as any,
    })
    setSaving(false)
    if (err || (result as any)?.error) {
      setError(err?.message ?? (result as any)?.error ?? 'Something went wrong'); return
    }
    setSaved(true)
    setTimeout(() => { onDone(cw.id); onClose() }, 1200)
  }

  const exercises    = detail?.exercises ?? []
  const totalSets    = exercises.reduce((n, ex) => n + getAllSets(ex).length, 0)
  const doneSetsCount = doneSets.size
  const dateLabel    = new Date(completedAt + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  }).toUpperCase()

  function ytId(url: string | null): string | null {
    if (!url) return null
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/)
    return m?.[1] ?? null
  }

  // ── Loading ──
  if (loading) return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#2142c8] to-[#7b68ee] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-white/50 text-xs uppercase tracking-widest">Loading workout</p>
      </div>
    </div>
  )

  // ── EXERCISE DETAIL ──
  if (activeExIdx !== null) {
    const activeEx = exercises[activeExIdx]
    if (!activeEx) { setActiveExIdx(null); return null }
    const sets       = getAllSets(activeEx)
    const metric     = activeEx.metric_type ?? 'reps_weight'
    const isWeighted = metric === 'reps_weight'
    const isTimed    = metric === 'time'
    const isDistance = metric === 'distance'
    const colCls     = isWeighted ? 'grid-cols-[40px_1fr_1fr_1fr_44px]' : 'grid-cols-[40px_1fr_1fr_44px]'
    const firstUndone = sets.findIndex(s => !doneSets.has(`${activeEx.id}-${s.set_number}`))
    const vid = ytId(activeEx.video_url)
    const thumb = vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : null

    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {restTimer && <RestTimer restSeconds={restTimer.restSeconds} label={restTimer.label} onDone={() => setRestTimer(null)} />}

        {/* Video full-screen overlay */}
        {videoOpen && activeEx.video_url && (
          <div className="absolute inset-0 z-20 bg-black flex flex-col">
            <button onClick={() => setVideoOpen(false)}
              className="absolute top-12 right-4 z-30 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
              <X size={18} />
            </button>
            <iframe
              src={vid ? `https://www.youtube.com/embed/${vid}?autoplay=1` : activeEx.video_url}
              className="flex-1"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        )}

        {/* History slide-up */}
        {historyOpen && (
          <>
            <div className="absolute inset-0 z-20 bg-black/50" onClick={() => setHistoryOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl px-5 pt-5 pb-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Last Session</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{activeEx.name}</p>
                </div>
                <button onClick={() => setHistoryOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              {sets.some(s => s.last_reps != null || s.last_weight != null) ? (
                <div className="space-y-0">
                  <div className="flex items-center gap-4 py-2 border-b border-gray-200">
                    <span className="text-xs text-gray-400 font-semibold w-12">SET</span>
                    <span className="text-xs text-gray-400 font-semibold flex-1">WEIGHT</span>
                    <span className="text-xs text-gray-400 font-semibold flex-1">REPS</span>
                  </div>
                  {sets.map(s => (
                    <div key={s.set_number} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-400 font-semibold w-12">Set {s.set_number}</span>
                      <span className="flex-1 text-gray-800 font-bold">{s.last_weight != null ? `${s.last_weight} kg` : '—'}</span>
                      <span className="flex-1 text-gray-500 text-sm">{s.last_reps != null ? `${s.last_reps} reps` : '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No previous session recorded for this exercise</p>
              )}
              {activeEx.progression_type && activeEx.progression_type !== 'none' && activeEx.progression_value && (
                <div className="mt-4 p-3 bg-brand-50 rounded-xl">
                  <p className="text-xs font-semibold text-brand-700">
                    Auto-progression: {activeEx.progression_type === 'linear'
                      ? `+${activeEx.progression_value} kg each session`
                      : `+${activeEx.progression_value}% each session`}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Top bar */}
        <div className="flex items-center px-4 pt-12 pb-2 border-b border-gray-100 flex-shrink-0">
          <button onClick={() => { setHistoryOpen(false); setVideoOpen(false); setActiveExIdx(null) }}
            className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex justify-center gap-1.5 px-2">
            {exercises.map((_, i) => (
              <button key={i} onClick={() => setActiveExIdx(i)}
                className={clsx('rounded-full transition-all',
                  i === activeExIdx ? 'w-4 h-1.5 bg-brand-600' : 'w-1.5 h-1.5 bg-gray-200 hover:bg-gray-300'
                )}
              />
            ))}
          </div>
          <div className="w-8" />
        </div>

        {/* Exercise image / video thumbnail */}
        <div
          className="relative h-48 flex-shrink-0 bg-gradient-to-br from-[#1a2a6c] via-[#2c3e8c] to-[#7b68ee] cursor-pointer"
          onClick={() => activeEx.video_url && setVideoOpen(true)}
        >
          {thumb && <img src={thumb} alt={activeEx.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
          <div className="absolute inset-0 flex items-center justify-center">
            {activeEx.video_url
              ? <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                  <Play size={22} className="text-gray-800 ml-1" fill="currentColor" />
                </div>
              : <Dumbbell size={40} className="text-white/20" />
            }
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
            <p className="text-white font-extrabold text-lg leading-tight">{activeEx.name}</p>
            {activeEx.muscle_group && <p className="text-white/60 text-xs">{activeEx.muscle_group}</p>}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 flex-shrink-0">
          <button onClick={() => setHistoryOpen(true)}
            className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors min-w-[54px]">
            <Clock size={19} />
            <span className="text-[10px] font-semibold">History</span>
          </button>
          <button onClick={() => setExtraSets(prev => ({ ...prev, [activeEx.id]: (prev[activeEx.id] ?? 0) + 1 }))}
            className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors min-w-[54px]">
            <Plus size={19} />
            <span className="text-[10px] font-semibold">Add Set</span>
          </button>
          <div className="flex-1" />
          <span className="text-xs font-semibold text-gray-400 pr-1">
            {sets.filter(s => doneSets.has(`${activeEx.id}-${s.set_number}`)).length}/{sets.length} sets
          </span>
        </div>

        {/* Set table */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Headers */}
          <div className={clsx('grid px-4 py-2.5 bg-blue-50/60 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wide text-gray-400', colCls)}>
            <span>SET</span>
            {isWeighted && <span className="text-center">KG</span>}
            {isTimed    && <span className="text-center">SEC</span>}
            {isDistance && <span className="text-center">M</span>}
            <span className="text-center">REPS</span>
            <span className="text-center">RPE</span>
            <span />
          </div>

          {sets.map((s, si) => {
            const key      = `${activeEx.id}-${s.set_number}`
            const e        = entries[key] ?? { reps: '', weight: '', duration: '', distance: '', rpe: '' }
            const done     = doneSets.has(key)
            const isActive = !done && si === firstUndone

            const cellInput = (field: keyof SetEntry, placeholder: string, opts?: { brand?: boolean }) =>
              <input
                type="number" inputMode="decimal" min={0}
                value={e[field]}
                onChange={ev => setField(key, field, ev.target.value)}
                placeholder={placeholder}
                disabled={done}
                className={clsx(
                  'w-full text-center text-sm rounded-xl border py-1.5 px-1 focus:outline-none focus:ring-2 focus:ring-brand-400/30 transition-all',
                  done       ? 'bg-transparent border-transparent text-emerald-600 font-semibold'
                  : isActive
                    ? clsx('bg-white border-gray-200', opts?.brand ? 'text-brand-600 font-bold' : 'text-gray-900 font-semibold')
                  : 'bg-transparent border-transparent text-gray-300',
                )}
              />

            return (
              <div key={s.set_number}
                className={clsx(
                  'grid items-center py-3 border-b border-gray-50 transition-all',
                  colCls,
                  done       ? 'bg-emerald-50/70 px-4'
                  : isActive ? 'border-l-[3px] border-l-brand-500 pl-[13px] pr-4 bg-blue-50/30'
                  : 'px-4 opacity-55',
                )}
              >
                <span className={clsx('font-bold text-sm',
                  done ? 'text-emerald-500' : isActive ? 'text-gray-800' : 'text-gray-400'
                )}>
                  {s.set_number}
                </span>
                {isWeighted && cellInput('weight', s.suggested_weight?.toString() ?? s.weight?.toString() ?? '—')}
                {isTimed    && cellInput('duration', s.duration_seconds?.toString() ?? '—')}
                {isDistance && cellInput('distance', s.distance_meters?.toString() ?? '—')}
                {cellInput('reps', s.reps?.toString() ?? '—', { brand: true })}
                {cellInput('rpe', '—')}
                <button type="button"
                  onClick={() => handleSetDone(key, activeEx.name, s.set_number, s.rest_seconds ?? 0)}
                  className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                    done ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                  )}>
                  <Check size={15} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Mark All */}
        <button
          onClick={() => markAllSets(activeEx)}
          className="py-3 text-brand-600 font-bold text-[14px] border-t border-gray-100 hover:bg-brand-50 transition-colors flex-shrink-0"
        >
          Mark All
        </button>

        {/* Navigation */}
        <div className="flex gap-2 px-4 pb-8 pt-2 border-t border-gray-100 flex-shrink-0">
          {activeExIdx > 0 && (
            <button onClick={() => setActiveExIdx(activeExIdx - 1)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-gray-100 text-gray-600 font-semibold text-sm">
              <ChevronLeft size={16} /> Prev
            </button>
          )}
          <button
            onClick={() => setActiveExIdx(activeExIdx < exercises.length - 1 ? activeExIdx + 1 : null)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-brand-600 to-violet-600 text-white font-bold text-sm rounded-2xl"
          >
            {activeExIdx < exercises.length - 1
              ? <>Next Exercise <ChevronRight size={16} /></>
              : 'Back to Overview'
            }
          </button>
        </div>
      </div>
    )
  }

  // ── OVERVIEW ──
  const equipment = [...new Set(exercises.flatMap(e => e.equipment ? [e.equipment] : []))]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#2142c8] via-[#3457e8] to-[#7b68ee]">
      {restTimer && <RestTimer restSeconds={restTimer.restSeconds} label={restTimer.label} onDone={() => setRestTimer(null)} />}

      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest">{dateLabel}</p>
          <h1 className="text-white text-[20px] font-extrabold truncate leading-tight">{cw.workout.name}</h1>
        </div>
        <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
          className="px-2.5 py-1.5 text-[11px] bg-white/10 border border-white/20 rounded-xl text-white/80 focus:outline-none [color-scheme:dark]" />
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3 flex items-center gap-2.5 flex-shrink-0">
        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${totalSets ? (doneSetsCount / totalSets) * 100 : 0}%` }} />
        </div>
        <span className="text-white/60 text-xs font-semibold">{doneSetsCount}/{totalSets} sets</span>
      </div>

      {/* Log Workout CTA */}
      <div className="px-4 pb-4 flex-shrink-0">
        <button onClick={() => setActiveExIdx(0)}
          className="bg-white text-brand-700 font-bold text-sm px-6 py-2.5 rounded-2xl shadow-lg hover:bg-white/95 active:scale-[0.98] transition-all">
          {doneSetsCount === 0 ? 'Log Workout' : 'Continue Workout'}
        </button>
      </div>

      {/* White panel */}
      <div className="flex-1 min-h-0 bg-white rounded-t-3xl overflow-y-auto">
        {/* Equipment */}
        {equipment.length > 0 && (
          <div className="px-4 pt-5 pb-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 mb-3">Equipment</h3>
            <div className="flex flex-wrap gap-2">
              {equipment.map(eq => (
                <span key={eq} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 shadow-sm">
                  <Dumbbell size={12} className="text-gray-400" /> {eq}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Exercise list with timeline */}
        <div className="relative py-2">
          {exercises.length > 1 && (
            <div className="absolute left-[27px] top-8 bottom-8 w-px border-l-2 border-dashed border-gray-200 z-0" />
          )}
          {exercises.map((ex, i) => {
            const exSets    = getAllSets(ex)
            const exDone    = exSets.filter(s => doneSets.has(`${ex.id}-${s.set_number}`)).length
            const fullyDone = exDone === exSets.length && exSets.length > 0
            const id = ytId(ex.video_url)
            const setLabel  = exSets.slice(0, 3).map(s => {
              const w = s.suggested_weight ?? s.weight
              if (w && s.reps) return `${w}kg × ${s.reps}`
              if (s.reps)       return `${s.reps} reps`
              if (s.duration_seconds) return `${s.duration_seconds}s`
              return '—'
            }).join(', ') + (exSets.length > 3 ? '…' : '')

            return (
              <button key={ex.id} onClick={() => setActiveExIdx(i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors relative z-10">
                {/* Timeline dot */}
                <div className={clsx('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                  fullyDone ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'
                )}>
                  {fullyDone && <Check size={9} className="text-white" />}
                </div>
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden relative bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
                  {id && <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                      <Play size={9} fill="currentColor" className="text-gray-800 ml-0.5" />
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-gray-900 text-sm">{ex.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{setLabel}</p>
                  {ex.muscle_group && <p className="text-[11px] text-gray-300">{ex.muscle_group}</p>}
                </div>
                {/* Set count */}
                <span className="text-sm font-bold text-gray-400 flex-shrink-0">×{exSets.length}</span>
              </button>
            )
          })}
        </div>

        {/* Complete section */}
        <div className="px-4 py-5 border-t border-gray-100">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-rose-600 text-sm mb-3">{error}</div>
          )}
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Session notes (optional)..."
            rows={2}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none text-gray-700 placeholder-gray-300 mb-3" />
          <button onClick={submit} disabled={saving || saved}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-4 text-[15px] font-bold rounded-2xl transition-all disabled:opacity-50',
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-gradient-to-r from-brand-600 to-violet-600 text-white hover:from-brand-700 hover:to-violet-700',
            )}>
            {saving
              ? <><Loader2 size={16} className="animate-spin" />Saving…</>
              : saved
                ? <><CheckCircle2 size={16} />Session Saved!</>
                : <><ClipboardList size={16} />Save Session</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Workout card ──────────────────────────────────────────────
function WorkoutCard({ cw, clientId, onLog, onQuickComplete }: {
  cw: PortalWorkout
  clientId: string
  onLog: (cw: PortalWorkout) => void
  onQuickComplete: (id: string) => void
}) {
  const [expanded, setExpanded]     = useState(false)
  const [completing, setCompleting] = useState(false)
  const done = cw.status === 'completed'

  async function handleQuickComplete() {
    setCompleting(true)
    await supabase.rpc('complete_portal_workout', {
      p_client_workout_id: cw.id, p_client_id: clientId,
    })
    onQuickComplete(cw.id)
    setCompleting(false)
  }

  return (
    <div className={clsx(
      'rounded-2xl border overflow-hidden transition-all',
      done
        ? 'bg-white/4 border-white/6 opacity-70'
        : 'bg-gradient-to-br from-white/10 to-white/5 border-white/12 shadow-xl shadow-black/30',
    )}>
      {/* Left accent bar */}
      {!done && (
        <div className="h-0.5 bg-gradient-to-r from-brand-500 to-violet-500" />
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx(
            'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg',
            done
              ? 'bg-emerald-500/15 shadow-emerald-500/20'
              : 'bg-gradient-to-br from-brand-500 to-violet-600 shadow-brand-500/30',
          )}>
            {done
              ? <CheckCircle2 size={22} className="text-emerald-400" />
              : <Dumbbell size={22} className="text-white" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={clsx('font-bold text-[15px] leading-tight',
                done ? 'text-white/35 line-through' : 'text-white')}>
                {cw.workout.name}
              </h3>
              {cw.workout.difficulty && (
                <span className={clsx('text-[11px] px-2.5 py-0.5 rounded-full font-semibold tracking-wide',
                  DIFFICULTY_COLORS[cw.workout.difficulty])}>
                  {cw.workout.difficulty}
                </span>
              )}
              {done && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400">
                  Done
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {cw.workout.duration_minutes && (
                <span className="text-xs text-white/40 flex items-center gap-1.5">
                  <Clock size={12} />{cw.workout.duration_minutes} min
                </span>
              )}
              {cw.due_date && (
                <span className="text-xs text-white/40 flex items-center gap-1.5">
                  <Calendar size={12} />Due {new Date(cw.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
            {cw.notes && (
              <p className="mt-2 text-xs text-white/35 leading-relaxed border-l-2 border-white/15 pl-2.5">
                {cw.notes}
              </p>
            )}
          </div>

          {cw.workout.description && (
            <button onClick={() => setExpanded(e => !e)}
              className="p-1.5 text-white/25 hover:text-white/60 flex-shrink-0 transition-colors">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>

        {expanded && cw.workout.description && (
          <p className="mt-3 text-sm text-white/45 leading-relaxed border-t border-white/8 pt-3">
            {cw.workout.description}
          </p>
        )}

        {!done && (
          <div className="mt-4 pt-4 border-t border-white/8 flex gap-2">
            <button
              onClick={() => onLog(cw)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-wide text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-2xl hover:from-brand-700 hover:to-violet-700 transition-all shadow-lg shadow-brand-600/30 active:scale-[0.98]"
            >
              <ClipboardList size={15} /> Log Session
            </button>
            <button
              onClick={handleQuickComplete}
              disabled={completing}
              title="Mark done without logging"
              className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 text-white/40 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400 flex items-center justify-center transition-all"
            >
              {completing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Check-in submission form ──────────────────────────────────
function CheckInForm({ clientId, onClose, onSaved }: {
  clientId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [weight, setWeight]       = useState('')
  const [bodyFat, setBodyFat]     = useState('')
  const [energy, setEnergy]       = useState<number | null>(null)
  const [sleep, setSleep]         = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('submit_portal_check_in', {
      p_client_id:    clientId,
      p_weight_kg:    weight    ? parseFloat(weight)    : null,
      p_body_fat_pct: bodyFat   ? parseFloat(bodyFat)   : null,
      p_energy_level: energy,
      p_sleep_hours:  sleep     ? parseFloat(sleep)     : null,
      p_notes:        notes     || null,
    })
    setSaving(false)
    if (rpcErr || (data as any)?.error) {
      setError(rpcErr?.message ?? (data as any).error)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-5 border-b border-white/8 flex-shrink-0">
        <button onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-white font-bold text-base">Log Check-in</p>
          <p className="text-white/35 text-xs">Fill in what you have — all fields optional</p>
        </div>
      </div>

      <form onSubmit={submit} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10 max-w-lg mx-auto w-full">
        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/25 rounded-2xl text-rose-300 text-sm">{error}</div>
        )}

        {/* Weight + Body Fat */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale size={14} className="text-emerald-400" />
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Weight</p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <input
                type="number" inputMode="decimal" step="0.1" min="0" max="500"
                value={weight} onChange={e => setWeight(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-white text-2xl font-bold placeholder-white/30 outline-none [color-scheme:dark]"
              />
              <span className="text-white/30 text-sm">kg</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-teal-400" />
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Body Fat</p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <input
                type="number" inputMode="decimal" step="0.1" min="0" max="100"
                value={bodyFat} onChange={e => setBodyFat(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-white text-2xl font-bold placeholder-white/30 outline-none [color-scheme:dark]"
              />
              <span className="text-white/30 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Sleep */}
        <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon size={14} className="text-violet-400" />
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Sleep last night</p>
          </div>
          <div className="flex items-baseline gap-1.5">
            <input
              type="number" inputMode="decimal" step="0.5" min="0" max="24"
              value={sleep} onChange={e => setSleep(e.target.value)}
              placeholder="0"
              className="w-24 bg-transparent text-white text-2xl font-bold placeholder-white/30 outline-none [color-scheme:dark]"
            />
            <span className="text-white/30 text-sm">hours</span>
          </div>
        </div>

        {/* Energy level */}
        <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-amber-400" />
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Energy level</p>
            {energy !== null && <span className="ml-auto text-amber-300 font-bold text-sm">{energy}/10</span>}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} type="button" onClick={() => setEnergy(energy === n ? null : n)}
                className={clsx(
                  'w-9 h-9 rounded-xl text-sm font-bold transition-all',
                  energy === n
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-white/8 text-white/40 hover:bg-white/15 hover:text-white/70',
                )}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Notes</p>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="How are you feeling? Any wins or struggles this week?"
            rows={3}
            className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-white/85 text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-brand-400/40 resize-none leading-relaxed"
          />
        </div>

        <button type="submit" disabled={saving || (!weight && !bodyFat && !energy && !sleep && !notes)}
          className="w-full py-3.5 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-2xl hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 transition-all shadow-lg shadow-emerald-500/20">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><TrendingUp size={15} /> Save Check-in</>}
        </button>
      </form>
    </div>
  )
}

// ─── Program schedule card ─────────────────────────────────────
const PORTAL_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function calcProgramWeek(startDate: string | null): number {
  if (!startDate) return 1
  const start = new Date(startDate + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.floor((today.getTime() - start.getTime()) / 86_400_000)
  return Math.max(1, Math.floor(days / 7) + 1)
}

function ProgramScheduleCard({
  program, clientId, completedWorkoutIds, onLog,
}: {
  program: PortalProgram
  clientId: string
  completedWorkoutIds: Set<string>
  onLog: (cw: PortalWorkout) => void
}) {
  const totalWeeks = program.duration_weeks ?? 1
  const defaultWeek = Math.min(calcProgramWeek(program.start_date), totalWeeks)
  const [week, setWeek]           = useState(defaultWeek)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [localDone, setLocalDone]   = useState<Set<string>>(new Set())

  const byDay = Object.fromEntries(
    program.schedule
      .filter(s => s.week_number === week)
      .map(s => [s.day_number, s.workout])
  ) as Record<number, PortalProgramSlot['workout']>

  const workoutDays = Object.keys(byDay).length

  async function handleTap(workoutId: string) {
    if (startingId) return
    setStartingId(workoutId)
    try {
      const { data, error } = await supabase.rpc('get_or_create_portal_program_workout', {
        p_client_id: clientId,
        p_workout_id: workoutId,
      })
      if (error || !data || (data as any).error) throw new Error(error?.message ?? (data as any)?.error ?? 'Failed')
      setLocalDone(prev => new Set(prev).add(workoutId))
      onLog(data as PortalWorkout)
    } catch (err) {
      console.error(err)
    } finally {
      setStartingId(null)
    }
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-500/12 to-brand-500/8 border border-violet-500/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-brand-600 flex items-center justify-center shadow-md shadow-violet-500/30 flex-shrink-0">
              <Calendar size={15} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{program.name}</p>
              <p className="text-white/35 text-xs mt-0.5">
                {workoutDays} session{workoutDays !== 1 ? 's' : ''} this week
                {totalWeeks > 1 ? ` · ${totalWeeks}-week program` : ''}
              </p>
            </div>
          </div>
          {/* Week navigator */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setWeek(w => Math.max(1, w - 1))} disabled={week <= 1}
              className="w-7 h-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/15 disabled:opacity-30 transition-all">
              <ChevronLeft size={13} />
            </button>
            <span className="text-white/60 text-xs font-semibold min-w-[52px] text-center">
              Wk {week}/{totalWeeks}
            </span>
            <button onClick={() => setWeek(w => Math.min(totalWeeks, w + 1))} disabled={week >= totalWeeks}
              className="w-7 h-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/15 disabled:opacity-30 transition-all">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 7-day schedule strip */}
      <div className="grid grid-cols-7 gap-1 p-3">
        {PORTAL_DAY_NAMES.map((dayName, idx) => {
          const dayNum = idx + 1
          const workout = byDay[dayNum]
          const isWeekend = dayNum >= 6
          const isDone = workout && (localDone.has(workout.id) || completedWorkoutIds.has(workout.id))
          const isStarting = workout && startingId === workout.id
          return (
            <div key={dayNum} className="flex flex-col items-center gap-1">
              <p className={clsx(
                'text-[10px] font-semibold',
                isWeekend ? 'text-white/25' : 'text-white/40',
              )}>{dayName}</p>
              {workout ? (
                <button
                  onClick={() => handleTap(workout.id)}
                  disabled={!!startingId}
                  className={clsx(
                    'w-full rounded-xl border px-1.5 py-2 flex flex-col items-center gap-1 min-h-[52px] transition-all active:scale-95 disabled:pointer-events-none',
                    isDone
                      ? 'bg-emerald-500/20 border-emerald-400/30'
                      : 'bg-white/10 border-violet-400/20 hover:bg-white/15',
                  )}>
                  <div className={clsx(
                    'w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0',
                    isDone
                      ? 'bg-emerald-500/40'
                      : 'bg-gradient-to-br from-violet-500 to-brand-500',
                  )}>
                    {isStarting ? (
                      <Loader2 size={9} className="text-white animate-spin" />
                    ) : isDone ? (
                      <CheckCircle2 size={9} className="text-emerald-300" />
                    ) : (
                      <Dumbbell size={9} className="text-white" />
                    )}
                  </div>
                  <p className={clsx(
                    'text-[9px] font-semibold text-center leading-tight line-clamp-2 w-full',
                    isDone ? 'text-emerald-200/80' : 'text-white/80',
                  )}>
                    {workout.name}
                  </p>
                  {workout.duration_minutes && (
                    <p className="text-white/30 text-[9px] flex items-center gap-0.5">
                      <Clock size={8} />{workout.duration_minutes}m
                    </p>
                  )}
                </button>
              ) : (
                <div className={clsx(
                  'w-full rounded-xl border min-h-[52px] flex items-center justify-center',
                  isWeekend ? 'bg-white/3 border-white/5' : 'bg-white/5 border-white/8',
                )}>
                  <p className="text-white/15 text-[9px]">Rest</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Community View ────────────────────────────────────────────

interface CommunityPost {
  id: string
  content: string
  media_url: string | null
  media_type: 'image' | 'video' | 'audio' | null
  pinned: boolean
  created_at: string
  author_type: string
  author_name: string | null
  reaction_count: number
  client_reacted: boolean
  comment_count: number
  section_id: string | null
}

interface CommunityComment {
  id: string
  content: string
  author_type: string
  author_name: string | null
  created_at: string
}

interface CommunityLesson {
  id: string
  title: string
  description: string | null
  content_type: 'video' | 'audio' | 'document' | 'text'
  content_url: string | null
  body: string | null
  duration_minutes: number | null
  drip_days: number
  locked: boolean
  completed: boolean
}

interface CommunityModule {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  position: number
  lessons: CommunityLesson[]
}

interface CommunitySection {
  id: string
  name: string
  emoji: string
  position: number
}

interface ClientCommunity {
  id: string
  name: string
  emoji: string
  description: string | null
}

function communityTimeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function isEmbedUrl(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com|loom\.com|wistia\.com|dailymotion\.com/.test(url)
}

/** Returns the best embeddable preview URL for a document */
function getDocPreviewUrl(url: string): string {
  // Google Drive share link → embed link
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)
  if (driveFile) return `https://drive.google.com/file/d/${driveFile[1]}/preview`

  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
  if (driveOpen) return `https://drive.google.com/file/d/${driveOpen[1]}/preview`

  // Dropbox → force raw download URL so browser can render it
  if (url.includes('dropbox.com')) return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '')

  // PDF or Supabase storage → embed directly
  if (/\.pdf(\?|$)/i.test(url) || url.includes('supabase')) return url

  // Everything else → Google Docs Viewer (handles Word, Excel, PPT, PDF)
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
}

function CommunityView({ clientId }: { clientId: string }) {
  const [subTab, setSubTab] = useState<'feed' | 'courses'>('feed')
  // Communities
  const [clientCommunities, setClientCommunities] = useState<ClientCommunity[]>([])
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null)
  // Sections
  const [sections, setSections]         = useState<CommunitySection[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  // Feed state
  const [posts, setPosts]               = useState<CommunityPost[]>([])
  const [feedLoading, setFeedLoading]   = useState(true)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [comments, setComments]         = useState<Record<string, CommunityComment[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [sendingComment, setSendingComment] = useState<string | null>(null)
  // Client composer
  const [composing, setComposing]       = useState(false)
  const [postContent, setPostContent]   = useState('')
  const [postSection, setPostSection]   = useState('')
  const [posting, setPosting]           = useState(false)
  // Courses state
  const [modules, setModules]           = useState<CommunityModule[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [openLesson, setOpenLesson]     = useState<CommunityLesson | null>(null)
  const [previewDoc, setPreviewDoc]     = useState(false)
  const [completingLesson, setCompletingLesson] = useState<string | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)

  useEffect(() => {
    loadClientCommunities()
    loadSections(null)
    loadFeed(null, null)
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadClientCommunities() {
    const { data } = await supabase.rpc('get_client_communities', { p_client_id: clientId })
    setClientCommunities((data as ClientCommunity[]) ?? [])
  }

  async function loadSections(communityId: string | null) {
    const { data } = await supabase.rpc('get_community_sections', {
      p_client_id:    clientId,
      p_community_id: communityId,
    })
    setSections((data as CommunitySection[]) ?? [])
    setActiveSection(null)
  }

  async function loadFeed(sectionId: string | null, communityId: string | null) {
    setFeedLoading(true)
    const args: any = { p_client_id: clientId }
    if (sectionId)   args.p_section_id   = sectionId
    if (communityId) args.p_community_id = communityId
    const { data } = await supabase.rpc('get_community_feed', args)
    setPosts((data as CommunityPost[]) ?? [])
    setFeedLoading(false)
  }

  async function loadCourses(communityId: string | null) {
    setCoursesLoading(true)
    const args: any = { p_client_id: clientId }
    if (communityId) args.p_community_id = communityId
    const { data } = await supabase.rpc('get_community_modules', args)
    setModules((data as CommunityModule[]) ?? [])
    setCoursesLoading(false)
  }

  function handleCommunitySwitch(id: string | null) {
    setActiveCommunityId(id)
    setSubTab('feed')
    setSelectedModuleId(null)
    loadSections(id)
    loadFeed(null, id)
  }

  function handleSubTab(t: 'feed' | 'courses') {
    setSubTab(t)
    setSelectedModuleId(null)
    if (t === 'courses') loadCourses(activeCommunityId)
  }

  function handleSectionFilter(id: string | null) {
    setActiveSection(id)
    loadFeed(id, activeCommunityId)
  }

  async function submitPost() {
    if (!postContent.trim()) return
    setPosting(true)
    const args: any = { p_client_id: clientId, p_content: postContent.trim() }
    if (postSection)        args.p_section_id   = postSection
    if (activeCommunityId) args.p_community_id = activeCommunityId
    const { data } = await supabase.rpc('create_community_post', args)
    if (data) setPosts(prev => [data as CommunityPost, ...prev])
    setPostContent(''); setPostSection(''); setComposing(false); setPosting(false)
  }

  async function toggleReaction(postId: string) {
    const { data } = await supabase.rpc('toggle_community_reaction', { p_client_id: clientId, p_post_id: postId })
    const reacted = (data as { reacted: boolean })?.reacted ?? false
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, client_reacted: reacted, reaction_count: p.reaction_count + (reacted ? 1 : -1) }
      : p))
  }

  async function toggleComments(postId: string) {
    setExpandedComments(prev => {
      const next = new Set(prev)
      if (next.has(postId)) { next.delete(postId); return next }
      next.add(postId)
      if (!comments[postId]) loadComments(postId)
      return next
    })
  }

  async function loadComments(postId: string) {
    const { data } = await supabase.rpc('get_community_comments', { p_client_id: clientId, p_post_id: postId })
    setComments(prev => ({ ...prev, [postId]: (data as CommunityComment[]) ?? [] }))
  }

  async function sendComment(postId: string) {
    const text = (commentInput[postId] ?? '').trim()
    if (!text) return
    setSendingComment(postId)
    const { data } = await supabase.rpc('add_community_comment', { p_client_id: clientId, p_post_id: postId, p_content: text })
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), data as CommunityComment] }))
      setCommentInput(prev => ({ ...prev, [postId]: '' }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
    }
    setSendingComment(null)
  }

  async function toggleLessonComplete(lesson: CommunityLesson) {
    setCompletingLesson(lesson.id)
    await supabase.rpc('complete_community_lesson', { p_client_id: clientId, p_lesson_id: lesson.id })
    setModules(prev => prev.map(m => ({
      ...m,
      lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, completed: !l.completed } : l),
    })))
    if (openLesson?.id === lesson.id) setOpenLesson(prev => prev ? { ...prev, completed: !prev.completed } : prev)
    setCompletingLesson(null)
  }

  const lessonTypeIcon: Record<CommunityLesson['content_type'], React.ReactNode> = {
    video:    <Video     size={14} />,
    audio:    <Headphones size={14} />,
    document: <FileText  size={14} />,
    text:     <AlignLeft size={14} />,
  }
  const lessonTypeBg: Record<CommunityLesson['content_type'], string> = {
    video:    'bg-violet-500/20 text-violet-300',
    audio:    'bg-pink-500/20 text-pink-300',
    document: 'bg-blue-500/20 text-blue-300',
    text:     'bg-white/10 text-white/50',
  }

  const selectedModule = modules.find(m => m.id === selectedModuleId) ?? null

  return (
    <div className="min-h-screen bg-[#15152a] pb-8">

      {/* Sticky top nav */}
      <div className="sticky top-0 z-20 bg-[#15152a]/95 backdrop-blur-xl">
        {clientCommunities.length > 0 && (
          <div className="flex gap-1.5 px-4 pt-14 pb-3 overflow-x-auto scrollbar-hide border-b border-white/6">
            <button onClick={() => handleCommunitySwitch(null)}
              className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                activeCommunityId === null ? 'bg-white/15 text-white border-white/20' : 'text-white/50 hover:text-white/80 border-white/10')}>
              🌐 General
            </button>
            {clientCommunities.map(c => (
              <button key={c.id} onClick={() => handleCommunitySwitch(c.id)}
                className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                  activeCommunityId === c.id ? 'bg-white/15 text-white border-white/20' : 'text-white/50 hover:text-white/80 border-white/10')}>
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        )}
        <div className={clsx('flex border-b border-white/8', clientCommunities.length === 0 && 'pt-14')}>
          {([
            { id: 'feed' as const,    label: 'Community' },
            { id: 'courses' as const, label: 'Classroom'  },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => handleSubTab(id)}
              className={clsx('px-6 py-3.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                subTab === id ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* COMMUNITY (FEED) */}
      {subTab === 'feed' && (
        <div className="max-w-5xl mx-auto px-4 mt-5">
          <div className="flex gap-5">

            {/* Main feed column */}
            <div className="flex-1 min-w-0 space-y-3">

              {sections.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button onClick={() => handleSectionFilter(null)}
                    className={clsx('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                      activeSection === null ? 'bg-white/15 text-white border-white/20' : 'text-white/50 hover:text-white/80 border-white/10')}>
                    All
                  </button>
                  {sections.map(s => (
                    <button key={s.id} onClick={() => handleSectionFilter(s.id)}
                      className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                        activeSection === s.id ? 'bg-white/15 text-white border-white/20' : 'text-white/50 hover:text-white/80 border-white/10')}>
                      {s.emoji} {s.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Post composer */}
              {!composing ? (
                <button onClick={() => setComposing(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/8 hover:border-white/18 transition-all text-left">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    Me
                  </div>
                  <span className="text-white/35 text-sm">Write something...</span>
                </button>
              ) : (
                <div className="bg-white/6 border border-white/12 rounded-2xl p-4 space-y-3">
                  <textarea autoFocus value={postContent} onChange={e => setPostContent(e.target.value)}
                    placeholder="What's on your mind?" rows={3}
                    className="w-full resize-none bg-[#1a1a35] border border-white/12 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-brand-400/50" />
                  {sections.length > 0 && (
                    <select value={postSection} onChange={e => setPostSection(e.target.value)}
                      className="w-full bg-[#1a1a35] border border-white/12 rounded-xl px-3 py-2 text-sm text-white/85 focus:outline-none focus:ring-1 focus:ring-brand-400/50 [color-scheme:dark]">
                      <option value="">No section</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                    </select>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setComposing(false); setPostContent(''); setPostSection('') }}
                      className="px-4 py-2 rounded-xl text-white/50 text-sm hover:text-white/80 transition-colors">Cancel</button>
                    <button onClick={submitPost} disabled={!postContent.trim() || posting}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
                      {posting && <Loader2 size={14} className="animate-spin" />}Post
                    </button>
                  </div>
                </div>
              )}

              {/* Feed */}
              {feedLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-brand-400" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/15 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle size={22} className="text-brand-400" />
                  </div>
                  <p className="text-white/40 font-semibold">No posts yet</p>
                  <p className="text-white/20 text-xs mt-1">Your coach will post updates here.</p>
                </div>
              ) : posts.map(post => (
                <div key={post.id} className={clsx(
                  'rounded-2xl border overflow-hidden',
                  post.pinned ? 'border-amber-500/40 bg-amber-500/4' : 'bg-white/5 border-white/8',
                )}>
                  <div className="p-4">
                    {/* Author + pinned badge row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={clsx(
                          'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                          post.author_type === 'client'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            : 'bg-gradient-to-br from-brand-500 to-violet-600',
                        )}>
                          {(post.author_name ?? 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-white/90 text-sm font-semibold leading-tight">{post.author_name ?? 'Coach'}</p>
                            {post.author_type === 'coach' && (
                              <span className="text-[9px] font-bold bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-full border border-brand-500/25">
                                Coach
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-white/30 mt-0.5">
                            <span>{communityTimeAgo(post.created_at)}</span>
                            {post.section_id && (() => {
                              const sec = sections.find(s => s.id === post.section_id)
                              return sec ? <><span>&middot;</span><span className="text-white/50">{sec.emoji} {sec.name}</span></> : null
                            })()}
                          </div>
                        </div>
                      </div>
                      {post.pinned && (
                        <span className="text-[10px] font-bold text-amber-400/80 flex-shrink-0 mt-0.5 select-none">&#128204; Pinned</span>
                      )}
                    </div>

                    {/* Content + optional image thumbnail on right */}
                    <div className={clsx('flex gap-3', post.media_url && post.media_type === 'image' ? 'items-start' : '')}>
                      <p className="flex-1 text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      {post.media_url && post.media_type === 'image' && (
                        <img src={post.media_url} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                      )}
                    </div>

                    {post.media_url && post.media_type === 'video' && (
                      <div className="mt-3 rounded-xl overflow-hidden aspect-video bg-black">
                        <iframe src={post.media_url} className="w-full h-full" allowFullScreen />
                      </div>
                    )}
                    {post.media_url && post.media_type === 'audio' && (
                      <audio src={post.media_url} controls className="mt-3 w-full" />
                    )}

                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/8">
                      <button onClick={() => toggleReaction(post.id)}
                        className={clsx('flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90',
                          post.client_reacted ? 'text-rose-400' : 'text-white/30 hover:text-white/60')}>
                        <Heart size={14} className={post.client_reacted ? 'fill-rose-400' : ''} />
                        {post.reaction_count > 0 && post.reaction_count}
                      </button>
                      <button onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white/30 hover:text-white/60 transition-colors">
                        <MessageCircle size={14} />
                        {post.comment_count > 0 ? post.comment_count : 'Comment'}
                      </button>
                    </div>

                    {expandedComments.has(post.id) && (
                      <div className="mt-3 pt-3 border-t border-white/8 space-y-3">
                        {(comments[post.id] ?? []).length === 0 && (
                          <p className="text-white/25 text-xs text-center py-2">No comments yet.</p>
                        )}
                        {(comments[post.id] ?? []).map(c => (
                          <div key={c.id} className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold flex-shrink-0">
                              {(c.author_name ?? '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0 bg-white/5 rounded-xl px-3 py-2">
                              <p className="text-white/60 text-[11px] font-semibold mb-0.5">{c.author_name ?? 'Unknown'}</p>
                              <p className="text-white/75 text-sm leading-snug">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                          <input value={commentInput[post.id] ?? ''}
                            onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && sendComment(post.id)}
                            placeholder="Add a comment..."
                            className="flex-1 bg-[#1a1a35] border border-white/12 rounded-xl px-3 py-2 text-sm text-white/90 placeholder-white/35 focus:outline-none focus:ring-1 focus:ring-brand-400/50" />
                          <button onClick={() => sendComment(post.id)}
                            disabled={!commentInput[post.id]?.trim() || sendingComment === post.id}
                            className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center disabled:opacity-40 transition-all active:scale-90 flex-shrink-0">
                            {sendingComment === post.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right sidebar — desktop only */}
            <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
              {(() => {
                const ac = activeCommunityId ? clientCommunities.find(c => c.id === activeCommunityId) : null
                return ac ? (
                  <div className="rounded-2xl bg-white/6 border border-white/10 overflow-hidden">
                    <div className="h-20 bg-gradient-to-br from-brand-600 to-violet-700 flex items-center justify-center">
                      <span className="text-4xl">{ac.emoji}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-white font-bold text-sm">{ac.name}</p>
                      {ac.description && (
                        <p className="text-white/45 text-xs mt-1.5 leading-relaxed">{ac.description}</p>
                      )}
                    </div>
                  </div>
                ) : null
              })()}
            </div>

          </div>
        </div>
      )}

      {/* CLASSROOM */}
      {subTab === 'courses' && (
        <div className="max-w-5xl mx-auto px-4 mt-5">

          {!selectedModule && (
            coursesLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-brand-400" />
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={22} className="text-violet-400" />
                </div>
                <p className="text-white/40 font-semibold">No courses yet</p>
                <p className="text-white/20 text-xs mt-1">Your coach will add lessons here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map(mod => {
                  const total = mod.lessons.length
                  const done  = mod.lessons.filter(l => l.completed).length
                  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <button key={mod.id} onClick={() => setSelectedModuleId(mod.id)}
                      className="text-left rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-white/20 hover:bg-white/7 transition-all active:scale-[0.98] group">
                      <div className="relative h-36 bg-[#0d0d20] flex flex-col items-center justify-center">
                        {mod.cover_url
                          ? <img src={mod.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-80 transition-opacity" />
                          : <>
                              <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center mb-2">
                                <BookOpen size={18} className="text-white/40" />
                              </div>
                              <p className="text-white/25 text-[9px] font-bold uppercase tracking-widest px-4 text-center line-clamp-2">
                                {mod.title}
                              </p>
                            </>
                        }
                      </div>
                      <div className="p-4">
                        <p className="text-white/90 font-bold text-sm mb-1 line-clamp-2">{mod.title}</p>
                        {mod.description && (
                          <p className="text-white/40 text-xs leading-relaxed line-clamp-2 mb-3">{mod.description}</p>
                        )}
                        <div>
                          <div className="h-2 bg-white/8 rounded-full overflow-hidden mb-1">
                            <div className={clsx('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-400' : 'bg-brand-500')}
                              style={{ width: `${pct > 0 ? Math.max(pct, 4) : 0}%` }} />
                          </div>
                          <p className="text-[10px] text-white/35 font-semibold">{pct}%</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          )}

          {selectedModule && !openLesson && (
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setSelectedModuleId(null)}
                className="flex items-center gap-2 text-white/40 text-sm mb-5 hover:text-white/70 transition-colors">
                <ArrowLeft size={16} /> All courses
              </button>
              <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-4">
                {selectedModule.cover_url && (
                  <img src={selectedModule.cover_url} alt="" className="w-full h-32 object-cover opacity-70" />
                )}
                <div className="p-5">
                  <p className="text-white font-bold text-base">{selectedModule.title}</p>
                  {selectedModule.description && (
                    <p className="text-white/40 text-sm mt-1.5 leading-relaxed">{selectedModule.description}</p>
                  )}
                  {selectedModule.lessons.length > 0 && (() => {
                    const done  = selectedModule.lessons.filter(l => l.completed).length
                    const total = selectedModule.lessons.length
                    const pct   = Math.round((done / total) * 100)
                    return (
                      <div className="flex items-center gap-3 mt-4">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-400' : 'bg-brand-500')}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-white/40 font-semibold flex-shrink-0">{done}/{total} complete</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden divide-y divide-white/6">
                {selectedModule.lessons.map((lesson, i) => (
                  <button key={lesson.id}
                    onClick={() => { if (!lesson.locked) { setOpenLesson(lesson); setPreviewDoc(false) } }}
                    disabled={lesson.locked}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all',
                      lesson.locked ? 'opacity-40 cursor-default' : 'hover:bg-white/4 active:bg-white/8')}>
                    <span className="text-xs text-white/20 w-5 text-center font-bold flex-shrink-0">{i + 1}</span>
                    <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0', lessonTypeBg[lesson.content_type])}>
                      {lessonTypeIcon[lesson.content_type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-semibold truncate', lesson.completed ? 'text-white/30 line-through' : 'text-white/80')}>
                        {lesson.title}
                      </p>
                      {lesson.duration_minutes && (
                        <p className="text-[10px] text-white/25 mt-0.5">{lesson.duration_minutes} min</p>
                      )}
                    </div>
                    {lesson.locked
                      ? <Lock size={13} className="text-white/20 flex-shrink-0" />
                      : lesson.completed
                        ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                        : <ChevronRight size={15} className="text-white/20 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Lesson Detail Overlay ── */}
      {openLesson && (
        <div className="fixed inset-0 z-50 bg-[#0d0d20] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 pt-12 pb-4 bg-[#0d0d20]/95 backdrop-blur border-b border-white/8">
            <button onClick={() => setOpenLesson(null)}
              className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate">{openLesson.title}</p>
              <p className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit mt-0.5', lessonTypeBg[openLesson.content_type])}>
                {openLesson.content_type}
              </p>
            </div>
          </div>

          <div className="px-4 py-5 pb-8 max-w-2xl mx-auto">
            {/* Video — embed (YouTube/Vimeo/Loom) or direct file */}
            {openLesson.content_type === 'video' && openLesson.content_url && (
              <div className="rounded-2xl overflow-hidden aspect-video bg-black mb-5">
                {isEmbedUrl(openLesson.content_url)
                  ? <iframe src={openLesson.content_url} className="w-full h-full" allowFullScreen />
                  : <video src={openLesson.content_url} controls className="w-full h-full" />
                }
              </div>
            )}

            {/* Audio player */}
            {openLesson.content_type === 'audio' && openLesson.content_url && (
              <div className="bg-white/6 border border-white/10 rounded-2xl p-5 mb-5 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Headphones size={28} className="text-white" />
                </div>
                <audio src={openLesson.content_url} controls className="w-full" />
              </div>
            )}

            {/* Document file — preview + download */}
            {openLesson.content_type === 'document' && openLesson.content_url && (
              <div className="mb-5">
                {/* Action bar */}
                <div className="flex items-center gap-2 bg-white/6 border border-white/10 rounded-2xl px-4 py-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-blue-400" />
                  </div>
                  <p className="flex-1 text-white/75 text-sm font-semibold truncate min-w-0">
                    {openLesson.content_url.split('/').pop()?.split('?')[0] ?? 'Document'}
                  </p>
                  {/* Preview toggle */}
                  <button
                    onClick={() => setPreviewDoc(v => !v)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0',
                      previewDoc
                        ? 'bg-brand-500/30 text-brand-300 border border-brand-500/40'
                        : 'bg-white/10 text-white/60 hover:bg-white/15 border border-white/10'
                    )}
                  >
                    {previewDoc ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Preview</>}
                  </button>
                  {/* Download */}
                  <a
                    href={openLesson.content_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white/60 hover:bg-white/15 border border-white/10 transition-colors flex-shrink-0"
                  >
                    <Download size={13} /> Save
                  </a>
                  {/* Open externally */}
                  <a
                    href={openLesson.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white/60 hover:bg-white/15 border border-white/10 transition-colors flex-shrink-0"
                  >
                    <ExternalLink size={13} /> Open
                  </a>
                </div>

                {/* Inline previewer */}
                {previewDoc && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-white" style={{ height: '70vh' }}>
                    <iframe
                      src={getDocPreviewUrl(openLesson.content_url)}
                      className="w-full h-full"
                      title={openLesson.title}
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {openLesson.description && (
              <p className="text-white/55 text-sm leading-relaxed mb-4">{openLesson.description}</p>
            )}

            {/* Body / text content */}
            {openLesson.body && (
              <div className="bg-white/6 border border-white/10 rounded-2xl p-5 mb-5">
                <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{openLesson.body}</p>
              </div>
            )}

            {/* Complete button */}
            <button
              onClick={() => toggleLessonComplete(openLesson)}
              disabled={completingLesson === openLesson.id}
              className={clsx(
                'w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2',
                openLesson.completed
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-brand-600 text-white shadow-lg shadow-brand-900/40',
              )}>
              {completingLesson === openLesson.id
                ? <Loader2 size={16} className="animate-spin" />
                : openLesson.completed
                  ? <><CheckCircle2 size={16} /> Completed — tap to undo</>
                  : 'Mark as Complete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Plan / Calendar view ──────────────────────────────────────
type PlanEventKind = 'program' | 'workout' | 'task' | 'habit'
interface PlanEvent {
  kind: PlanEventKind; id: string; label: string; status?: string; emoji?: string
  metricDefId?: string; metricName?: string; metricUnit?: string; metricEmoji?: string
}

const PLAN_MONTHS = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const PLAN_DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function planIsoKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function planLocalDate(s: string) {
  const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d)
}
function planShift(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function planCalendarWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start  = planShift(first, -offset)
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => planShift(start, w * 7 + d))
  )
}

interface HabitMeta { id: string; name: string; emoji: string; frequency: string; created_at: string }

function habitAppliesToDay(frequency: string, createdAt: string, d: Date): boolean {
  const dow = d.getDay() // 0=Sun,1=Mon,...,6=Sat
  if (frequency === 'daily') return true
  if (frequency === 'weekdays') return dow >= 1 && dow <= 5
  if (frequency === 'weekends') return dow === 0 || dow === 6
  if (frequency === 'weekly') {
    // same weekday as when the habit was created
    const created = new Date(createdAt)
    return dow === created.getDay()
  }
  return false
}

function PlanView({
  data, tasks, habits: habitsSummary, clientId, onRescheduleWorkout, onTaskToggled,
}: {
  data: PortalData
  tasks: PortalTask[]
  habits: PortalHabit[]
  clientId: string
  onRescheduleWorkout: (workoutId: string, newDate: string) => void
  onTaskToggled: (taskId: string) => void
}) {
  const todayRaw = new Date(); todayRaw.setHours(0,0,0,0)
  const todayKey = planIsoKey(todayRaw)
  const [month, setMonth]         = useState(new Date(todayRaw.getFullYear(), todayRaw.getMonth(), 1))
  const [selKey, setSelKey]       = useState<string>(todayKey)
  // Workout move mode — id of the client_workout being rescheduled
  const [movingId, setMovingId]   = useState<string | null>(null)
  const [movingLabel, setMovingLabel] = useState('')
  const [moving, setMoving]       = useState(false)
  // Optimistic task done set
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set())
  // Metric prompt for tasks
  const [metricTask, setMetricTask] = useState<PlanEvent | null>(null)
  const [taskMetricValue, setTaskMetricValue] = useState('')
  // Habit metadata (includes created_at for weekly day calculation)
  const [habitMeta, setHabitMeta] = useState<HabitMeta[]>([])
  // Completions: Set of "habitId|dateKey"
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set())
  // Optimistic habit toggles for selected day
  const [toggledHabits, setToggledHabits] = useState<Set<string>>(new Set())

  // Load habit metadata once
  useEffect(() => {
    supabase.rpc('get_client_habits_metadata', { p_client_id: clientId })
      .then(({ data }) => { if (data) setHabitMeta(data as HabitMeta[]) })
  }, [clientId])

  // Load completions whenever month changes
  useEffect(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const end   = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    const startStr = planIsoKey(start)
    const endStr   = planIsoKey(end)
    supabase.rpc('get_habit_completions_range', {
      p_client_id: clientId,
      p_start_date: startStr,
      p_end_date: endStr,
    }).then(({ data }) => {
      if (data) {
        setCompletedHabits(new Set(
          (data as { habit_id: string; completed_date: string }[])
            .map(r => `${r.habit_id}|${r.completed_date}`)
        ))
      }
    })
    setToggledHabits(new Set())
  }, [clientId, month])

  // Build event map — reacts to doneTasks and completedHabits
  const eventMap = useMemo(() => {
    const map = new Map<string, PlanEvent[]>()
    function push(key: string, ev: PlanEvent) {
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    // Program slots → actual dates via start_date
    if (data.program?.start_date) {
      const start = planLocalDate(data.program.start_date)
      for (const slot of data.program.schedule) {
        const d = planShift(start, (slot.week_number - 1) * 7 + (slot.day_number - 1))
        push(planIsoKey(d), { kind: 'program', id: slot.workout.id, label: slot.workout.name })
      }
    }
    // Workouts by due_date
    for (const w of data.workouts) {
      const key = w.due_date?.slice(0,10)
      if (key) push(key, { kind: 'workout', id: w.id, label: w.workout.name, status: w.status })
    }
    // Tasks by due_date
    for (const t of tasks) {
      if (t.due_date) push(t.due_date.slice(0,10), {
        kind: 'task', id: t.id, label: t.title,
        status: (doneTasks.has(t.id) || t.completed) ? 'done' : undefined,
        metricDefId: t.metric_definition_id ?? undefined,
        metricName:  t.metric_name ?? undefined,
        metricUnit:  t.metric_unit ?? undefined,
        metricEmoji: t.metric_emoji ?? undefined,
      })
    }
    // Habits — generate events for every applicable day in the displayed month
    const weeks = planCalendarWeeks(month)
    const allDays = weeks.flat()
    for (const h of habitMeta) {
      for (const day of allDays) {
        if (!habitAppliesToDay(h.frequency, h.created_at, day)) continue
        const key = planIsoKey(day)
        const togKey = `${h.id}|${key}`
        const isDone = completedHabits.has(togKey) !== toggledHabits.has(togKey)
        push(key, {
          kind: 'habit',
          id: `habit:${h.id}:${key}`,
          label: h.name,
          emoji: h.emoji,
          status: isDone ? 'done' : undefined,
        })
      }
    }
    return map
  }, [data, tasks, doneTasks, habitMeta, completedHabits, toggledHabits, month])

  const weeks     = planCalendarWeeks(month)
  const selEvents = eventMap.get(selKey) ?? []

  const kindChip: Record<PlanEventKind, string> = {
    program: 'bg-violet-500/30 text-violet-200',
    workout: 'bg-brand-500/30 text-brand-200',
    task:    'bg-amber-500/30 text-amber-200',
    habit:   'bg-emerald-500/30 text-emerald-200',
  }
  const kindDot: Record<PlanEventKind, string> = {
    program: 'bg-violet-400',
    workout: 'bg-brand-400',
    task:    'bg-amber-400',
    habit:   'bg-emerald-400',
  }
  const kindLabel: Record<PlanEventKind, string> = {
    program: 'Program session',
    workout: 'Assigned workout',
    task:    'Task',
    habit:   'Habit',
  }

  async function handleToggleTask(taskId: string, metricVal?: number) {
    setDoneTasks(prev => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
    try {
      await supabase.rpc('toggle_portal_task', {
        p_client_id:    clientId,
        p_task_id:      taskId,
        p_metric_value: metricVal ?? null,
      })
      onTaskToggled(taskId)
    } catch {
      setDoneTasks(prev => { const next = new Set(prev); next.delete(taskId); return next })
    }
  }

  function handleTaskTap(ev: PlanEvent) {
    const isDone = ev.status === 'done'
    // If task has a metric and we're completing (not un-completing), prompt for value
    if (ev.metricDefId && !isDone) {
      setMetricTask(ev)
      setTaskMetricValue('')
    } else {
      handleToggleTask(ev.id)
    }
  }

  async function submitTaskMetric() {
    if (!metricTask) return
    const val = taskMetricValue ? parseFloat(taskMetricValue) : undefined
    await handleToggleTask(metricTask.id, val)
    setMetricTask(null)
    setTaskMetricValue('')
  }

  // ev.id is "habit:habitId:dateKey"
  async function handleToggleHabit(evId: string) {
    const [, habitId, dateKey] = evId.split(':')
    const togKey = `${habitId}|${dateKey}`
    setToggledHabits(prev => {
      const next = new Set(prev)
      next.has(togKey) ? next.delete(togKey) : next.add(togKey)
      return next
    })
    await supabase.rpc('toggle_habit_completion', {
      p_client_id: clientId,
      p_habit_id: habitId,
      p_date: dateKey,
    })
  }

  async function handleDrop(targetKey: string) {
    if (!movingId || moving) return
    setMoving(true)
    try {
      await supabase.rpc('reschedule_portal_workout', {
        p_client_id: clientId,
        p_client_workout_id: movingId,
        p_new_due_date: targetKey,
      })
      onRescheduleWorkout(movingId, targetKey)
      setSelKey(targetKey)
    } finally {
      setMovingId(null)
      setMovingLabel('')
      setMoving(false)
    }
  }

  function handleDayClick(key: string) {
    if (movingId) { handleDrop(key); return }
    setSelKey(key)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040] pb-8">

      {/* ── Task metric input sheet ── */}
      {metricTask && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMetricTask(null)} />
          <div className="relative bg-[#1a1a35] border-t border-white/10 rounded-t-3xl px-5 pt-5 pb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold">{metricTask.label}</p>
                <p className="text-white/40 text-xs">Log {metricTask.metricEmoji} {metricTask.metricName}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 bg-white/8 rounded-2xl px-4 py-3 mb-4">
              <input
                type="number" inputMode="decimal" step="any"
                value={taskMetricValue} onChange={e => setTaskMetricValue(e.target.value)}
                placeholder="0" autoFocus
                className="flex-1 bg-transparent text-white text-3xl font-bold outline-none placeholder-white/20 [color-scheme:dark]"
              />
              {metricTask.metricUnit && (
                <span className="text-white/40 text-lg">{metricTask.metricUnit}</span>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { handleToggleTask(metricTask.id); setMetricTask(null) }}
                className="flex-1 py-3 rounded-2xl bg-white/8 text-white/50 font-semibold text-sm">
                Skip metric
              </button>
              <button onClick={submitTaskMetric}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm">
                Complete + Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Move-mode banner ── */}
      {movingId && (
        <div className="sticky top-0 z-20 bg-brand-600 px-4 py-3 flex items-center gap-3 shadow-lg shadow-brand-900/50">
          <GripVertical size={16} className="text-white/70 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">Moving: {movingLabel}</p>
            <p className="text-white/60 text-xs">Tap any date to reschedule</p>
          </div>
          <button onClick={() => { setMovingId(null); setMovingLabel('') }}
            className="text-white/60 hover:text-white p-1 transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className={clsx(
        'flex items-center gap-3 px-4 pb-5 border-b border-white/8',
        movingId ? 'pt-5' : 'pt-14',
      )}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0">
          <Calendar size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base">My Plan</p>
          <p className="text-white/35 text-xs">Workouts, tasks &amp; habits</p>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
          className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/14 transition-all active:scale-95">
          <ChevronLeft size={16} />
        </button>
        <p className="text-white font-bold text-base tracking-tight">
          {PLAN_MONTHS[month.getMonth()]} {month.getFullYear()}
        </p>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}
          className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/14 transition-all active:scale-95">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day name header */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {PLAN_DAYS.map((d, i) => (
          <p key={d} className={clsx('text-center text-[11px] font-bold py-1',
            i >= 5 ? 'text-white/20' : 'text-white/35')}>{d}</p>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="px-3 space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              const key     = planIsoKey(day)
              const inMonth = day.getMonth() === month.getMonth()
              const isToday = key === todayKey
              const isSel   = key === selKey
              const isWknd  = di >= 5
              const isTarget = !!movingId  // all days are drop targets in move mode
              const events  = eventMap.get(key) ?? []
              const MAX = 2

              return (
                <button key={key} onClick={() => handleDayClick(key)}
                  className={clsx(
                    'rounded-xl p-1 min-h-[60px] flex flex-col items-center gap-0.5 transition-all active:scale-95',
                    isTarget && !isSel
                      ? 'bg-brand-500/15 ring-1 ring-brand-400/50 ring-offset-0'
                      : isSel   ? 'bg-white/15 ring-1 ring-white/25'
                      : isToday ? 'bg-brand-600/25 ring-1 ring-brand-400/40'
                      : isWknd  ? 'bg-white/2'
                      : 'bg-white/5 hover:bg-white/8',
                  )}>
                  <span className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                    isToday ? 'bg-brand-500 text-white'
                    : isSel  ? 'text-white'
                    : inMonth ? (isWknd ? 'text-white/25' : 'text-white/60')
                    : 'text-white/15',
                  )}>{day.getDate()}</span>

                  {events.slice(0, MAX).map((ev: PlanEvent, i: number) => (
                    <div key={i} className={clsx(
                      'w-full text-[8px] font-semibold px-1 py-0.5 rounded-md truncate leading-tight',
                      ev.status === 'completed' || ev.status === 'done'
                        ? 'bg-emerald-500/25 text-emerald-300 line-through opacity-60'
                        : kindChip[ev.kind],
                    )}>{ev.label}</div>
                  ))}
                  {events.length > MAX && (
                    <p className="text-[8px] text-white/25 font-medium">+{events.length - MAX}</p>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      <div className="mx-3 mt-4 rounded-2xl bg-white/6 border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            {selKey === todayKey ? 'Today' : planLocalDate(selKey).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {selEvents.length > 0 && (
            <p className="text-white/35 text-xs mt-0.5">{selEvents.length} item{selEvents.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        {selEvents.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-white/25 text-sm font-medium">Nothing scheduled</p>
            <p className="text-white/15 text-xs mt-1">Rest day or no items planned</p>
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {selEvents.map((ev: PlanEvent, i: number) => {
              const isDone = ev.status === 'completed' || ev.status === 'done'
              const isMoving = movingId === ev.id

              return (
                <div key={i} className={clsx(
                  'flex items-center gap-3 px-4 py-3 transition-colors',
                  isMoving && 'bg-brand-500/15',
                )}>

                  {/* Task checkbox / habit toggle / event dot */}
                  {ev.kind === 'task' ? (
                    <button
                      onClick={() => handleTaskTap(ev)}
                      className={clsx(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90',
                        isDone
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-amber-400/60 hover:border-amber-400',
                      )}>
                      {isDone && <CheckCircle2 size={13} className="text-white" />}
                    </button>
                  ) : ev.kind === 'habit' ? (
                    <button
                      onClick={() => handleToggleHabit(ev.id)}
                      className={clsx(
                        'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-base transition-all active:scale-90',
                        isDone
                          ? 'bg-emerald-500/20 border-emerald-400/60'
                          : 'border-white/15 hover:border-emerald-400/50',
                      )}>
                      <span className={clsx('transition-all', isDone && 'opacity-50 scale-90')}>{ev.emoji}</span>
                    </button>
                  ) : (
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', kindDot[ev.kind])} />
                  )}

                  {/* Label + sub */}
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      'text-sm font-semibold leading-tight',
                      isDone ? 'text-white/30 line-through' : 'text-white/85',
                    )}>{ev.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[10px] text-white/30">{kindLabel[ev.kind]}</p>
                      {ev.metricName && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/8 text-white/40">
                          {ev.metricEmoji} {ev.metricName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Workout move handle (only assigned workouts, not program slots) */}
                  {ev.kind === 'workout' && !isDone && (
                    <button
                      onClick={() => {
                        if (movingId === ev.id) { setMovingId(null); setMovingLabel('') }
                        else { setMovingId(ev.id); setMovingLabel(ev.label) }
                      }}
                      className={clsx(
                        'p-1.5 rounded-lg flex-shrink-0 transition-all active:scale-90',
                        isMoving
                          ? 'bg-brand-500/40 text-brand-300'
                          : 'text-white/20 hover:text-white/60 hover:bg-white/8',
                      )}
                      title="Move to another day">
                      <GripVertical size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mx-3 mt-3 flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/4 flex-wrap">
        {(['program','workout','task','habit'] as PlanEventKind[]).map(k => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={clsx('w-2 h-2 rounded-full', kindDot[k])} />
            <span className="text-[10px] text-white/35 capitalize">
              {k === 'program' ? 'Program' : k === 'workout' ? 'Workout' : k === 'task' ? 'Task' : 'Habit'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Workouts section view ─────────────────────────────────────
function WorkoutsView({ data, clientId, onMarkComplete }: {
  data: PortalData
  clientId: string
  onMarkComplete: (id: string) => void
}) {
  const [logging, setLogging] = useState<PortalWorkout | null>(null)
  const assigned  = data.workouts.filter(w => w.status === 'assigned')
  const completed = data.workouts.filter(w => w.status === 'completed')
  const completedWorkoutIds = new Set(completed.map(cw => cw.workout.id))

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040]">
      {logging && (
        <PortalLogOverlay
          cw={logging}
          clientId={clientId}
          onClose={() => setLogging(null)}
          onDone={(id) => { onMarkComplete(id); setLogging(null) }}
        />
      )}

      {/* Section header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-5 border-b border-white/8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-brand-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Dumbbell size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base">Workouts</p>
          <p className="text-white/35 text-xs">{assigned.length} pending · {completed.length} done</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6 pb-8">
        {/* Active program schedule */}
        {data.program && (
          <ProgramScheduleCard
            program={data.program}
            clientId={clientId}
            completedWorkoutIds={completedWorkoutIds}
            onLog={setLogging}
          />
        )}

        {assigned.length > 0 && (
          <div>
            <SectionLabel>Assigned</SectionLabel>
            <div className="space-y-3">
              {assigned.map(cw => (
                <WorkoutCard key={cw.id} cw={cw} clientId={clientId}
                  onLog={setLogging} onQuickComplete={onMarkComplete} />
              ))}
            </div>
          </div>
        )}

        {assigned.length === 0 && !data.program && (
          <EmptyState
            icon={<Dumbbell size={28} className="text-violet-400/60" />}
            title="All caught up!"
            subtitle="No workouts pending. Check back soon."
            gradient="from-violet-500/10 to-brand-500/10"
          />
        )}

        {completed.length > 0 && (
          <div>
            <SectionLabel>Completed</SectionLabel>
            <div className="space-y-3">
              {completed.map(cw => (
                <WorkoutCard key={cw.id} cw={cw} clientId={clientId}
                  onLog={setLogging} onQuickComplete={onMarkComplete} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Session detail overlay ────────────────────────────────────
function SessionDetailView({ entry, clientId, onBack }: {
  entry: PortalHistoryEntry
  clientId: string
  onBack: () => void
}) {
  const [detail, setDetail] = useState<PortalSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_portal_session_detail', {
      p_client_id: clientId, p_workout_log_id: entry.id,
    }).then(({ data }) => {
      setDetail(data as PortalSessionDetail ?? null)
      setLoading(false)
    })
  }, [entry.id, clientId])

  const dateStr = new Date(entry.completed_at).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="fixed inset-0 lg:left-64 z-30 bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 lg:pt-6 pb-5 border-b border-white/8 flex-shrink-0">
        <button onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-white font-bold text-base leading-tight">{entry.workout_name}</p>
          <p className="text-white/35 text-xs mt-0.5 flex items-center gap-1.5">
            <Calendar size={11} />{dateStr}
          </p>
        </div>
        {entry.set_count > 0 && (
          <div className="ml-auto text-right flex-shrink-0">
            <p className="text-amber-400 font-bold text-xl leading-none">{entry.set_count}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-wide">sets</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">
        {loading ? (
          <LoadingCard label="Loading session" />
        ) : !detail || detail.exercises.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} className="text-amber-400/60" />}
            title="No set data recorded"
            subtitle="This session was marked complete without logging individual sets."
            gradient="from-amber-500/10 to-orange-500/10"
          />
        ) : detail.exercises.map((ex, idx) => {
          const isWeighted = ex.metric_type === 'reps_weight'
          const isTimed    = ex.metric_type === 'time'
          const isDistance = ex.metric_type === 'distance'

          // Filter to sets that actually have data
          const setsWithData = ex.sets.filter(s =>
            s.reps_achieved != null || s.weight_used != null ||
            s.duration_seconds != null || s.distance_meters != null
          )
          if (setsWithData.length === 0) return null

          return (
            <div key={ex.exercise_id} className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden">
              {/* Exercise header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/6">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-[11px] font-bold text-amber-400 flex-shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-white font-bold text-[15px] leading-tight">{ex.name}</p>
                  {ex.muscle_group && (
                    <p className="text-white/35 text-[11px] mt-0.5">{ex.muscle_group}</p>
                  )}
                </div>
                <div className="ml-auto flex-shrink-0">
                  <span className="text-[11px] font-semibold text-amber-400/70 bg-amber-500/15 px-2 py-0.5 rounded-full">
                    {setsWithData.length} {setsWithData.length === 1 ? 'set' : 'sets'}
                  </span>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid px-4 py-2 border-b border-white/6 text-[10px] font-bold uppercase tracking-wide text-white/25"
                style={{ gridTemplateColumns: isWeighted ? '32px 1fr 1fr 60px' : '32px 1fr 60px' }}>
                <span>Set</span>
                {isWeighted && <><span>Reps</span><span>Weight</span></>}
                {isTimed    && <span>Duration</span>}
                {isDistance && <span>Distance</span>}
                {ex.metric_type === 'reps' && <span>Reps</span>}
                <span className="text-right">RPE</span>
              </div>

              {/* Set rows */}
              <div className="divide-y divide-white/4">
                {setsWithData.map((s, si) => (
                  <div key={s.set_number}
                    className="grid items-center px-4 py-3 gap-2"
                    style={{ gridTemplateColumns: isWeighted ? '32px 1fr 1fr 60px' : '32px 1fr 60px' }}>
                    {/* Set number */}
                    <div className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center text-[11px] font-bold text-white/40 flex-shrink-0">
                      {s.set_number}
                    </div>

                    {isWeighted && (
                      <>
                        <div>
                          <p className="text-white font-bold text-base leading-none">
                            {s.reps_achieved ?? '—'}
                          </p>
                          <p className="text-white/30 text-[10px]">reps</p>
                        </div>
                        <div>
                          <p className="text-white font-bold text-base leading-none">
                            {s.weight_used != null ? s.weight_used : '—'}
                          </p>
                          <p className="text-white/30 text-[10px]">kg</p>
                        </div>
                      </>
                    )}
                    {isTimed && (
                      <div>
                        <p className="text-white font-bold text-base leading-none">
                          {s.duration_seconds != null ? `${s.duration_seconds}s` : '—'}
                        </p>
                      </div>
                    )}
                    {isDistance && (
                      <div>
                        <p className="text-white font-bold text-base leading-none">
                          {s.distance_meters != null ? `${s.distance_meters}m` : '—'}
                        </p>
                      </div>
                    )}
                    {ex.metric_type === 'reps' && (
                      <div>
                        <p className="text-white font-bold text-base leading-none">
                          {s.reps_achieved ?? '—'}
                        </p>
                        <p className="text-white/30 text-[10px]">reps</p>
                      </div>
                    )}

                    {/* RPE */}
                    <div className="text-right">
                      {s.rpe != null ? (
                        <span className={clsx(
                          'inline-block text-xs font-bold px-2 py-0.5 rounded-full',
                          s.rpe <= 6  ? 'bg-emerald-500/20 text-emerald-400' :
                          s.rpe <= 8  ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-rose-500/20 text-rose-400',
                        )}>
                          {s.rpe}
                        </span>
                      ) : (
                        <span className="text-white/15 text-xs">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {detail?.notes && (
          <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide mb-2">Session notes</p>
            <p className="text-white/60 text-sm leading-relaxed italic">{detail.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── History section view ──────────────────────────────────────
function HistoryView({ clientId }: { clientId: string }) {
  const [entries, setEntries]       = useState<PortalHistoryEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<PortalHistoryEntry | null>(null)

  useEffect(() => {
    supabase.rpc('get_portal_history', { p_client_id: clientId }).then(({ data }) => {
      setEntries((data as PortalHistoryEntry[]) ?? [])
      setLoading(false)
    })
  }, [clientId])

  // Show session detail overlay
  if (selected) return (
    <SessionDetailView entry={selected} clientId={clientId} onBack={() => setSelected(null)} />
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040]">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-5 border-b border-white/8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <History size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base">History</p>
          <p className="text-white/35 text-xs">{loading ? '…' : `${entries.length} sessions logged`}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3 pb-8">
        {loading ? (
          <LoadingCard label="Loading history" />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<History size={28} className="text-amber-400/60" />}
            title="No sessions yet"
            subtitle="Your completed sessions will appear here."
            gradient="from-amber-500/10 to-orange-500/10"
          />
        ) : entries.map(entry => (
          <button
            key={entry.id}
            onClick={() => setSelected(entry)}
            className="w-full text-left rounded-2xl bg-gradient-to-br from-white/8 to-white/4 border border-white/10 p-4 hover:from-white/12 hover:to-white/6 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[15px] leading-tight truncate">
                  {entry.workout_name}
                </p>
                <p className="text-white/40 text-xs mt-1 flex items-center gap-1.5">
                  <Calendar size={11} />
                  {new Date(entry.completed_at).toLocaleDateString('en-AU', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {entry.set_count > 0 && (
                  <div className="text-right">
                    <p className="text-amber-400 font-bold text-lg leading-none">{entry.set_count}</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-wide">sets</p>
                  </div>
                )}
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </div>

            {entry.exercises?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {entry.exercises.slice(0, 5).map(name => (
                  <span key={name}
                    className="text-[11px] font-medium text-white/50 bg-white/8 border border-white/10 px-2.5 py-0.5 rounded-full">
                    {name}
                  </span>
                ))}
                {entry.exercises.length > 5 && (
                  <span className="text-[11px] font-medium text-white/30 px-2 py-0.5">
                    +{entry.exercises.length - 5} more
                  </span>
                )}
              </div>
            )}

            {entry.notes && (
              <p className="mt-3 text-xs text-white/35 leading-relaxed border-t border-white/8 pt-3 italic">
                {entry.notes}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Metric chart ──────────────────────────────────────────────
type MetricKey = 'weight_kg' | 'body_fat_pct' | 'energy_level' | 'sleep_hours'

const METRIC_TABS: {
  key: MetricKey; label: string; stroke: string; unit: string
  format: (v: number) => string
}[] = [
  { key: 'weight_kg',    label: 'Weight',   stroke: '#10b981', unit: 'kg',  format: v => `${v} kg`  },
  { key: 'body_fat_pct', label: 'Body Fat', stroke: '#14b8a6', unit: '%',   format: v => `${v}%`    },
  { key: 'energy_level', label: 'Energy',   stroke: '#f59e0b', unit: '/10', format: v => `${v}/10`  },
  { key: 'sleep_hours',  label: 'Sleep',    stroke: '#8b5cf6', unit: 'h',   format: v => `${v}h`    },
]

const SVG_W = 320, SVG_H = 160
const PAD   = { top: 20, right: 16, bottom: 28, left: 42 }
const CW    = SVG_W - PAD.left - PAD.right
const CH    = SVG_H - PAD.top  - PAD.bottom

function smoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i].x - pts[i - 1].x) / 3
    d += ` C ${pts[i-1].x + cp} ${pts[i-1].y} ${pts[i].x - cp} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  return d
}

function MetricChart({ entries, metric }: { entries: PortalMetricEntry[]; metric: MetricKey }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)

  const tab = METRIC_TABS.find(t => t.key === metric)!

  const pts = [...entries]
    .filter(e => e[metric] != null)
    .sort((a, b) => a.checked_in_at.localeCompare(b.checked_in_at))
    .map(e => ({ val: e[metric] as number, date: e.checked_in_at }))

  if (pts.length === 0) return null

  if (pts.length === 1) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl font-bold text-white">{tab.format(pts[0].val)}</p>
        <p className="text-white/30 text-xs mt-2 flex items-center justify-center gap-1">
          <Calendar size={10} />
          {new Date(pts[0].date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <p className="text-white/20 text-xs mt-4">Log more check-ins to see your trend</p>
      </div>
    )
  }

  const minVal = Math.min(...pts.map(p => p.val))
  const maxVal = Math.max(...pts.map(p => p.val))
  const range  = maxVal - minVal || 1

  const toX = (i: number) => PAD.left + (i / (pts.length - 1)) * CW
  const toY = (v: number) => PAD.top + CH - ((v - minVal) / range) * CH

  const svgPts = pts.map((p, i) => ({ ...p, x: toX(i), y: toY(p.val) }))
  const line   = smoothLinePath(svgPts)
  const area   = line + ` L ${svgPts[svgPts.length - 1].x} ${PAD.top + CH} L ${svgPts[0].x} ${PAD.top + CH} Z`
  const gradId = `mg-${metric}`

  const trend     = pts[pts.length - 1].val - pts[0].val
  const trendSign = trend > 0 ? '+' : ''

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  // Tooltip x clamp so it doesn't overflow SVG edges
  function tipX(x: number) { return Math.max(PAD.left + 28, Math.min(SVG_W - PAD.right - 28, x)) }

  return (
    <div className="rounded-2xl bg-white/4 border border-white/8 px-4 pt-4 pb-3">
      {/* Trend summary */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/30 text-[10px]">
          {fmtDate(pts[0].date)} → {fmtDate(pts[pts.length - 1].date)}
        </p>
        <p className={clsx('text-xs font-semibold',
          trend > 0.05 ? 'text-emerald-400' : trend < -0.05 ? 'text-rose-400' : 'text-white/30')}>
          {trendSign}{trend.toFixed(1)}{tab.unit}
        </p>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={tab.stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={tab.stroke} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map(t => {
          const y = PAD.top + CH * (1 - t)
          const v = minVal + range * t
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={PAD.left + CW} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 3.5} textAnchor="end"
                fill="rgba(255,255,255,0.22)" fontSize="9">
                {Number.isInteger(range) ? Math.round(v) : v.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <path d={area} fill={`url(#${gradId})`} />

        {/* Line */}
        <path d={line} stroke={tab.stroke} strokeWidth="2"
          fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + touch targets */}
        {svgPts.map((p, i) => (
          <g key={i}
            onMouseEnter={() => setHovIdx(i)}
            onMouseLeave={() => setHovIdx(null)}
            onClick={() => setHovIdx(hovIdx === i ? null : i)}>
            {/* large invisible hit area */}
            <rect x={p.x - 16} y={PAD.top} width={32} height={CH} fill="transparent" />
            {/* dot */}
            <circle cx={p.x} cy={p.y} r={hovIdx === i ? 5 : 3.5}
              fill={hovIdx === i ? tab.stroke : '#1a1a35'}
              stroke={tab.stroke} strokeWidth="2"
              style={{ transition: 'r 0.12s' }}
            />
            {/* tooltip */}
            {hovIdx === i && (
              <g>
                <rect x={tipX(p.x) - 30} y={p.y - 38} width={60} height={24} rx={7}
                  fill="rgba(10,10,28,0.95)" stroke={tab.stroke} strokeWidth="1" strokeOpacity="0.5" />
                <text x={tipX(p.x)} y={p.y - 21} textAnchor="middle"
                  fill="white" fontSize="11" fontWeight="700">{tab.format(p.val)}</text>
              </g>
            )}
          </g>
        ))}

        {/* X-axis date labels */}
        {[0, pts.length - 1].map(i => (
          <text key={i} x={svgPts[i].x} y={SVG_H - 4} textAnchor="middle"
            fill="rgba(255,255,255,0.2)" fontSize="9">
            {fmtDate(pts[i].date)}
          </text>
        ))}
        {pts.length > 3 && (
          <text x={svgPts[Math.floor(pts.length / 2)].x} y={SVG_H - 4} textAnchor="middle"
            fill="rgba(255,255,255,0.15)" fontSize="9">
            {fmtDate(pts[Math.floor(pts.length / 2)].date)}
          </text>
        )}
      </svg>
    </div>
  )
}

// ─── Metrics section view ──────────────────────────────────────
function MetricsView({ clientId }: { clientId: string }) {
  const [entries, setEntries]   = useState<PortalMetricEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selMetric, setSelMetric] = useState<MetricKey>('weight_kg')

  function loadEntries() {
    supabase.rpc('get_portal_metrics', { p_client_id: clientId }).then(({ data }) => {
      const rows = (data as PortalMetricEntry[]) ?? []
      setEntries(rows)
      setLoading(false)
      // Default to the first metric that actually has data
      const first = METRIC_TABS.find(t => rows.some(r => r[t.key] != null))
      if (first) setSelMetric(first.key)
    })
  }

  useEffect(() => { loadEntries() }, [clientId])

  const latest = entries[0]
  // Only show tabs that have at least one data point
  const availTabs = METRIC_TABS.filter(t => entries.some(e => e[t.key] != null))

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040]">
      {showForm && (
        <CheckInForm clientId={clientId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadEntries() }} />
      )}

      {/* Section header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-5 border-b border-white/8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <BarChart2 size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-base">Progress</p>
          <p className="text-white/35 text-xs">{loading ? '…' : `${entries.length} check-ins recorded`}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-500/20"
        >
          <TrendingUp size={13} /> Log Check-in
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-8">
        {loading ? (
          <LoadingCard label="Loading metrics" />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<BarChart2 size={28} className="text-emerald-400/60" />}
            title="No check-ins yet"
            subtitle="Your coach will record metrics here after each check-in."
            gradient="from-emerald-500/10 to-teal-500/10"
          />
        ) : (
          <>
            {/* Metric selector + chart */}
            {availTabs.length > 0 && (
              <div className="space-y-3">
                {/* Tab row */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  {availTabs.map(t => {
                    const active = selMetric === t.key
                    return (
                      <button key={t.key} onClick={() => setSelMetric(t.key)}
                        className={clsx(
                          'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                          active
                            ? 'text-white border-transparent'
                            : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60',
                        )}
                        style={active ? { background: t.stroke + '33', borderColor: t.stroke + '55', color: t.stroke } : {}}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
                {/* Chart */}
                <MetricChart entries={entries} metric={selMetric} />
              </div>
            )}

            {/* Latest snapshot */}
            {latest && (
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 p-5">
                <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">Latest Check-in</p>
                <p className="text-white/40 text-xs mb-4 flex items-center gap-1.5">
                  <Calendar size={11} />
                  {new Date(latest.checked_in_at).toLocaleDateString('en-AU', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {latest.weight_kg != null && (
                    <MetricPill icon={<Scale size={13} />} label="Weight" value={`${latest.weight_kg} kg`} color="text-emerald-300" />
                  )}
                  {latest.body_fat_pct != null && (
                    <MetricPill icon={<TrendingUp size={13} />} label="Body Fat" value={`${latest.body_fat_pct}%`} color="text-teal-300" />
                  )}
                  {latest.energy_level != null && (
                    <MetricPill icon={<Zap size={13} />} label="Energy" value={`${latest.energy_level}/10`} color="text-amber-300" />
                  )}
                  {latest.sleep_hours != null && (
                    <MetricPill icon={<Moon size={13} />} label="Sleep" value={`${latest.sleep_hours}h`} color="text-violet-300" />
                  )}
                </div>
                {latest.notes && (
                  <p className="mt-4 text-xs text-white/35 leading-relaxed border-t border-white/10 pt-3 italic">
                    {latest.notes}
                  </p>
                )}
              </div>
            )}

            {/* History list */}
            {entries.length > 1 && (
              <>
                <SectionLabel>All Check-ins</SectionLabel>
                <div className="space-y-2">
                  {entries.slice(1).map(entry => (
                    <div key={entry.id}
                      className="rounded-2xl bg-white/5 border border-white/8 px-4 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white/60 text-xs flex items-center gap-1.5">
                          <Calendar size={11} />
                          {new Date(entry.checked_in_at).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        {entry.weight_kg != null && (
                          <div>
                            <p className="text-white font-semibold text-sm">{entry.weight_kg}<span className="text-white/30 text-xs ml-0.5">kg</span></p>
                          </div>
                        )}
                        {entry.body_fat_pct != null && (
                          <div>
                            <p className="text-white/60 text-sm">{entry.body_fat_pct}<span className="text-white/30 text-xs ml-0.5">%</span></p>
                          </div>
                        )}
                        {entry.energy_level != null && (
                          <div className="flex items-center gap-1">
                            <Zap size={11} className="text-amber-400/60" />
                            <p className="text-white/50 text-xs">{entry.energy_level}/10</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Nutrition view ─────────────────────────────────────────────
function NutritionView({ clientId }: { clientId: string }) {
  const [plan, setPlan] = useState<{
    mfp_username?: string | null
    calories_target?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    notes?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.rpc('get_portal_nutrition', { p_client_id: clientId })
      if (!cancelled) {
        setPlan(data && Object.keys(data).length > 0 ? data : null)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  const hasMacros = plan && (
    plan.calories_target != null || plan.protein_g != null ||
    plan.carbs_g != null || plan.fat_g != null
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-5 border-b border-white/8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <Utensils size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base">Nutrition</p>
          <p className="text-white/35 text-xs">Meal plans & guidance</p>
        </div>
      </div>

      <div className="px-4 pt-5 pb-8 space-y-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : !plan ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <EmptyState
              icon={<Utensils size={28} className="text-rose-400/60" />}
              title="No nutrition plan yet"
              subtitle="Your coach hasn't set up nutrition guidance yet."
              gradient="from-rose-500/10 to-pink-500/10"
            />
          </div>
        ) : (
          <>
            {/* Coach notes */}
            {plan.notes && (
              <div className="rounded-2xl bg-white/6 border border-white/10 p-5">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">Coach Notes</p>
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{plan.notes}</p>
              </div>
            )}

            {/* Macro targets */}
            {hasMacros && (
              <div className="rounded-2xl bg-white/6 border border-white/10 p-5">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Daily Targets</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Calories', value: plan.calories_target, unit: 'kcal', color: 'from-orange-500 to-amber-400' },
                    { label: 'Protein',  value: plan.protein_g,       unit: 'g',    color: 'from-rose-500 to-pink-400'   },
                    { label: 'Carbs',    value: plan.carbs_g,         unit: 'g',    color: 'from-blue-500 to-cyan-400'   },
                    { label: 'Fat',      value: plan.fat_g,           unit: 'g',    color: 'from-violet-500 to-purple-400' },
                  ].map(m => m.value != null && (
                    <div key={m.label} className="rounded-xl bg-white/5 border border-white/8 px-4 py-3 flex flex-col gap-0.5">
                      <span className="text-white/45 text-xs">{m.label}</span>
                      <span className="text-white font-bold text-lg leading-none">{m.value}<span className="text-white/40 text-xs font-normal ml-1">{m.unit}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MFP button */}
            {plan.mfp_username && (
              <a
                href={`https://www.myfitnesspal.com/food/diary/${plan.mfp_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-rose-500/30 active:scale-95 transition-transform"
              >
                <ExternalLink size={16} />
                Open MyFitnessPal Diary
              </a>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Shared UI helpers ─────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1 h-px bg-white/8" />
      <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em] flex-shrink-0">{children}</p>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}

function EmptyState({ icon, title, subtitle, gradient }: {
  icon: React.ReactNode
  title: string
  subtitle: string
  gradient: string
}) {
  return (
    <div className={clsx('rounded-3xl bg-gradient-to-br border border-white/8 p-10 text-center backdrop-blur-sm', gradient)}>
      <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center mx-auto mb-5">
        {icon}
      </div>
      <p className="text-white/70 font-semibold text-base">{title}</p>
      <p className="text-white/30 text-sm mt-2 leading-relaxed">{subtitle}</p>
    </div>
  )
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-white/30 text-xs tracking-widest uppercase">{label}</p>
    </div>
  )
}

function MetricPill({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white/8 border border-white/10 rounded-xl px-3 py-2.5">
      <div className={clsx('flex items-center gap-1.5 mb-1', color)}>{icon}
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className={clsx('text-lg font-bold leading-none', color)}>{value}</p>
    </div>
  )
}

// ─── Messages view (client portal) ────────────────────────────
function MessagesView({ clientId, onUnreadChange }: {
  clientId: string
  onUnreadChange: (hasUnread: boolean) => void
}) {
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loading, setLoading]   = useState(true)
  const [draft, setDraft]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  function applyMessages(msgs: PortalMessage[]) {
    setMessages(msgs)
    // Notify parent if any coach messages are newer than last seen
    const lastSeen = Number(localStorage.getItem(`portal_msgs_seen_${clientId}`) ?? 0)
    const hasNew = msgs.some(m => m.sender_type === 'coach' && new Date(m.created_at).getTime() > lastSeen)
    onUnreadChange(hasNew)
  }

  async function fetchMessages() {
    await supabase.rpc('get_portal_conversation', { p_client_id: clientId })
    const { data } = await supabase.rpc('get_portal_messages', { p_client_id: clientId })
    applyMessages((data as PortalMessage[]) ?? [])
    setLoading(false)
  }

  // Initial load + poll every 4s (catches coach replies)
  useEffect(() => {
    let alive = true
    fetchMessages()
    const interval = setInterval(async () => {
      const { data } = await supabase.rpc('get_portal_messages', { p_client_id: clientId })
      if (alive && data) applyMessages(data as PortalMessage[])
    }, 4000)
    return () => { alive = false; clearInterval(interval) }
  }, [clientId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setDraft('')
    await supabase.rpc('send_portal_message', { p_client_id: clientId, p_content: text })
    const { data } = await supabase.rpc('get_portal_messages', { p_client_id: clientId })
    if (data) setMessages(data as PortalMessage[])
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/8 flex-shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
          <MessageCircle size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base">Messages</p>
          <p className="text-white/35 text-xs">Chat with your coach</p>
        </div>
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2">
            <Loader2 size={20} className="text-brand-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pt-20">
            <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
              <MessageCircle size={26} className="text-brand-400/50" />
            </div>
            <p className="text-white/60 font-semibold">No messages yet</p>
            <p className="text-white/30 text-sm max-w-[240px] leading-relaxed">
              Send your coach a message — they'll reply here.
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isClient = msg.sender_type === 'client'
            return (
              <div key={msg.id} className={clsx('flex', isClient ? 'justify-end' : 'justify-start')}>
                <div className={clsx(
                  'max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                  isClient
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-white rounded-bl-sm border border-white/10',
                )}>
                  <p>{msg.content}</p>
                  <p className={clsx('text-[10px] mt-1', isClient ? 'text-brand-200/70' : 'text-white/30')}>
                    {new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-8 pt-3 border-t border-white/8 bg-[#0a0a1a]/60 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-4 py-3 focus-within:border-brand-400/50 transition-all">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message your coach…"
            className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/35 outline-none"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            className={clsx(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
              draft.trim()
                ? 'bg-brand-600 hover:bg-brand-700 text-white active:scale-95'
                : 'bg-white/8 text-white/25 cursor-default',
            )}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Habits View ───────────────────────────────────────────────
function HabitsView({ clientId }: { clientId: string }) {
  const [habits, setHabits]           = useState<PortalHabit[]>([])
  const [loading, setLoading]         = useState(true)
  const [metricHabit, setMetricHabit] = useState<PortalHabit | null>(null)
  const [metricValue, setMetricValue] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    supabase.rpc('get_client_habits', { p_client_id: clientId, p_date: today })
      .then(({ data }) => { setHabits((data as PortalHabit[]) ?? []); setLoading(false) })
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(habit: PortalHabit, metricVal?: number) {
    setHabits(prev => prev.map(h => h.id === habit.id
      ? { ...h, completed_today: !h.completed_today, streak: h.completed_today ? Math.max(0, h.streak - 1) : h.streak + 1 }
      : h))
    await supabase.rpc('toggle_habit_completion', {
      p_client_id:    clientId,
      p_habit_id:     habit.id,
      p_date:         today,
      p_metric_value: metricVal ?? null,
    })
  }

  function handleHabitTap(habit: PortalHabit) {
    // If habit has a metric AND we're completing (not un-completing), show input sheet
    if (habit.metric_definition_id && !habit.completed_today) {
      setMetricHabit(habit)
      setMetricValue('')
    } else {
      toggle(habit)
    }
  }

  async function submitMetric() {
    if (!metricHabit) return
    const val = metricValue ? parseFloat(metricValue) : undefined
    await toggle(metricHabit, val)
    setMetricHabit(null)
    setMetricValue('')
  }

  const done  = habits.filter(h => h.completed_today).length
  const total = habits.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040] flex flex-col">

      {/* Metric input sheet */}
      {metricHabit && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMetricHabit(null)} />
          <div className="relative bg-[#1a1a35] border-t border-white/10 rounded-t-3xl px-5 pt-5 pb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{metricHabit.emoji}</span>
              <div>
                <p className="text-white font-bold">{metricHabit.name}</p>
                <p className="text-white/40 text-xs">Log {metricHabit.metric_emoji} {metricHabit.metric_name}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 bg-white/8 rounded-2xl px-4 py-3 mb-4">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={metricValue}
                onChange={e => setMetricValue(e.target.value)}
                placeholder="0"
                autoFocus
                className="flex-1 bg-transparent text-white text-3xl font-bold outline-none placeholder-white/20 [color-scheme:dark]"
              />
              {metricHabit.metric_unit && (
                <span className="text-white/40 text-lg">{metricHabit.metric_unit}</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { toggle(metricHabit); setMetricHabit(null) }}
                className="flex-1 py-3 rounded-2xl bg-white/8 text-white/50 font-semibold text-sm">
                Skip metric
              </button>
              <button
                onClick={submitMetric}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm">
                Complete + Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-14 pb-5 flex-shrink-0">
        <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em] mb-1">Daily Habits</p>
        <h1 className="text-[26px] font-extrabold text-white tracking-tight">
          {total === 0 ? 'No habits yet' : done === total ? 'All done! 🎉' : `${done} of ${total} done`}
        </h1>
        {total > 0 && (
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(done / total) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Habits list */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-4xl mb-3">✅</p>
            <p className="text-white/50 font-semibold">No habits assigned yet</p>
            <p className="text-white/25 text-sm mt-1">Ask your coach to set up your daily habits.</p>
          </div>
        ) : habits.map(h => (
          <button key={h.id} onClick={() => handleHabitTap(h)}
            className={clsx(
              'w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98]',
              h.completed_today
                ? 'bg-emerald-500/15 border-emerald-500/30'
                : 'bg-white/5 border-white/10 hover:bg-white/8',
            )}>
            <div className={clsx(
              'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-all',
              h.completed_today ? 'bg-emerald-500/25' : 'bg-white/8',
            )}>
              {h.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx('font-bold text-[15px] leading-tight',
                h.completed_today ? 'text-emerald-300 line-through decoration-emerald-400/50' : 'text-white')}>
                {h.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-xs text-white/30 capitalize">{h.frequency}</p>
                {h.metric_name && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/10 text-white/50">
                    {h.metric_emoji} {h.metric_name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {h.streak > 0 && (
                <span className="text-xs font-bold text-amber-400">🔥 {h.streak}</span>
              )}
              <div className={clsx(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                h.completed_today ? 'bg-emerald-500 border-emerald-500' : 'border-white/20',
              )}>
                {h.completed_today && <Check size={12} className="text-white" />}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Portal side navigation ────────────────────────────────────
function PortalSideNav({
  activeSection, hasUnreadMessages, portalSections, onNav, clientName,
}: {
  activeSection: ActiveSection
  hasUnreadMessages: boolean
  portalSections: string[]
  onNav: (s: ActiveSection) => void
  clientName: string
}) {
  const [open, setOpen] = useState(false)

  const navItems: {
    section: ActiveSection
    label: string
    icon: React.ElementType
    alwaysUnlocked?: boolean
    unread?: boolean
  }[] = [
    { section: null,             label: 'Home',           icon: Home,          alwaysUnlocked: true },
    { section: 'workouts',       label: 'Workouts',       icon: Dumbbell,      alwaysUnlocked: true },
    { section: 'plan',           label: 'Plan',           icon: Calendar,      alwaysUnlocked: true },
    { section: 'history',        label: 'History',        icon: History,       alwaysUnlocked: true },
    { section: 'metrics',        label: 'Metrics',        icon: TrendingUp,    alwaysUnlocked: true },
    { section: 'nutrition',      label: 'Nutrition',      icon: Utensils },
    { section: 'habits',         label: 'Habits',         icon: Repeat2,       alwaysUnlocked: true },
    { section: 'messages',       label: 'Messages',       icon: MessageCircle, alwaysUnlocked: true, unread: hasUnreadMessages },
    { section: 'accountability', label: 'Accountability', icon: Zap,           alwaysUnlocked: true },
    { section: 'community',      label: 'Community',      icon: Users2,        alwaysUnlocked: true },
  ]

  function NavContent() {
    return (
      <div className="h-full flex flex-col bg-[#09091a] border-r border-white/8 w-64 select-none">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Dumbbell size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">FitProto</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-white/40 hover:text-white p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Client name pill */}
        {clientName && (
          <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/8">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">Logged in as</p>
            <p className="text-[13px] font-semibold text-white truncate">{clientName}</p>
          </div>
        )}

        <div className="mx-4 h-px bg-white/8" />

        {/* Nav items */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ section, label, icon: Icon, alwaysUnlocked, unread }) => {
            const unlocked = alwaysUnlocked || portalSections.includes(section ?? '')
            const active = activeSection === section
            return (
              <button
                key={label}
                disabled={!unlocked}
                onClick={() => { if (unlocked) { onNav(section); setOpen(false) } }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative',
                  active
                    ? 'bg-gradient-to-r from-brand-600/25 to-brand-500/10 text-white border border-brand-500/20'
                    : unlocked
                      ? 'text-white/50 hover:bg-white/6 hover:text-white/80 border border-transparent'
                      : 'text-white/20 border border-transparent cursor-default',
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />
                )}
                <Icon size={17} className={active ? 'text-brand-400' : unlocked ? 'text-white/40' : 'text-white/15'} />
                <span className="flex-1 text-left">{label}</span>
                {!unlocked && <Lock size={12} className="text-white/20" />}
                {unread && unlocked && !active && (
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="mx-4 h-px bg-white/8" />

        {/* Settings (locked) */}
        <div className="px-3 py-3">
          <button
            disabled
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border border-transparent text-white/20 cursor-default"
          >
            <Settings size={17} className="text-white/15" />
            <span className="flex-1 text-left">Settings</span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-white/20 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">Soon</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop fixed sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
        <NavContent />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#09091a]/95 backdrop-blur-xl border-b border-white/8 flex items-center px-4 h-14">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-brand-500 to-violet-600 rounded-md flex items-center justify-center">
            <Dumbbell size={13} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight">FitProto</span>
        </div>
        {hasUnreadMessages && (
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
        )}
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50">
            <NavContent />
          </div>
        </>
      )}
    </>
  )
}

// ─── Dashboard section card ────────────────────────────────────
function DashboardCard({
  def, unlocked, workoutCount, completedCount, onClick,
}: {
  def: typeof SECTION_DEFS[number]
  unlocked: boolean
  workoutCount?: number
  completedCount?: number
  onClick: () => void
}) {
  const Icon = def.icon

  return (
    <button
      onClick={unlocked ? onClick : undefined}
      className={clsx(
        'relative rounded-2xl border p-5 text-left transition-all overflow-hidden',
        unlocked
          ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/12 hover:from-white/14 hover:to-white/8 active:scale-[0.97] shadow-xl shadow-black/30'
          : 'bg-white/4 border-white/8 cursor-default',
      )}>
      {/* Icon */}
      <div className={clsx(
        'w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-lg',
        unlocked
          ? `bg-gradient-to-br ${def.gradient} ${def.glow}`
          : 'bg-white/8',
      )}>
        <Icon size={22} className={unlocked ? 'text-white' : 'text-white/25'} />
      </div>

      <p className={clsx('font-bold text-[15px] leading-tight',
        unlocked ? 'text-white' : 'text-white/25')}>
        {def.label}
      </p>
      <p className={clsx('text-xs mt-0.5 leading-snug',
        unlocked ? 'text-white/45' : 'text-white/20')}>
        {def.desc}
      </p>

      {/* Workout badge */}
      {def.id === 'workouts' && unlocked && workoutCount != null && (
        <div className="mt-3 flex items-center gap-2">
          {(workoutCount - (completedCount ?? 0)) > 0 && (
            <span className="text-[11px] font-semibold bg-brand-500/25 text-brand-300 px-2 py-0.5 rounded-full">
              {workoutCount - (completedCount ?? 0)} pending
            </span>
          )}
          {(completedCount ?? 0) > 0 && (
            <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              {completedCount} done
            </span>
          )}
        </div>
      )}

      {/* Lock overlay */}
      {!unlocked && (
        <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-2 bg-black/30 backdrop-blur-[2px]">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <Lock size={16} className="text-white/40" />
          </div>
          <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wide">Locked</p>
        </div>
      )}
    </button>
  )
}

// ─── Main portal ───────────────────────────────────────────────
export default function ClientPortal() {
  const { clientId } = useParams<{ clientId: string }>()
  const [data, setData]                     = useState<PortalData | null>(null)
  const [loading, setLoading]               = useState(true)
  const [notFound, setNotFound]             = useState(false)
  const [activeSection, setActiveSection]     = useState<ActiveSection>(null)
  const [mountedSections, setMountedSections] = useState<Set<string>>(new Set())
  const [tasks, setTasks]                   = useState<PortalTask[]>([])
  const [habits, setHabits]                 = useState<PortalHabit[]>([])
  const [accountability, setAccountability] = useState<PortalAccountabilityData | null>(null)
  const [loggingWorkout, setLoggingWorkout] = useState<PortalWorkout | null>(null)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

  useEffect(() => {
    if (!clientId) return
    supabase.rpc('get_portal_data', { p_client_id: clientId }).then(({ data: result, error }) => {
      if (error || !result) setNotFound(true)
      else setData(result as PortalData)
      setLoading(false)
    })
    supabase.rpc('get_portal_tasks', { p_client_id: clientId }).then(({ data: taskData }) => {
      if (taskData) setTasks(taskData as PortalTask[])
    })
    const today = new Date().toISOString().slice(0, 10)
    supabase.rpc('get_client_habits', { p_client_id: clientId, p_date: today }).then(({ data: habitData }) => {
      if (habitData) setHabits(habitData as PortalHabit[])
    })
    supabase.rpc('get_portal_accountability', { p_client_id: clientId }).then(({ data: accData }) => {
      if (accData) setAccountability(accData as PortalAccountabilityData)
    })
  }, [clientId])

  // Background poll — picks up newly assigned workouts without a page refresh
  useEffect(() => {
    if (!clientId) return
    let alive = true
    const id = setInterval(async () => {
      const { data: result } = await supabase.rpc('get_portal_data', { p_client_id: clientId })
      if (alive && result) setData(result as PortalData)
      const { data: taskData } = await supabase.rpc('get_portal_tasks', { p_client_id: clientId })
      if (alive && taskData) setTasks(taskData as PortalTask[])
    }, 30_000)
    return () => { alive = false; clearInterval(id) }
  }, [clientId])

  function markComplete(clientWorkoutId: string) {
    setData(prev => prev ? {
      ...prev,
      workouts: prev.workouts.map(w => w.id === clientWorkoutId ? { ...w, status: 'completed' } : w),
    } : prev)
  }

  function goTo(section: ActiveSection) {
    if (section === 'messages') {
      localStorage.setItem(`portal_msgs_seen_${clientId}`, String(Date.now()))
      setHasUnreadMessages(false)
    }
    if (section !== null) setMountedSections(prev => new Set([...prev, section]))
    setActiveSection(section)
  }

  // Background poll — checks for new coach messages regardless of active tab
  useEffect(() => {
    if (!clientId) return
    let alive = true
    async function checkUnread() {
      const { data } = await supabase.rpc('get_portal_messages', { p_client_id: clientId })
      if (!alive || !data) return
      const lastSeen = Number(localStorage.getItem(`portal_msgs_seen_${clientId}`) ?? 0)
      const hasNew = (data as PortalMessage[]).some(
        m => m.sender_type === 'coach' && new Date(m.created_at).getTime() > lastSeen
      )
      setHasUnreadMessages(hasNew)
    }
    checkUnread()
    const id = setInterval(checkUnread, 8000)
    return () => { alive = false; clearInterval(id) }
  }, [clientId])

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-xl shadow-brand-500/30">
          <Dumbbell size={24} className="text-white" />
        </div>
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  // ── Not found ──
  if (notFound || !data) return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040] flex items-center justify-center p-6">
      <EmptyState
        icon={<Dumbbell size={28} className="text-white/30" />}
        title="Portal not found"
        subtitle="This link may be invalid or expired. Contact your coach for a new link."
        gradient="from-white/5 to-white/3"
      />
    </div>
  )

  const unlocked   = data.portal_sections ?? ['workouts']
  const assigned   = data.workouts.filter(w => w.status === 'assigned')
  const todayDate  = new Date(); todayDate.setHours(0, 0, 0, 0)

  // Strictly today only — no fallback to first assigned workout
  const todaysWorkout = assigned.find(w => {
    if (!w.due_date) return false
    const d = new Date(w.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0)
    return d.getTime() === todayDate.getTime()
  }) ?? null

  // Overdue = due_date in the past
  const overdueWorkouts = assigned.filter(w => {
    if (!w.due_date) return false
    const d = new Date(w.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0)
    return d < todayDate
  })

  // Next upcoming workout (future, not today)
  const nextWorkout = assigned
    .filter(w => {
      if (!w.due_date) return false
      const d = new Date(w.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0)
      return d > todayDate
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0] ?? null

  // Tasks due today or overdue only — not future or already completed
  const dueTodayTasks = tasks.filter(t => {
    if (t.completed) return false
    if (!t.due_date) return false
    const d = new Date(t.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0)
    return d <= todayDate
  })

  // Greeting based on time of day
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Rotating motivational content (by day of week)
  const MOTIV = [
    { headline: 'Stay consistent',    sub: 'Every rest day is building towards your next breakthrough.' },
    { headline: 'Recovery matters',   sub: 'Your muscles grow when you rest. Take it easy today.' },
    { headline: 'Keep the momentum',  sub: 'No session today — but your next one is just around the corner.' },
    { headline: 'Trust the process',  sub: 'Consistency over time beats intensity every time.' },
    { headline: 'You\'re doing great', sub: 'Rest days are part of the plan. Show up tomorrow.' },
    { headline: 'Recharge today',     sub: 'Fuel up, sleep well, and come back stronger.' },
    { headline: 'Active recovery',    sub: 'A walk, a stretch, some good food — that\'s the plan today.' },
  ]
  const motiv = MOTIV[todayDate.getDay()]

  const clientName = data?.name ?? ''

  return (
    <div className="flex min-h-screen">
      {/* ── Side nav ── */}
      <PortalSideNav
        activeSection={activeSection}
        hasUnreadMessages={hasUnreadMessages}
        portalSections={unlocked}
        onNav={goTo}
        clientName={clientName}
      />

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 lg:ml-64 pt-14 lg:pt-0">

      {/* ── Log workout overlay (highest z) ── */}
      {loggingWorkout && (
        <PortalLogOverlay
          cw={loggingWorkout}
          clientId={clientId!}
          onClose={() => setLoggingWorkout(null)}
          onDone={(id) => { markComplete(id); setLoggingWorkout(null) }}
        />
      )}

      {/* ── Section views ── */}
      {mountedSections.has('plan') && (
        <div className={activeSection !== 'plan' ? 'hidden' : ''}>
        <PlanView
          data={data}
          tasks={tasks}
          habits={habits}
          clientId={clientId!}
          onRescheduleWorkout={(workoutId, newDate) => {
            setData(prev => prev ? {
              ...prev,
              workouts: prev.workouts.map(w =>
                w.id === workoutId ? { ...w, due_date: newDate } : w
              ),
            } : prev)
          }}
          onTaskToggled={(taskId) => {
            setTasks(prev => prev.map(t =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            ))
          }}
        />
        </div>
      )}
      {mountedSections.has('workouts') && (
        <div className={activeSection !== 'workouts' ? 'hidden' : ''}>
          <WorkoutsView data={data} clientId={clientId!} onMarkComplete={markComplete} />
        </div>
      )}
      {mountedSections.has('history') && (
        <div className={activeSection !== 'history' ? 'hidden' : ''}>
          <HistoryView clientId={clientId!} />
        </div>
      )}
      {mountedSections.has('metrics') && (
        <div className={activeSection !== 'metrics' ? 'hidden' : ''}>
          <MetricsView clientId={clientId!} />
        </div>
      )}
      {mountedSections.has('nutrition') && (
        <div className={activeSection !== 'nutrition' ? 'hidden' : ''}>
          <NutritionView clientId={clientId!} />
        </div>
      )}
      {mountedSections.has('messages') && (
        <div className={activeSection !== 'messages' ? 'hidden' : ''}>
          <MessagesView clientId={clientId!} onUnreadChange={setHasUnreadMessages} />
        </div>
      )}
      {mountedSections.has('habits') && (
        <div className={activeSection !== 'habits' ? 'hidden' : ''}>
          <HabitsView clientId={clientId!} />
        </div>
      )}
      {mountedSections.has('community') && (
        <div className={activeSection !== 'community' ? 'hidden' : ''}>
          <CommunityView clientId={clientId!} />
        </div>
      )}
      {mountedSections.has('accountability') && (
        <div className={activeSection !== 'accountability' ? 'hidden' : ''}>
          <AccountabilityView data={accountability} />
        </div>
      )}

      {/* ── Dashboard (home) ── */}
      {activeSection === null && (
        <div className="min-h-screen bg-[#f1f5f9]">
          <div className="pb-8">

            {/* Greeting */}
            <div className="px-5 pt-14 pb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{greeting}</p>
              <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">
                {todaysWorkout ? 'Time to train 💪' : "You've got this"}
              </h1>
            </div>

            {/* ── Hero card ── */}
            <div className="px-4 mb-3">
              {todaysWorkout ? (
                /* Workout due today */
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1e4ed8] via-[#2563eb] to-[#7c3aed] p-6 shadow-xl shadow-blue-900/25 min-h-[220px] flex flex-col">
                  <div className="absolute -top-8 -right-8 pointer-events-none select-none opacity-[0.18]">
                    <Dumbbell size={190} className="text-white" style={{ transform: 'rotate(-25deg)' }} />
                  </div>
                  <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.2em] mb-3">
                    Today's Workout
                  </p>
                  <h2 className="text-white text-[22px] font-extrabold leading-tight max-w-[68%]">
                    {todaysWorkout.workout.name}
                  </h2>
                  <div className="flex-1" />
                  {todaysWorkout.workout.duration_minutes && (
                    <p className="text-white/60 text-sm flex items-center gap-1.5 mb-4">
                      <Clock size={13} />{todaysWorkout.workout.duration_minutes} min
                    </p>
                  )}
                  <button
                    onClick={() => setLoggingWorkout(todaysWorkout)}
                    className="self-start bg-white text-[#1e4ed8] font-bold px-8 py-3.5 rounded-full text-[15px] shadow-lg hover:bg-white/95 active:scale-[0.97] transition-all"
                  >
                    Start workout
                  </button>
                </div>
              ) : (
                /* No workout today — motivational + next session teaser */
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 shadow-xl min-h-[200px] flex flex-col">
                  <div className="absolute -top-6 -right-6 pointer-events-none select-none opacity-[0.07]">
                    <Target size={180} className="text-white" />
                  </div>
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em] mb-3">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <h2 className="text-white text-[22px] font-extrabold leading-tight">
                    {motiv.headline}
                  </h2>
                  <p className="text-white/50 text-sm mt-2 leading-relaxed max-w-[80%]">
                    {motiv.sub}
                  </p>
                  <div className="flex-1" />
                  {nextWorkout && (
                    <div className="mt-4 flex items-center gap-2.5 bg-white/8 rounded-2xl px-4 py-3 border border-white/10 self-start">
                      <Calendar size={14} className="text-brand-400 flex-shrink-0" />
                      <div>
                        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide">Next session</p>
                        <p className="text-white/80 text-sm font-bold leading-tight">
                          {nextWorkout.workout.name}
                          <span className="font-normal text-white/40"> · {new Date(nextWorkout.due_date! + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Overdue workouts (persistent, below hero) ── */}
            {overdueWorkouts.length > 0 && (
              <div className="mx-4 mb-3">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 overflow-hidden">
                  <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-orange-500">Overdue</span>
                    <span className="text-[11px] font-bold text-orange-400 bg-orange-100 rounded-full px-2 py-0.5">
                      {overdueWorkouts.length}
                    </span>
                  </div>
                  <div>
                    {overdueWorkouts.map((w, i) => {
                      const isLast = i === overdueWorkouts.length - 1
                      const dueDate = new Date(w.due_date! + 'T00:00:00')
                      const daysAgo = Math.round((todayDate.getTime() - dueDate.getTime()) / 86400000)
                      return (
                        <div
                          key={w.id}
                          className={clsx(
                            'flex items-center gap-3 px-4 py-3',
                            !isLast && 'border-b border-orange-100',
                          )}
                        >
                          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Dumbbell size={14} className="text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-gray-800 leading-tight truncate">
                              {w.workout.name}
                            </p>
                            <p className="text-xs text-orange-500 font-medium mt-0.5">
                              {daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
                            </p>
                          </div>
                          {unlocked.includes('workouts') && (
                            <button
                              onClick={() => goTo('workouts')}
                              className="text-xs font-bold text-orange-500 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
                            >
                              Log it
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Today's habits quick-view ── */}
            {habits.length > 0 && (
              <div className="mx-4 mb-3">
                <button onClick={() => goTo('habits')} className="w-full text-left">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                      <h3 className="text-[15px] font-bold text-gray-900">Today's Habits</h3>
                      <span className="text-xs font-bold text-emerald-600">
                        {habits.filter(h => h.completed_today).length}/{habits.length} done
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mx-4 mb-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${(habits.filter(h => h.completed_today).length / habits.length) * 100}%` }} />
                    </div>
                    <div className="flex gap-2 px-4 pb-3 flex-wrap">
                      {habits.slice(0, 5).map(h => (
                        <div key={h.id} className={clsx(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold',
                          h.completed_today ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500',
                        )}>
                          <span>{h.emoji}</span>
                          <span className={h.completed_today ? 'line-through' : ''}>{h.name}</span>
                        </div>
                      ))}
                      {habits.length > 5 && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-400 font-semibold">
                          +{habits.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* ── Tasks due today / overdue ── */}
            {dueTodayTasks.length > 0 && (
              <div className="mx-4 mb-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-gray-900">Due today</h3>
                    <span className="text-xs font-bold text-gray-400">{dueTodayTasks.length} task{dueTodayTasks.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div>
                    {dueTodayTasks.map((task, i) => {
                      const isLast  = i === dueTodayTasks.length - 1
                      const dueObj  = new Date(task.due_date! + 'T00:00:00'); dueObj.setHours(0,0,0,0)
                      const overdue = dueObj < todayDate
                      return (
                        <div
                          key={task.id}
                          className={clsx('flex items-center gap-3 px-4 py-3.5', !isLast && 'border-b border-gray-100')}
                        >
                          <div className={clsx(
                            'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            overdue ? 'border-orange-300' : 'border-gray-200',
                          )}>
                            <CheckCircle2 size={14} className={overdue ? 'text-orange-300' : 'text-gray-200'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-gray-800 leading-tight">{task.title}</p>
                            {overdue && (
                              <p className="text-xs font-medium text-orange-500 mt-0.5">
                                Overdue · {dueObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Accountability widget ── */}
            {accountability && accountability.open_sessions.length > 0 && (() => {
              const totalTasks = accountability.open_sessions.reduce((s, sess) => s + sess.tasks.length, 0)
              const doneTasks  = accountability.open_sessions.reduce((s, sess) => s + sess.tasks.filter(t => t.completed === true).length, 0)
              const pending    = totalTasks - doneTasks
              return (
                <div className="mx-4 mb-3">
                  <button
                    onClick={() => goTo('accountability')}
                    className="w-full text-left bg-gradient-to-br from-orange-50 to-rose-50 rounded-2xl border border-orange-100 shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                          <Zap size={15} className="text-white" />
                        </div>
                        <span className="text-[14px] font-bold text-gray-900">Accountability</span>
                      </div>
                      <span className="text-[12px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                        {pending} pending
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-500 leading-snug">
                      {accountability.open_sessions.length} open session{accountability.open_sessions.length !== 1 ? 's' : ''} — {doneTasks}/{totalTasks} tasks complete
                    </p>
                  </button>
                </div>
              )
            })()}

            <p className="text-center text-[11px] text-gray-300 pt-6 pb-2 uppercase tracking-[0.2em] font-medium">
              Powered by FitProto
            </p>
          </div>
        </div>
      )}

      </div>{/* end main content */}
    </div>
  )
}
