import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Dumbbell, CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp,
  Loader2, Target, ClipboardList, X, ArrowLeft,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import clsx from 'clsx'

// ─── RPC response types ────────────────────────────────────────
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

// ─── Shared helpers ────────────────────────────────────────────
const DIFFICULTY_COLORS = {
  beginner:     'bg-emerald-500/20 text-emerald-300',
  intermediate: 'bg-amber-500/20 text-amber-300',
  advanced:     'bg-rose-500/20 text-rose-300',
}

type SetEntry = { reps: string; weight: string; duration: string; distance: string; rpe: string }

// ─── Portal log session overlay ───────────────────────────────
function PortalLogOverlay({
  cw, clientId, onClose, onDone,
}: {
  cw: PortalWorkout
  clientId: string
  onClose: () => void
  onDone: (id: string) => void
}) {
  const [detail, setDetail]   = useState<PortalWorkoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Record<string, SetEntry>>({})
  const [completedAt, setCompletedAt] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('get_portal_workout_detail', {
      p_client_workout_id: cw.id,
      p_client_id: clientId,
    }).then(({ data, error: err }) => {
      if (!err && data) {
        const d = data as PortalWorkoutDetail
        setDetail(d)
        // Pre-fill entries from programmed values
        const init: Record<string, SetEntry> = {}
        for (const ex of d.exercises ?? []) {
          for (const s of ex.sets ?? []) {
            init[`${ex.id}-${s.set_number}`] = {
              reps:     s.reps?.toString()             ?? '',
              weight:   s.weight?.toString()           ?? '',
              duration: s.duration_seconds?.toString() ?? '',
              distance: s.distance_meters?.toString()  ?? '',
              rpe:      '',
            }
          }
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
    setError(null)
    setSaving(true)
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
      p_client_workout_id: cw.id,
      p_client_id: clientId,
      p_completed_at: completedAt,
      p_notes: notes,
      p_set_logs: setLogs as any,
    })
    setSaving(false)
    if (err || (result as any)?.error) {
      setError(err?.message ?? (result as any)?.error ?? 'Something went wrong')
      return
    }
    setSaved(true)
    setTimeout(() => { onDone(cw.id); onClose() }, 1000)
  }

  const inp = 'w-full px-2 py-2 text-sm text-center bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-400 focus:bg-white/15'

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0a0a1a] via-[#161630] to-[#200f3a] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-6 pb-4 border-b border-white/10">
        <button onClick={onClose} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold truncate">{cw.workout.name}</p>
          <p className="text-white/40 text-xs">Log your session</p>
        </div>
        <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white/10 border border-white/10 rounded-xl text-white/80 focus:outline-none focus:border-brand-400" />
      </div>

      {/* Exercises */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (detail?.exercises ?? []).map(ex => {
          const metric      = ex.metric_type ?? 'reps_weight'
          const isWeighted  = metric === 'reps_weight'
          const isTimed     = metric === 'time'
          const isDistance  = metric === 'distance'
          const colClass    = isWeighted
            ? 'grid-cols-[24px_1fr_1fr_72px]'
            : 'grid-cols-[24px_1fr_72px]'
          return (
            <div key={ex.id}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-white font-semibold text-sm">{ex.name}</p>
                {ex.muscle_group && (
                  <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                    {ex.muscle_group}
                  </span>
                )}
              </div>
              {/* Headers */}
              <div className={clsx('grid gap-2 text-xs text-white/30 font-semibold uppercase tracking-wide px-1 mb-2', colClass)}>
                <span>#</span>
                {isWeighted && <><span>Reps</span><span>Weight</span></>}
                {isTimed    && <span>Duration (s)</span>}
                {isDistance && <span>Distance (m)</span>}
                {metric === 'reps' && <span>Reps</span>}
                <span>RPE</span>
              </div>
              {/* Set rows */}
              <div className="space-y-2">
                {(ex.sets ?? []).map(s => {
                  const key = `${ex.id}-${s.set_number}`
                  const e   = entries[key] ?? { reps: '', weight: '', duration: '', distance: '', rpe: '' }
                  return (
                    <div key={s.set_number} className={clsx('grid gap-2 items-center', colClass)}>
                      <span className="text-white/40 text-xs font-bold text-center">{s.set_number}</span>
                      {isWeighted && (
                        <>
                          <input type="number" inputMode="numeric" min={0} value={e.reps}
                            onChange={ev => setField(key, 'reps', ev.target.value)}
                            placeholder={s.reps?.toString() ?? '—'} className={inp} />
                          <input type="number" inputMode="decimal" min={0} step={0.5} value={e.weight}
                            onChange={ev => setField(key, 'weight', ev.target.value)}
                            placeholder={s.weight?.toString() ?? '—'} className={inp} />
                        </>
                      )}
                      {isTimed && (
                        <input type="number" inputMode="numeric" min={0} value={e.duration}
                          onChange={ev => setField(key, 'duration', ev.target.value)}
                          placeholder={s.duration_seconds?.toString() ?? '—'} className={inp} />
                      )}
                      {isDistance && (
                        <input type="number" inputMode="decimal" min={0} step={0.1} value={e.distance}
                          onChange={ev => setField(key, 'distance', ev.target.value)}
                          placeholder={s.distance_meters?.toString() ?? '—'} className={inp} />
                      )}
                      {metric === 'reps' && (
                        <input type="number" inputMode="numeric" min={0} value={e.reps}
                          onChange={ev => setField(key, 'reps', ev.target.value)}
                          placeholder={s.reps?.toString() ?? '—'} className={inp} />
                      )}
                      <input type="number" inputMode="numeric" min={1} max={10} value={e.rpe}
                        onChange={ev => setField(key, 'rpe', ev.target.value)}
                        placeholder="RPE" className={inp} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom bar */}
      <div className="px-4 pb-safe pb-6 pt-4 border-t border-white/10 space-y-3">
        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 px-3 py-2 rounded-xl text-center">{error}</p>
        )}
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Session notes (optional)..."
          rows={2}
          className="w-full px-3.5 py-2.5 text-sm bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-400 resize-none"
        />
        <button
          onClick={submit}
          disabled={saving || saved || loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-2xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-50 transition-all"
        >
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

// ─── Workout card ─────────────────────────────────────────────
function WorkoutCard({
  cw, clientId, onLog, onQuickComplete,
}: {
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
      p_client_workout_id: cw.id,
      p_client_id: clientId,
    })
    onQuickComplete(cw.id)
    setCompleting(false)
  }

  return (
    <div className={clsx(
      'rounded-2xl border transition-all',
      done ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/15 shadow-lg shadow-black/20',
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            done ? 'bg-emerald-500/20' : 'bg-gradient-to-br from-brand-500 to-violet-600',
          )}>
            {done
              ? <CheckCircle2 size={20} className="text-emerald-400" />
              : <Dumbbell size={20} className="text-white" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={clsx('font-semibold text-sm', done ? 'text-white/40 line-through' : 'text-white')}>
                {cw.workout.name}
              </h3>
              {cw.workout.difficulty && (
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', DIFFICULTY_COLORS[cw.workout.difficulty])}>
                  {cw.workout.difficulty}
                </span>
              )}
              {done && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-400">
                  Done
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {cw.workout.duration_minutes && (
                <span className="text-xs text-white/40 flex items-center gap-1">
                  <Clock size={10} />{cw.workout.duration_minutes} min
                </span>
              )}
              {cw.due_date && (
                <span className="text-xs text-white/40 flex items-center gap-1">
                  <Calendar size={10} />Due {new Date(cw.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
            {cw.notes && <p className="mt-1.5 text-xs text-white/40 italic">{cw.notes}</p>}
          </div>

          {cw.workout.description && (
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-white/30 hover:text-white/60 flex-shrink-0">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>

        {expanded && cw.workout.description && (
          <p className="mt-3 text-sm text-white/50 leading-relaxed border-t border-white/10 pt-3">
            {cw.workout.description}
          </p>
        )}

        {!done && (
          <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
            {/* Primary: Log Session */}
            <button
              onClick={() => onLog(cw)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all"
            >
              <ClipboardList size={15} /> Log Session
            </button>
            {/* Secondary: quick complete (no details) */}
            <button
              onClick={handleQuickComplete}
              disabled={completing}
              title="Mark done without logging"
              className="px-3 py-2.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              {completing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main portal ──────────────────────────────────────────────
export default function ClientPortal() {
  const { clientId } = useParams<{ clientId: string }>()
  const [data, setData]         = useState<PortalData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [logging, setLogging]   = useState<PortalWorkout | null>(null)

  useEffect(() => {
    if (!clientId) return
    supabase.rpc('get_portal_data', { p_client_id: clientId }).then(({ data: result, error }) => {
      if (error || !result) setNotFound(true)
      else setData(result as PortalData)
      setLoading(false)
    })
  }, [clientId])

  function markComplete(clientWorkoutId: string) {
    setData(prev => prev ? {
      ...prev,
      workouts: prev.workouts.map(w => w.id === clientWorkoutId ? { ...w, status: 'completed' } : w),
    } : prev)
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1e1e35] to-[#2a1a4e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1e1e35] to-[#2a1a4e] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Dumbbell size={32} className="text-white/40" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Portal not found</h2>
        <p className="text-white/50 text-sm">This link may be invalid or expired.</p>
      </div>
    </div>
  )

  const assigned  = data.workouts.filter(w => w.status === 'assigned')
  const completed = data.workouts.filter(w => w.status === 'completed')
  const initials  = data.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1e1e35] to-[#2a1a4e]">
      {/* Full-screen log overlay */}
      {logging && (
        <PortalLogOverlay
          cw={logging}
          clientId={clientId!}
          onClose={() => setLogging(null)}
          onDone={markComplete}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-10 pb-6 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg shadow-brand-500/30">
          {initials}
        </div>
        <h1 className="text-2xl font-bold text-white">{data.name}</h1>
        {data.goal && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-white/50 text-sm">
            <Target size={13} />{data.goal}
          </div>
        )}
        <div className="flex items-center justify-center gap-4 mt-5">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{assigned.length}</p>
            <p className="text-xs text-white/40">Pending</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{completed.length}</p>
            <p className="text-xs text-white/40">Completed</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{data.workouts.length}</p>
            <p className="text-xs text-white/40">Total</p>
          </div>
        </div>
      </div>

      {/* Workout list */}
      <div className="max-w-lg mx-auto px-4 pb-12 space-y-6">
        {assigned.length > 0 && (
          <div>
            <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Your Workouts</h2>
            <div className="space-y-3">
              {assigned.map(cw => (
                <WorkoutCard key={cw.id} cw={cw} clientId={clientId!}
                  onLog={setLogging} onQuickComplete={markComplete} />
              ))}
            </div>
          </div>
        )}

        {assigned.length === 0 && (
          <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
            <Dumbbell size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/60 font-medium">No workouts assigned yet</p>
            <p className="text-white/30 text-sm mt-1">Check back soon!</p>
          </div>
        )}

        {completed.length > 0 && (
          <div>
            <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Completed</h2>
            <div className="space-y-3">
              {completed.map(cw => (
                <WorkoutCard key={cw.id} cw={cw} clientId={clientId!}
                  onLog={setLogging} onQuickComplete={markComplete} />
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-white/20 pt-4">Powered by FitProto</p>
      </div>
    </div>
  )
}
