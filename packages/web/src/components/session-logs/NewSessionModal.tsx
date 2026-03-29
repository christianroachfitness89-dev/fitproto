import { useState } from 'react'
import { Plus, X, Trash2, Loader2, AlertCircle, Zap } from 'lucide-react'
import clsx from 'clsx'
import { useCreateSessionLog } from '@/hooks/useSessionLogs'
import type { DbClient, SessionTask } from '@/lib/database.types'

// ─── Constants ───────────────────────────────────────────────
export const WORKOUT_TYPES = [
  'Upper Body Strength',
  'Lower Body Strength',
  'Full Body Strength',
  'Push / Pull / Legs',
  'HIIT',
  'Cardio',
  'Functional Training',
  'Mobility & Flexibility',
  'Sports Performance',
  'Custom',
]

const TASK_TEMPLATES: { name: string; punishment: string }[] = [
  { name: 'Complete all assigned workouts',        punishment: '10 burpees per missed session at next PT' },
  { name: 'Drink 2L of water daily',               punishment: '5-minute wall sit at next session'         },
  { name: 'Hit daily step goal (10,000 steps)',     punishment: '1km run at the start of next session'      },
  { name: 'Log all meals in food diary',            punishment: '20 push-ups per missed day'                },
  { name: 'Avoid alcohol for the week',             punishment: 'Extra 15 min cardio at next session'       },
  { name: 'Complete Sunday meal prep',              punishment: 'Meal prep under coach supervision'         },
  { name: 'Sleep 7+ hours per night',              punishment: '10 min stretching & breathing work'        },
  { name: 'No skipping scheduled PT sessions',     punishment: 'Make-up session + extra 20 min'            },
  { name: 'Eat protein with every meal',           punishment: '3 x 1-minute plank holds'                  },
  { name: 'No junk food / takeaway for the week',  punishment: 'Double cardio at next session'             },
]

function newTask(): SessionTask {
  return { id: crypto.randomUUID(), name: '', punishment: '', completed: null, punishment_notes: '' }
}

// ─── Component ───────────────────────────────────────────────
export default function NewSessionModal({
  clients,
  preselectedClientId,
  onClose,
}: {
  clients: DbClient[]
  preselectedClientId?: string
  onClose: () => void
}) {
  const create = useCreateSessionLog()

  const [clientId, setClientId]       = useState(preselectedClientId ?? '')
  const [date, setDate]               = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime]               = useState(new Date().toTimeString().slice(0, 5))
  const [workoutType, setWorkoutType] = useState('')
  const [customType, setCustomType]   = useState('')
  const [weightKg, setWeightKg]       = useState('')
  const [notes, setNotes]             = useState('')
  const [tasks, setTasks]             = useState<SessionTask[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [err, setErr]                 = useState<string | null>(null)

  const resolvedType = workoutType === 'Custom' ? customType : workoutType

  function addTask() {
    setTasks(t => [...t, newTask()])
  }

  function addTemplate(tpl: { name: string; punishment: string }) {
    setTasks(t => [...t, { ...newTask(), name: tpl.name, punishment: tpl.punishment }])
    setShowTemplates(false)
  }

  function updateTask(id: string, patch: Partial<SessionTask>) {
    setTasks(t => t.map(task => task.id === id ? { ...task, ...patch } : task))
  }

  function removeTask(id: string) {
    setTasks(t => t.filter(task => task.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setErr(null)
    try {
      await create.mutateAsync({
        client_id:        clientId,
        session_date:     date,
        session_time:     time ? `${time}:00` : null,
        workout_type:     resolvedType || null,
        client_weight_kg: weightKg ? parseFloat(weightKg) : null,
        session_notes:    notes || null,
        tasks,
      })
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New PT Session</h2>
            <p className="text-xs text-gray-500 mt-0.5">Log the workout and set accountability tasks</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {err && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{err}
              </div>
            )}

            {/* Client */}
            {!preselectedClientId && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Client *</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all">
                  <option value="">Select a client…</option>
                  {clients.filter(c => c.status === 'active').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
              </div>
            </div>

            {/* Workout type + Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Workout Type</label>
                <select value={workoutType} onChange={e => setWorkoutType(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all">
                  <option value="">Select…</option>
                  {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {workoutType === 'Custom' && (
                  <input type="text" value={customType} onChange={e => setCustomType(e.target.value)}
                    placeholder="Describe workout…" className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Client Weight (kg)</label>
                <input type="number" step="0.1" min="0" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                  placeholder="e.g. 75.5"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
              </div>
            </div>

            {/* Session notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Session Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="How did the session go, PBs, observations…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all resize-none" />
            </div>

            {/* Accountability Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Accountability Tasks</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Commitments the client must complete before next session</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowTemplates(v => !v)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    {showTemplates ? 'Hide templates' : 'Templates'}
                  </button>
                  <button type="button" onClick={addTask}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors">
                    <Plus size={11} /> Add Task
                  </button>
                </div>
              </div>

              {/* Template picker */}
              {showTemplates && (
                <div className="mb-3 border border-brand-200 bg-brand-50/40 rounded-xl p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-brand-700 mb-2">Quick-add from templates:</p>
                  {TASK_TEMPLATES.map(tpl => (
                    <button key={tpl.name} type="button" onClick={() => addTemplate(tpl)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white border border-brand-100 hover:border-brand-300 hover:bg-brand-50 transition-all group">
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-brand-700">{tpl.name}</p>
                      <p className="text-[11px] text-rose-500 mt-0.5">⚡ {tpl.punishment}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Task list */}
              {tasks.length === 0 ? (
                <div className="text-center py-5 border-2 border-dashed border-gray-200 rounded-xl">
                  <Zap size={18} className="mx-auto text-gray-300 mb-1.5" />
                  <p className="text-xs text-gray-400">No tasks yet — add one above or pick from templates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task, i) => (
                    <div key={task.id} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Task {i + 1}</span>
                        <button type="button" onClick={() => removeTask(task.id)}
                          className="text-gray-300 hover:text-rose-500 transition-colors p-0.5">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={task.name}
                        onChange={e => updateTask(task.id, { name: e.target.value })}
                        placeholder="What must the client do?"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                      />
                      <div className="relative">
                        <input
                          type="text"
                          value={task.punishment}
                          onChange={e => updateTask(task.id, { punishment: e.target.value })}
                          placeholder="Punishment if not completed…"
                          className="w-full pl-6 pr-3 py-2 text-sm border border-rose-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition-all text-rose-700 placeholder:text-rose-300"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 text-xs">⚡</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!clientId || create.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-50 transition-all">
              {create.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : <><Plus size={14} /> Save Session</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
