import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Dumbbell, CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp, Loader2, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import clsx from 'clsx'

// ─── Types matching the RPC response ─────────────────────────
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

const DIFFICULTY_COLORS = {
  beginner:     'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-rose-100 text-rose-700',
}

// ─── Workout card ─────────────────────────────────────────────
function WorkoutCard({
  cw,
  clientId,
  onComplete,
}: {
  cw: PortalWorkout
  clientId: string
  onComplete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function handleComplete() {
    setCompleting(true)
    await supabase.rpc('complete_portal_workout', {
      p_client_workout_id: cw.id,
      p_client_id: clientId,
    })
    onComplete(cw.id)
    setCompleting(false)
  }

  const done = cw.status === 'completed'

  return (
    <div className={clsx(
      'rounded-2xl border transition-all',
      done ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 shadow-sm',
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            done ? 'bg-emerald-100' : 'bg-gradient-to-br from-brand-500 to-violet-600',
          )}>
            {done
              ? <CheckCircle2 size={20} className="text-emerald-600" />
              : <Dumbbell size={20} className="text-white" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={clsx('font-semibold text-sm', done ? 'text-gray-400 line-through' : 'text-gray-900')}>
                {cw.workout.name}
              </h3>
              {cw.workout.difficulty && (
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', DIFFICULTY_COLORS[cw.workout.difficulty])}>
                  {cw.workout.difficulty}
                </span>
              )}
              {done && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                  Done
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {cw.workout.duration_minutes && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={11} />{cw.workout.duration_minutes} min
                </span>
              )}
              {cw.workout.category && (
                <span className="text-xs text-gray-500">{cw.workout.category}</span>
              )}
              {cw.due_date && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={11} />Due {new Date(cw.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            {cw.notes && (
              <p className="mt-1.5 text-xs text-gray-500 italic">{cw.notes}</p>
            )}
          </div>

          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {expanded && cw.workout.description && (
          <p className="mt-3 text-sm text-gray-600 pl-13 leading-relaxed">
            {cw.workout.description}
          </p>
        )}

        {!done && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-60 transition-all"
            >
              {completing
                ? <Loader2 size={15} className="animate-spin" />
                : <><CheckCircle2 size={15} /> Mark as complete</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main portal page ─────────────────────────────────────────
export default function ClientPortal() {
  const { clientId } = useParams<{ clientId: string }>()
  const [data, setData]       = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!clientId) return
    supabase.rpc('get_portal_data', { p_client_id: clientId }).then(({ data: result, error }) => {
      if (error || !result) {
        setNotFound(true)
      } else {
        setData(result as PortalData)
      }
      setLoading(false)
    })
  }, [clientId])

  function handleComplete(clientWorkoutId: string) {
    setData(prev => prev ? {
      ...prev,
      workouts: prev.workouts.map(w =>
        w.id === clientWorkoutId ? { ...w, status: 'completed' } : w
      ),
    } : prev)
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1e1e35] to-[#2a1a4e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────
  if (notFound || !data) {
    return (
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
  }

  const assigned  = data.workouts.filter(w => w.status === 'assigned')
  const completed = data.workouts.filter(w => w.status === 'completed')
  const initials  = data.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1e1e35] to-[#2a1a4e]">
      {/* Header */}
      <div className="px-4 pt-10 pb-6 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg shadow-brand-500/30">
          {initials}
        </div>
        <h1 className="text-2xl font-bold text-white">{data.name}</h1>
        {data.goal && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-white/60 text-sm">
            <Target size={13} />{data.goal}
          </div>
        )}
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{assigned.length}</p>
            <p className="text-xs text-white/50">Pending</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{completed.length}</p>
            <p className="text-xs text-white/50">Completed</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{data.workouts.length}</p>
            <p className="text-xs text-white/50">Total</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pb-12 space-y-6">

        {/* Assigned workouts */}
        {assigned.length > 0 && (
          <div>
            <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">
              Your Workouts
            </h2>
            <div className="space-y-3">
              {assigned.map(cw => (
                <WorkoutCard key={cw.id} cw={cw} clientId={clientId!} onComplete={handleComplete} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {assigned.length === 0 && (
          <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
            <Dumbbell size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/60 font-medium">No workouts assigned yet</p>
            <p className="text-white/30 text-sm mt-1">Check back soon!</p>
          </div>
        )}

        {/* Completed workouts */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">
              Completed
            </h2>
            <div className="space-y-3">
              {completed.map(cw => (
                <WorkoutCard key={cw.id} cw={cw} clientId={clientId!} onComplete={handleComplete} />
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-white/20 pt-4">Powered by FitProto</p>
      </div>
    </div>
  )
}
