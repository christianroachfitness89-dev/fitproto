import { useState } from 'react'
import {
  Plus, Search, Loader2, CalendarDays, Clock,
  Dumbbell, Scale, CheckCircle2, XCircle,
  ClipboardList, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import { useClients } from '@/hooks/useClients'
import { useAllSessionLogs } from '@/hooks/useSessionLogs'
import type { DbSessionLog, DbClient } from '@/lib/database.types'
import NewSessionModal from '@/components/session-logs/NewSessionModal'
import SessionPanel    from '@/components/session-logs/SessionPanel'

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatTime(t: string | null) {
  if (!t) return null
  const [h, m] = t.split(':')
  const d = new Date(); d.setHours(+h, +m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ─── Session card ─────────────────────────────────────────────
function SessionCard({
  log,
  client,
  onClick,
}: {
  log:    DbSessionLog
  client: DbClient | undefined
  onClick: () => void
}) {
  const totalTasks  = log.tasks.length
  const doneTasks   = log.tasks.filter(t => t.completed === true).length
  const failedTasks = log.tasks.filter(t => t.completed === false).length
  const pendingTasks = totalTasks - doneTasks - failedTasks
  const isOpen = log.status === 'open'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#161b27] border border-[#242d40] rounded-2xl p-4 hover:border-amber-400/20 hover:bg-[#1e2535] transition-all group"
    >
      {/* Client + status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0">
            {(client?.name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#e8edf5] text-sm truncate group-hover:text-amber-400 transition-colors">
              {client?.name ?? 'Unknown'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#4a5a75] mt-0.5">
              <span className="flex items-center gap-0.5"><CalendarDays size={10} />{formatDate(log.session_date)}</span>
              {log.session_time && (
                <span className="flex items-center gap-0.5"><Clock size={10} />{formatTime(log.session_time)}</span>
              )}
            </div>
          </div>
        </div>
        <span className={clsx(
          'flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
          isOpen
            ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
            : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
        )}>
          {isOpen ? 'Active' : 'Done'}
        </span>
      </div>

      {/* Workout info */}
      <div className="flex items-center gap-3 text-xs text-[#8a9ab5] mb-3">
        {log.workout_type && (
          <span className="flex items-center gap-1 font-medium text-[#e8edf5]">
            <Dumbbell size={11} className="text-amber-400" />{log.workout_type}
          </span>
        )}
        {log.client_weight_kg != null && (
          <span className="flex items-center gap-1">
            <Scale size={11} className="text-emerald-400" />{log.client_weight_kg} kg
          </span>
        )}
      </div>

      {/* Task summary */}
      {totalTasks > 0 ? (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 h-1.5 bg-[#1e2535] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${Math.round((doneTasks / totalTasks) * 100)}%` }}
            />
          </div>
          <span className="text-[#8a9ab5] flex-shrink-0">
            {isOpen && pendingTasks > 0
              ? `${pendingTasks} task${pendingTasks !== 1 ? 's' : ''} to review`
              : `${doneTasks}/${totalTasks} complete`}
          </span>
          {failedTasks > 0 && (
            <span className="flex items-center gap-0.5 text-rose-400 font-semibold flex-shrink-0">
              <XCircle size={11} /> {failedTasks} failed
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#4a5a75]">No accountability tasks</p>
      )}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function SessionLogs() {
  const { data: clients = [],    isLoading: cLoading } = useClients()
  const { data: allLogs = [],    isLoading: lLoading } = useAllSessionLogs()
  const [tab, setTab]           = useState<'active' | 'history'>('active')
  const [search, setSearch]     = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  const clientMap = new Map(clients.map(c => [c.id, c]))
  const selectedLog = selectedLogId ? allLogs.find(l => l.id === selectedLogId) ?? null : null

  // Filter by tab + search
  const filtered = allLogs.filter(log => {
    if (tab === 'active'  && log.status !== 'open')      return false
    if (tab === 'history' && log.status !== 'completed') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = clientMap.get(log.client_id)?.name ?? ''
      return name.toLowerCase().includes(q) || (log.workout_type ?? '').toLowerCase().includes(q)
    }
    return true
  })

  // Stats
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const openLogs       = allLogs.filter(l => l.status === 'open')
  const thisWeekLogs   = allLogs.filter(l => new Date(l.session_date + 'T00:00:00').getTime() >= weekAgo)
  const outstandingPunishments = allLogs
    .flatMap(l => l.tasks)
    .filter(t => t.completed === false && !t.punishment_notes).length

  const isLoading = cLoading || lLoading

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b27] border-b border-[#242d40] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#e8edf5]">PT Session Logs</h1>
            <p className="text-sm text-[#8a9ab5] mt-0.5">
              Workout records, accountability tasks &amp; punishment evidence
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#0d1117] text-sm font-black rounded-xl transition-all"
          >
            <Plus size={16} /> New Session
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#161b27] border border-[#242d40] rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#8a9ab5] uppercase tracking-wider mb-1">Active Sessions</p>
            <p className="text-2xl font-bold text-amber-400">{openLogs.length}</p>
            <p className="text-xs text-[#4a5a75] mt-0.5">awaiting review</p>
          </div>
          <div className="bg-[#161b27] border border-[#242d40] rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#8a9ab5] uppercase tracking-wider mb-1">This Week</p>
            <p className="text-2xl font-bold text-amber-400">{thisWeekLogs.length}</p>
            <p className="text-xs text-[#4a5a75] mt-0.5">sessions logged</p>
          </div>
          <div className="bg-[#161b27] border border-[#242d40] rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#8a9ab5] uppercase tracking-wider mb-1">Outstanding</p>
            <p className={clsx('text-2xl font-bold', outstandingPunishments > 0 ? 'text-rose-400' : 'text-[#4a5a75]')}>
              {outstandingPunishments}
            </p>
            <p className="text-xs text-[#4a5a75] mt-0.5">punishments unrecorded</p>
          </div>
        </div>

        {/* Tabs + search */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-[#161b27] border border-[#242d40] p-1 rounded-xl">
            {(['active', 'history'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx(
                  'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize',
                  tab === t ? 'bg-[#1e2535] text-[#e8edf5] shadow-sm' : 'text-[#8a9ab5] hover:text-[#e8edf5]'
                )}>
                {t}
                {t === 'active' && openLogs.length > 0 && (
                  <span className="ml-1.5 bg-amber-400 text-[#0d1117] text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                    {openLogs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5a75]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by client or workout type…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/50 transition-all text-[#e8edf5] placeholder-[#4a5a75]" />
          </div>
        </div>

        {/* Session list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-amber-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[#1e2535] rounded-2xl flex items-center justify-center mb-4">
              {tab === 'active' ? <CheckCircle2 size={24} className="text-emerald-400" /> : <ClipboardList size={24} className="text-[#4a5a75]" />}
            </div>
            <p className="text-base font-semibold text-[#e8edf5]">
              {tab === 'active' ? 'No active sessions' : 'No completed sessions yet'}
            </p>
            <p className="text-sm text-[#8a9ab5] mt-1 max-w-xs">
              {tab === 'active'
                ? 'All accountability tasks are reviewed — great work!'
                : 'Completed sessions will appear here once reviewed.'}
            </p>
            {tab === 'active' && (
              <button onClick={() => setShowNew(true)}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#0d1117] text-sm font-black rounded-xl transition-all">
                <Plus size={16} /> New Session
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(log => (
              <SessionCard
                key={log.id}
                log={log}
                client={clientMap.get(log.client_id)}
                onClick={() => setSelectedLogId(log.id)}
              />
            ))}
          </div>
        )}

        {/* Punishment callout */}
        {tab === 'active' && outstandingPunishments > 0 && (
          <div className="border border-rose-400/20 bg-rose-400/10 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-400">
                {outstandingPunishments} punishment{outstandingPunishments !== 1 ? 's' : ''} not yet recorded
              </p>
              <p className="text-xs text-rose-400/70 mt-0.5">
                Open a session and add evidence notes for any failed tasks to keep a complete accountability record.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals / panel */}
      {showNew && (
        <NewSessionModal
          clients={clients}
          onClose={() => setShowNew(false)}
        />
      )}
      {selectedLog && (
        <SessionPanel
          log={selectedLog}
          client={clientMap.get(selectedLog.client_id)}
          onClose={() => setSelectedLogId(null)}
        />
      )}
    </div>
  )
}
