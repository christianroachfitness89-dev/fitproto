import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Dumbbell, CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp,
  Loader2, Target, ClipboardList, ArrowLeft, Lock,
  BarChart2, Utensils, History, TrendingUp, Scale, Zap, Moon, ChevronRight,
  X, Home, MoreHorizontal, MessageCircle, Settings, Send,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { playRestEndChime } from '@/lib/sound'
import clsx from 'clsx'

// ─── Types ─────────────────────────────────────────────────────
type ActiveSection = 'workouts' | 'history' | 'metrics' | 'nutrition' | 'messages' | null

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

interface PortalData {
  name: string
  status: string
  goal: string | null
  workouts: PortalWorkout[]
  portal_sections: string[]
}

interface PortalSet {
  set_number: number
  reps: number | null
  weight: number | null
  duration_seconds: number | null
  distance_meters: number | null
  rest_seconds: number | null
}

interface PortalExercise {
  id: string
  name: string
  order_index: number
  metric_type: string
  muscle_group: string | null
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

interface PortalTask {
  id: string
  title: string
  type: string | null
  due_date: string | null
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

// ─── Log session overlay ───────────────────────────────────────
function PortalLogOverlay({ cw, clientId, onClose, onDone }: {
  cw: PortalWorkout
  clientId: string
  onClose: () => void
  onDone: (id: string) => void
}) {
  const [detail, setDetail]     = useState<PortalWorkoutDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [entries, setEntries]   = useState<Record<string, SetEntry>>({})
  const [completedAt, setCompletedAt] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [doneSets, setDoneSets] = useState<Set<string>>(new Set())
  const [restTimer, setRestTimer] = useState<{ restSeconds: number; label: string } | null>(null)

  function handleSetDone(key: string, exerciseName: string, setNumber: number, restSeconds: number) {
    setDoneSets(prev => new Set([...prev, key]))
    if (restSeconds > 0) setRestTimer({ restSeconds, label: `${exerciseName} — Set ${setNumber} complete` })
  }

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
            init[`${ex.id}-${s.set_number}`] = {
              reps:     s.reps?.toString()             ?? '',
              weight:   s.weight?.toString()           ?? '',
              duration: s.duration_seconds?.toString() ?? '',
              distance: s.distance_meters?.toString()  ?? '',
              rpe:      '',
            }
        setEntries(init)
      }
      setLoading(false)
    })
  }, [cw.id, clientId])

  function setField(key: string, field: keyof SetEntry, value: string) {
    setEntries(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  async function submit() {
    setError(null); setSaving(true)
    const setLogs = (detail?.exercises ?? []).flatMap(ex =>
      (ex.sets ?? []).map(s => {
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
    setTimeout(() => { onDone(cw.id); onClose() }, 1000)
  }

  const inp = 'w-full px-2 py-2 text-[13px] text-center bg-[#1e1e3a] border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all'

  // Count total and done sets for progress
  const totalSets = (detail?.exercises ?? []).reduce((n, ex) => n + (ex.sets?.length ?? 0), 0)
  const doneSetsCount = doneSets.size

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#0a0a1a] via-[#12122a] to-[#1a0f30] flex flex-col">
      {restTimer && (
        <RestTimer restSeconds={restTimer.restSeconds} label={restTimer.label} onDone={() => setRestTimer(null)} />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/8">
        <button onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base truncate">{cw.workout.name}</p>
          <p className="text-white/35 text-xs tracking-wide">
            {loading ? 'Loading…' : `${doneSetsCount} / ${totalSets} sets done`}
          </p>
        </div>
        <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
          className="px-3 py-2 text-[11px] bg-white/8 border border-white/12 rounded-2xl text-white/80 focus:outline-none focus:border-brand-400" />
      </div>

      {/* Progress bar */}
      {!loading && totalSets > 0 && (
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
            style={{ width: `${(doneSetsCount / totalSets) * 100}%` }}
          />
        </div>
      )}

      {/* Exercises */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-white/30 text-xs tracking-widest uppercase">Loading exercises</p>
          </div>
        ) : (detail?.exercises ?? []).map((ex, idx) => {
          const metric     = ex.metric_type ?? 'reps_weight'
          const isWeighted = metric === 'reps_weight'
          const isTimed    = metric === 'time'
          const isDistance = metric === 'distance'
          const colClass   = isWeighted
            ? 'grid-cols-[28px_1fr_1fr_52px_38px]'
            : 'grid-cols-[28px_1fr_52px_38px]'

          const exSets    = ex.sets ?? []
          const exDone    = exSets.filter(s => doneSets.has(`${ex.id}-${s.set_number}`)).length

          return (
            <div key={ex.id} className="rounded-2xl bg-white/5 border border-white/8 p-4">
              {/* Exercise header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[11px] font-bold text-white/50 flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[15px] leading-tight">{ex.name}</p>
                  {ex.muscle_group && (
                    <p className="text-white/35 text-[11px] font-medium mt-0.5">{ex.muscle_group}</p>
                  )}
                </div>
                {exSets.length > 0 && (
                  <span className="text-[11px] font-semibold text-white/30">
                    {exDone}/{exSets.length}
                  </span>
                )}
              </div>

              {/* Column headers */}
              <div className={clsx('grid gap-2 text-[10px] text-white/25 font-bold uppercase tracking-wide px-1 pb-2 mb-2 border-b border-white/6', colClass)}>
                <span>#</span>
                {isWeighted && <><span>Reps</span><span>Weight</span></>}
                {isTimed    && <span>Duration (s)</span>}
                {isDistance && <span>Distance (m)</span>}
                {metric === 'reps' && <span>Reps</span>}
                <span>RPE</span>
                <span />
              </div>

              {/* Set rows */}
              <div className="space-y-2">
                {exSets.map(s => {
                  const key  = `${ex.id}-${s.set_number}`
                  const e    = entries[key] ?? { reps: '', weight: '', duration: '', distance: '', rpe: '' }
                  const done = doneSets.has(key)
                  return (
                    <div key={s.set_number}
                      className={clsx('grid gap-2 items-center rounded-xl px-2 py-1.5 border transition-all',
                        done
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-white/4 border-white/8',
                        colClass,
                      )}>
                      <div className={clsx(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mx-auto',
                        done ? 'bg-emerald-500/25 text-emerald-400' : 'text-white/35',
                      )}>
                        {s.set_number}
                      </div>
                      {isWeighted && (
                        <>
                          <input type="number" inputMode="numeric" min={0} value={e.reps}
                            onChange={ev => setField(key, 'reps', ev.target.value)}
                            placeholder={s.reps?.toString() ?? '—'}
                            className={clsx(inp, done && 'opacity-50')} />
                          <input type="number" inputMode="decimal" min={0} step={0.5} value={e.weight}
                            onChange={ev => setField(key, 'weight', ev.target.value)}
                            placeholder={s.weight?.toString() ?? '—'}
                            className={clsx(inp, done && 'opacity-50')} />
                        </>
                      )}
                      {isTimed && (
                        <input type="number" inputMode="numeric" min={0} value={e.duration}
                          onChange={ev => setField(key, 'duration', ev.target.value)}
                          placeholder={s.duration_seconds?.toString() ?? '—'}
                          className={clsx(inp, done && 'opacity-50')} />
                      )}
                      {isDistance && (
                        <input type="number" inputMode="decimal" min={0} step={0.1} value={e.distance}
                          onChange={ev => setField(key, 'distance', ev.target.value)}
                          placeholder={s.distance_meters?.toString() ?? '—'}
                          className={clsx(inp, done && 'opacity-50')} />
                      )}
                      {metric === 'reps' && (
                        <input type="number" inputMode="numeric" min={0} value={e.reps}
                          onChange={ev => setField(key, 'reps', ev.target.value)}
                          placeholder={s.reps?.toString() ?? '—'}
                          className={clsx(inp, done && 'opacity-50')} />
                      )}
                      <input type="number" inputMode="numeric" min={1} max={10} value={e.rpe}
                        onChange={ev => setField(key, 'rpe', ev.target.value)}
                        placeholder="RPE"
                        className={clsx(inp, done && 'opacity-50')} />
                      <button type="button"
                        onClick={() => handleSetDone(key, ex.name, s.set_number, s.rest_seconds ?? 0)}
                        className={clsx(
                          'w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                          done
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40'
                            : 'bg-white/8 text-white/35 hover:bg-white/18 hover:text-white border border-white/10',
                        )}>
                        <CheckCircle2 size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom bar */}
      <div className="px-4 pb-8 pt-4 border-t border-white/8 space-y-3 bg-[#0a0a1a]/60 backdrop-blur-md">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-300 text-sm">
            {error}
          </div>
        )}
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Session notes (optional)..."
          rows={2}
          className="w-full px-3.5 py-2.5 text-sm bg-white/6 border border-white/10 rounded-2xl text-white placeholder-white/25 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 transition-all resize-none leading-relaxed"
        />
        <button
          onClick={submit}
          disabled={saving || saved || loading}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-4 text-[15px] font-bold tracking-wide text-white rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl',
            saved
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/30'
              : 'bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 shadow-brand-600/30',
          )}>
          {saving
            ? <><Loader2 size={16} className="animate-spin" />Saving…</>
            : saved
              ? <><CheckCircle2 size={16} />Session Saved!</>
              : <><ClipboardList size={16} />Save Session</>}
        </button>
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

// ─── Workouts section view ─────────────────────────────────────
function WorkoutsView({ data, clientId, onMarkComplete }: {
  data: PortalData
  clientId: string
  onMarkComplete: (id: string) => void
}) {
  const [logging, setLogging] = useState<PortalWorkout | null>(null)
  const assigned  = data.workouts.filter(w => w.status === 'assigned')
  const completed = data.workouts.filter(w => w.status === 'completed')

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

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6 pb-28">
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

        {assigned.length === 0 && (
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
    <div className="fixed inset-0 z-30 bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-5 border-b border-white/8 flex-shrink-0">
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

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3 pb-28">
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

// ─── Metrics section view ──────────────────────────────────────
function MetricsView({ clientId }: { clientId: string }) {
  const [entries, setEntries] = useState<PortalMetricEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_portal_metrics', { p_client_id: clientId }).then(({ data }) => {
      setEntries((data as PortalMetricEntry[]) ?? [])
      setLoading(false)
    })
  }, [clientId])

  const latest = entries[0]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040]">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-5 border-b border-white/8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <BarChart2 size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base">Progress</p>
          <p className="text-white/35 text-xs">{loading ? '…' : `${entries.length} check-ins recorded`}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-28">
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

// ─── Nutrition placeholder view ────────────────────────────────
function NutritionView() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] via-[#1a1a35] to-[#1e1040]">
      <div className="flex items-center gap-3 px-4 pt-14 pb-5 border-b border-white/8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <Utensils size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base">Nutrition</p>
          <p className="text-white/35 text-xs">Meal plans & guidance</p>
        </div>
      </div>
      <div className="flex items-center justify-center min-h-[60vh] px-6 pb-28">
        <EmptyState
          icon={<Utensils size={28} className="text-rose-400/60" />}
          title="Coming soon"
          subtitle="Your nutrition plans and meal guidance will appear here once your coach sets it up."
          gradient="from-rose-500/10 to-pink-500/10"
        />
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
function MessagesView({ clientId }: { clientId: string }) {
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loading, setLoading]   = useState(true)
  const [draft, setDraft]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  async function fetchMessages() {
    await supabase.rpc('get_portal_conversation', { p_client_id: clientId })
    const { data } = await supabase.rpc('get_portal_messages', { p_client_id: clientId })
    setMessages((data as PortalMessage[]) ?? [])
    setLoading(false)
  }

  // Initial load + poll every 4s (catches coach replies)
  useEffect(() => {
    let alive = true
    fetchMessages()
    const interval = setInterval(async () => {
      const { data } = await supabase.rpc('get_portal_messages', { p_client_id: clientId })
      if (alive && data) setMessages(data as PortalMessage[])
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
      <div className="px-4 pb-28 pt-3 border-t border-white/8 bg-[#0a0a1a]/60 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-4 py-3 focus-within:border-brand-400/50 transition-all">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message your coach…"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
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

// ─── More sheet (slide-up) ─────────────────────────────────────
function MoreSheet({
  onClose, onNavigate, portalSections,
}: {
  onClose: () => void
  onNavigate: (section: ActiveSection) => void
  portalSections: string[]
}) {
  const items = [
    {
      section: 'history' as const,
      label: 'History',
      desc: 'Past sessions & logs',
      icon: History,
      gradient: 'from-amber-500 to-orange-500',
      glow: 'shadow-amber-500/30',
      bg: 'from-amber-500/15 to-orange-500/10',
      border: 'border-amber-500/20',
      alwaysUnlocked: true,
    },
    {
      section: 'nutrition' as const,
      label: 'Nutrition',
      desc: 'Meal plans & guidance',
      icon: Utensils,
      gradient: 'from-rose-500 to-pink-500',
      glow: 'shadow-rose-500/30',
      bg: 'from-rose-500/15 to-pink-500/10',
      border: 'border-rose-500/20',
      alwaysUnlocked: false,
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-[#0d0d20] border-t border-white/10 pb-10">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-2 flex items-center justify-between">
          <p className="text-white font-bold text-lg">More</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pt-2 space-y-2">
          {items.map(item => {
            const Icon = item.icon
            const unlocked = item.alwaysUnlocked || portalSections.includes(item.section)
            return (
              <button
                key={item.section}
                onClick={() => { onNavigate(item.section); onClose() }}
                disabled={!unlocked}
                className={clsx(
                  'w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all active:scale-[0.98]',
                  unlocked
                    ? `bg-gradient-to-br ${item.bg} border ${item.border}`
                    : 'bg-white/4 border border-white/8 opacity-60',
                )}
              >
                <div className={clsx(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0',
                  unlocked ? `bg-gradient-to-br ${item.gradient} shadow-${item.glow}` : 'bg-white/10',
                )}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('font-bold text-[15px]', unlocked ? 'text-white' : 'text-white/30')}>
                    {item.label}
                  </p>
                  <p className={clsx('text-xs mt-0.5', unlocked ? 'text-white/45' : 'text-white/20')}>
                    {item.desc}
                  </p>
                </div>
                {!unlocked && (
                  <div className="flex items-center gap-1 text-white/25">
                    <Lock size={14} />
                  </div>
                )}
                {unlocked && <ChevronRight size={18} className="text-white/30 flex-shrink-0" />}
              </button>
            )
          })}

          {/* Settings row */}
          <div className="border-t border-white/8 pt-2 mt-1">
            <button className="w-full flex items-center gap-4 rounded-2xl p-4 text-left bg-white/4 border border-white/8 opacity-60 cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Settings size={20} className="text-white/40" />
              </div>
              <div>
                <p className="font-bold text-[15px] text-white/30">Settings</p>
                <p className="text-xs text-white/20 mt-0.5">Coming soon</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Universal bottom tab bar ──────────────────────────────────
function BottomTabBar({
  activeSection, showMore, onTab, onMoreToggle,
}: {
  activeSection: ActiveSection
  showMore: boolean
  onTab: (s: ActiveSection) => void
  onMoreToggle: () => void
}) {
  const tabs = [
    { label: 'Home',     Icon: Home,           section: null as ActiveSection },
    { label: 'Workouts', Icon: Dumbbell,        section: 'workouts' as ActiveSection },
    { label: 'Messages', Icon: MessageCircle,   section: 'messages' as ActiveSection },
    { label: 'Progress', Icon: TrendingUp,      section: 'metrics' as ActiveSection },
  ]

  // "More" is active when the sheet is open or on a sub-page (nutrition, history)
  const moreActive = showMore || activeSection === 'nutrition' || activeSection === 'history'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#09091a]/95 backdrop-blur-xl border-t border-white/10">
      <div className="flex">
        {tabs.map(({ label, Icon, section }) => {
          const active = !moreActive && activeSection === section
          return (
            <button
              key={label}
              onClick={() => onTab(section)}
              className="flex-1 flex flex-col items-center gap-1 py-3 pb-6 transition-colors"
            >
              <Icon size={22} className={active ? 'text-brand-400' : 'text-white/35'} />
              <span className={clsx('text-[10px] font-semibold tracking-wide',
                active ? 'text-brand-400' : 'text-white/35')}>
                {label}
              </span>
            </button>
          )
        })}

        {/* More tab */}
        <button
          onClick={onMoreToggle}
          className="flex-1 flex flex-col items-center gap-1 py-3 pb-6 transition-colors"
        >
          <MoreHorizontal size={22} className={moreActive ? 'text-brand-400' : 'text-white/35'} />
          <span className={clsx('text-[10px] font-semibold tracking-wide',
            moreActive ? 'text-brand-400' : 'text-white/35')}>
            More
          </span>
        </button>
      </div>
    </div>
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
  const [activeSection, setActiveSection]   = useState<ActiveSection>(null)
  const [showMore, setShowMore]             = useState(false)
  const [tasks, setTasks]                   = useState<PortalTask[]>([])
  const [loggingWorkout, setLoggingWorkout] = useState<PortalWorkout | null>(null)
  const [missedBannerDismissed, setMissedBannerDismissed] = useState(false)

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
  }, [clientId])

  function markComplete(clientWorkoutId: string) {
    setData(prev => prev ? {
      ...prev,
      workouts: prev.workouts.map(w => w.id === clientWorkoutId ? { ...w, status: 'completed' } : w),
    } : prev)
  }

  function goTo(section: ActiveSection) {
    setActiveSection(section)
    setShowMore(false)
  }

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

  const todaysWorkout = assigned.find(w => {
    if (!w.due_date) return false
    const d = new Date(w.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0)
    return d.getTime() === todayDate.getTime()
  }) ?? (assigned[0] ?? null)

  const missedWorkouts = assigned.filter(w => {
    if (!w.due_date) return false
    const d = new Date(w.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0)
    return d < todayDate
  })

  return (
    <div className="relative">
      {/* ── Log workout overlay (highest z) ── */}
      {loggingWorkout && (
        <PortalLogOverlay
          cw={loggingWorkout}
          clientId={clientId!}
          onClose={() => setLoggingWorkout(null)}
          onDone={(id) => { markComplete(id); setLoggingWorkout(null) }}
        />
      )}

      {/* ── More sheet ── */}
      {showMore && (
        <MoreSheet
          onClose={() => setShowMore(false)}
          onNavigate={goTo}
          portalSections={unlocked}
        />
      )}

      {/* ── Section views ── */}
      {activeSection === 'workouts' && (
        <WorkoutsView data={data} clientId={clientId!} onMarkComplete={markComplete} />
      )}
      {activeSection === 'history' && (
        <HistoryView clientId={clientId!} />
      )}
      {activeSection === 'metrics' && (
        <MetricsView clientId={clientId!} />
      )}
      {activeSection === 'nutrition' && (
        <NutritionView />
      )}
      {activeSection === 'messages' && (
        <MessagesView clientId={clientId!} />
      )}

      {/* ── Dashboard (home) ── */}
      {activeSection === null && (
        <div className="min-h-screen bg-[#f1f5f9]">
          <div className="pb-28">

            {/* Greeting */}
            <div className="px-5 pt-14 pb-4">
              <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Let's do this</h1>
            </div>

            {/* Today's Workout hero card */}
            <div className="px-4 mb-3">
              {todaysWorkout ? (
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
                <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 shadow-lg min-h-[180px] flex flex-col justify-center items-center text-center">
                  <CheckCircle2 size={40} className="text-white/80 mb-3" />
                  <p className="text-white font-bold text-xl">All caught up!</p>
                  <p className="text-white/70 text-sm mt-1">No workouts pending right now.</p>
                </div>
              )}
            </div>

            {/* Missed workouts banner */}
            {missedWorkouts.length > 0 && !missedBannerDismissed && (
              <div className="mx-4 mb-3">
                <div className="bg-[#fff4eb] border border-orange-100 rounded-2xl px-4 py-3.5 flex items-center gap-3">
                  <span className="text-lg flex-shrink-0">👉</span>
                  <p className="flex-1 text-sm text-gray-700 leading-snug">
                    You missed{' '}
                    <button
                      onClick={() => unlocked.includes('workouts') && goTo('workouts')}
                      className="text-orange-500 font-bold"
                    >
                      {missedWorkouts.length} {missedWorkouts.length === 1 ? 'workout' : 'workouts'}
                    </button>
                    {missedWorkouts[0]?.due_date && (
                      <> from {new Date(missedWorkouts[0].due_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</>
                    )}
                  </p>
                  <button
                    onClick={() => setMissedBannerDismissed(true)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Tasks */}
            {tasks.length > 0 && (
              <div className="mx-4 mb-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <h3 className="text-[16px] font-bold text-gray-900">Tasks (0/{tasks.length})</h3>
                  </div>
                  <div>
                    {tasks.map((task, i) => {
                      const isLast  = i === tasks.length - 1
                      const dueObj  = task.due_date
                        ? (() => { const d = new Date(task.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0); return d })()
                        : null
                      const overdue = dueObj ? dueObj < todayDate : false
                      const dueFmt  = dueObj
                        ? dueObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : null
                      return (
                        <div
                          key={task.id}
                          className={clsx('flex items-center gap-3 px-4 py-3.5', !isLast && 'border-b border-gray-100')}
                        >
                          <div className="w-7 h-7 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={14} className="text-gray-200" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-semibold text-gray-800 leading-tight">{task.title}</p>
                            {dueFmt && (
                              <p className={clsx('text-xs font-medium mt-0.5', overdue ? 'text-orange-500' : 'text-gray-400')}>
                                {overdue ? `Past: ${dueFmt}` : `Due: ${dueFmt}`}
                              </p>
                            )}
                          </div>
                          <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step tracker */}
            <div className="mx-4 mb-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-5">
                <h3 className="text-[16px] font-bold text-gray-900">Step tracker</h3>
                <p className="text-sm text-gray-400 mt-1">Connect your device to track daily steps.</p>
              </div>
            </div>

            <p className="text-center text-[11px] text-gray-300 pt-4 pb-2 uppercase tracking-[0.2em] font-medium">
              Powered by FitProto
            </p>
          </div>
        </div>
      )}

      {/* ── Universal bottom tab bar ── */}
      <BottomTabBar
        activeSection={activeSection}
        showMore={showMore}
        onTab={goTo}
        onMoreToggle={() => setShowMore(v => !v)}
      />
    </div>
  )
}
