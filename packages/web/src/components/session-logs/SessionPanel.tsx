import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X, CheckCircle2, XCircle, Loader2, Trash2,
  CalendarDays, Clock, Dumbbell, Scale, ExternalLink,
  AlertTriangle, ClipboardCheck, ChevronDown, ChevronUp,
} from 'lucide-react'
import clsx from 'clsx'
import { useUpdateSessionLog, useDeleteSessionLog } from '@/hooks/useSessionLogs'
import type { DbSessionLog, DbClient, SessionTask } from '@/lib/database.types'

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(t: string | null) {
  if (!t) return null
  const [h, m] = t.split(':')
  const d = new Date(); d.setHours(+h, +m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ─── Single task review row ───────────────────────────────────
function TaskRow({
  task,
  isOpen,
  onChange,
}: {
  task: SessionTask
  isOpen: boolean
  onChange: (patch: Partial<SessionTask>) => void
}) {
  const [showEvidence, setShowEvidence] = useState(task.completed === false)

  function mark(val: boolean) {
    onChange({ completed: val })
    setShowEvidence(!val)
  }

  return (
    <div className={clsx(
      'rounded-xl border p-3 space-y-2 transition-all',
      task.completed === true  ? 'border-emerald-200 bg-emerald-50/40' :
      task.completed === false ? 'border-rose-200 bg-rose-50/40'       :
      'border-gray-200 bg-white'
    )}>
      {/* Task name + status */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug">{task.name}</p>
          {task.punishment && (
            <p className="text-xs text-rose-500 mt-0.5 flex items-start gap-1">
              <span className="flex-shrink-0 mt-px">⚡</span>
              {task.punishment}
            </p>
          )}
        </div>

        {/* Review badge (completed sessions) */}
        {!isOpen && (
          task.completed === true ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
              <CheckCircle2 size={10} /> Done
            </span>
          ) : task.completed === false ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full flex-shrink-0">
              <XCircle size={10} /> Failed
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
              Not reviewed
            </span>
          )
        )}
      </div>

      {/* Review buttons — only on open sessions */}
      {isOpen && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => mark(true)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border-2 transition-all',
              task.completed === true
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-600'
            )}
          >
            <CheckCircle2 size={13} /> Completed
          </button>
          <button
            type="button"
            onClick={() => mark(false)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border-2 transition-all',
              task.completed === false
                ? 'border-rose-500 bg-rose-500 text-white'
                : 'border-gray-200 text-gray-500 hover:border-rose-400 hover:text-rose-600'
            )}
          >
            <XCircle size={13} /> Not Done
          </button>
        </div>
      )}

      {/* Punishment evidence — shown when failed */}
      {task.completed === false && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setShowEvidence(v => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
          >
            <AlertTriangle size={11} /> Punishment evidence
            {showEvidence ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showEvidence && (
            <textarea
              value={task.punishment_notes}
              onChange={e => onChange({ punishment_notes: e.target.value })}
              rows={2}
              readOnly={!isOpen}
              placeholder={isOpen
                ? 'Describe how the punishment was carried out — this is your accountability record…'
                : 'No evidence recorded.'}
              className={clsx(
                'w-full px-3 py-2 text-xs border border-rose-200 rounded-lg transition-all resize-none',
                isOpen
                  ? 'bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400'
                  : 'bg-rose-50/30 text-rose-700 cursor-default'
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────
export default function SessionPanel({
  log,
  client,
  onClose,
}: {
  log: DbSessionLog
  client: DbClient | undefined
  onClose: () => void
}) {
  const updateLog = useUpdateSessionLog()
  const deleteLog = useDeleteSessionLog()

  // Local copy of tasks for review
  const [tasks, setTasks] = useState<SessionTask[]>(log.tasks)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Re-sync if log prop changes (e.g. after save)
  if (!dirty && JSON.stringify(tasks) !== JSON.stringify(log.tasks)) {
    setTasks(log.tasks)
  }

  function updateTask(id: string, patch: Partial<SessionTask>) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    setDirty(true)
  }

  const isOpen = log.status === 'open'
  const allReviewed = tasks.every(t => t.completed !== null)
  const failedCount = tasks.filter(t => t.completed === false).length
  const doneCount   = tasks.filter(t => t.completed === true).length

  async function handleSaveTasks() {
    await updateLog.mutateAsync({
      id:       log.id,
      clientId: log.client_id,
      tasks,
    })
    setDirty(false)
  }

  async function handleCompleteReview() {
    await updateLog.mutateAsync({
      id:          log.id,
      clientId:    log.client_id,
      tasks,
      status:      'completed',
      reviewed_at: new Date().toISOString(),
    })
    setDirty(false)
  }

  async function handleDelete() {
    await deleteLog.mutateAsync({ id: log.id, clientId: log.client_id })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">

        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900 truncate">
                {client?.name ?? 'Unknown Client'}
              </h2>
              <span className={clsx(
                'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0',
                log.status === 'open'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              )}>
                {log.status === 'open' ? 'Active' : 'Completed'}
              </span>
            </div>

            {/* Session meta */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarDays size={11} />
                {formatDate(log.session_date)}
              </span>
              {log.session_time && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />{formatTime(log.session_time)}
                </span>
              )}
              {log.workout_type && (
                <span className="flex items-center gap-1">
                  <Dumbbell size={11} />{log.workout_type}
                </span>
              )}
              {log.client_weight_kg != null && (
                <span className="flex items-center gap-1">
                  <Scale size={11} />{log.client_weight_kg} kg
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {client && (
              <Link to={`/clients/${client.id}`} onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View client profile">
                <ExternalLink size={15} />
              </Link>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-5">

          {/* Session notes */}
          {log.session_notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Session Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{log.session_notes}</p>
            </div>
          )}

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Accountability Tasks</p>
                {tasks.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {doneCount} done · {failedCount} failed · {tasks.length - doneCount - failedCount} pending
                  </p>
                )}
              </div>
              {log.reviewed_at && (
                <span className="text-[11px] text-gray-400">
                  Reviewed {new Date(log.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <ClipboardCheck size={20} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">No accountability tasks were set for this session</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isOpen={isOpen}
                    onChange={patch => updateTask(task.id, patch)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Failed tasks summary (completed sessions) */}
          {!isOpen && failedCount > 0 && (
            <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-4">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {failedCount} Punishment{failedCount !== 1 ? 's' : ''} Applied
              </p>
              <p className="text-xs text-rose-600">
                {tasks.filter(t => t.completed === false).map(t => t.name).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gray-100 space-y-2">
          {isOpen && tasks.length > 0 && (
            <>
              {/* Save progress */}
              {dirty && (
                <button
                  onClick={handleSaveTasks}
                  disabled={updateLog.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 disabled:opacity-50 transition-colors"
                >
                  {updateLog.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save Progress'}
                </button>
              )}
              {/* Complete review */}
              <button
                onClick={handleCompleteReview}
                disabled={!allReviewed || updateLog.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 rounded-xl disabled:opacity-40 transition-all"
              >
                {updateLog.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <><ClipboardCheck size={14} /> Complete Review</>
                }
              </button>
              {!allReviewed && (
                <p className="text-center text-[11px] text-gray-400">Mark all tasks done or failed to complete the review</p>
              )}
            </>
          )}

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLog.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {deleteLog.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={14} /> Delete</>}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
              <Trash2 size={14} /> Delete Session
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
