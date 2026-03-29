import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, X, Search, Loader2, ClipboardList,
  Scale, Zap, Moon, TrendingUp, ChevronRight,
  CalendarCheck, AlertCircle, CheckCircle2,
} from 'lucide-react'
import clsx from 'clsx'
import { useClients } from '@/hooks/useClients'
import { useAllCheckIns, useCreateCheckIn } from '@/hooks/useMetrics'
import type { DbClient, DbCheckIn } from '@/lib/database.types'

// ─── Helpers ─────────────────────────────────────────────────
function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function urgencyColor(days: number | null): string {
  if (days === null) return 'bg-gray-100 text-gray-500 border-gray-200'
  if (days <= 7)     return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (days <= 14)    return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

function urgencyDot(days: number | null): string {
  if (days === null) return 'bg-gray-300'
  if (days <= 7)     return 'bg-emerald-500'
  if (days <= 14)    return 'bg-amber-400'
  return 'bg-rose-500'
}

function urgencyLabel(days: number | null): string {
  if (days === null) return 'Never'
  if (days === 0)    return 'Today'
  if (days === 1)    return 'Yesterday'
  return `${days}d ago`
}

// ─── Log Check-in modal ───────────────────────────────────────
function LogCheckInModal({
  clients,
  preselectedClientId,
  onClose,
}: {
  clients: DbClient[]
  preselectedClientId?: string
  onClose: () => void
}) {
  const createCheckIn = useCreateCheckIn()
  const [clientId, setClientId]   = useState(preselectedClientId ?? '')
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [weight, setWeight]       = useState('')
  const [fat, setFat]             = useState('')
  const [energy, setEnergy]       = useState<number | null>(null)
  const [sleep, setSleep]         = useState('')
  const [notes, setNotes]         = useState('')
  const [err, setErr]             = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setErr(null)
    try {
      await createCheckIn.mutateAsync({
        client_id:    clientId,
        checked_in_at: date,
        weight_kg:    weight  ? parseFloat(weight)  : null,
        body_fat_pct: fat     ? parseFloat(fat)     : null,
        energy_level: energy,
        sleep_hours:  sleep   ? parseFloat(sleep)   : null,
        notes:        notes   || null,
      })
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Log Check-in</h2>
            <p className="text-xs text-gray-500 mt-0.5">Record metrics for a client</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {err && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client selector — only if not pre-selected */}
          {!preselectedClientId && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Client</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              >
                <option value="">Select a client…</option>
                {clients.filter(c => c.status === 'active').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
                <Scale size={11} className="text-emerald-500" /> Weight (kg)
              </label>
              <input type="number" step="0.1" min="0" value={weight} onChange={e => setWeight(e.target.value)}
                placeholder="–"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
                <TrendingUp size={11} className="text-teal-500" /> Body Fat (%)
              </label>
              <input type="number" step="0.1" min="0" max="100" value={fat} onChange={e => setFat(e.target.value)}
                placeholder="–"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
                <Moon size={11} className="text-violet-500" /> Sleep (hrs)
              </label>
              <input type="number" step="0.5" min="0" max="24" value={sleep} onChange={e => setSleep(e.target.value)}
                placeholder="–"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
                <Zap size={11} className="text-amber-500" /> Energy (1–10)
              </label>
              <div className="flex gap-1 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} type="button" onClick={() => setEnergy(energy === n ? null : n)}
                    className={clsx(
                      'w-6 h-6 text-[11px] font-bold rounded-md border transition-all',
                      energy === n
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-amber-300'
                    )}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="How are they feeling, any changes…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!clientId || createCheckIn.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-50 transition-all">
              {createCheckIn.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : <><CheckCircle2 size={14} /> Save Check-in</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={clsx('text-2xl font-bold', color)}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Client check-in card ────────────────────────────────────
function ClientCheckInCard({
  client,
  lastCheckIn,
  days,
  recentCount,
  onLog,
}: {
  client: DbClient
  lastCheckIn: DbCheckIn | null
  days: number | null
  recentCount: number
  onLog: () => void
}) {
  const colorClass = urgencyColor(days)
  const dotClass   = urgencyDot(days)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Client info */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-brand-900/30">
          {(client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase())}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{client.name}</p>
          {client.goal && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{client.goal}</p>
          )}
        </div>
        <span className={clsx('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border flex-shrink-0', colorClass)}>
          <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotClass)} />
          {urgencyLabel(days)}
        </span>
      </div>

      {/* Latest metrics — only if there's data */}
      {lastCheckIn && (
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { key: 'weight_kg',    icon: <Scale size={10} />,      unit: 'kg',  color: 'text-emerald-600' },
            { key: 'body_fat_pct', icon: <TrendingUp size={10} />, unit: '%',   color: 'text-teal-600'    },
            { key: 'energy_level', icon: <Zap size={10} />,        unit: '/10', color: 'text-amber-600'   },
            { key: 'sleep_hours',  icon: <Moon size={10} />,       unit: 'h',   color: 'text-violet-600'  },
          ].map(m => {
            const val = lastCheckIn[m.key as keyof DbCheckIn]
            return (
              <div key={m.key} className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                <span className={clsx('flex items-center justify-center gap-0.5 mb-0.5', m.color)}>
                  {m.icon}
                </span>
                <p className="text-xs font-bold text-gray-700 leading-none">
                  {val != null ? `${val}${m.unit}` : '–'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <span className="text-[11px] text-gray-400 flex-1">
          {recentCount > 0
            ? `${recentCount} check-in${recentCount !== 1 ? 's' : ''} total`
            : 'No check-ins yet'}
        </span>
        <button
          onClick={onLog}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
        >
          <Plus size={11} /> Log
        </button>
        <Link
          to={`/clients/${client.id}`}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          View <ChevronRight size={11} />
        </Link>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function CheckIns() {
  const { data: clients = [], isLoading: clientsLoading } = useClients()
  const { data: allCheckIns = [], isLoading: checkInsLoading } = useAllCheckIns()
  const [search, setSearch]           = useState('')
  const [logModal, setLogModal]       = useState<{ open: boolean; clientId?: string }>({ open: false })

  const activeClients = clients.filter(c => c.status === 'active')

  // Build per-client check-in summary
  const clientSummaries = useMemo(() => {
    const checkInsByClient = new Map<string, DbCheckIn[]>()
    for (const ci of allCheckIns) {
      const arr = checkInsByClient.get(ci.client_id) ?? []
      arr.push(ci)
      checkInsByClient.set(ci.client_id, arr)
    }

    return activeClients.map(client => {
      const cis = checkInsByClient.get(client.id) ?? []
      // allCheckIns is already desc by date, so first entry is most recent
      const last = cis[0] ?? null
      const days = last ? daysSince(last.checked_in_at) : null
      return { client, lastCheckIn: last, days, recentCount: cis.length }
    }).sort((a, b) => {
      // Sort: overdue (>7d or never) first, then by days desc
      const aOverdue = a.days === null || a.days > 7
      const bOverdue = b.days === null || b.days > 7
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
      if (a.days === null && b.days === null) return 0
      if (a.days === null) return 1
      if (b.days === null) return -1
      return b.days - a.days
    })
  }, [activeClients, allCheckIns])

  const filtered = clientSummaries.filter(s =>
    !search.trim() ||
    s.client.name.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const checkInsThisWeek    = allCheckIns.filter(ci => new Date(ci.checked_in_at).getTime() >= weekAgo)
  const clientsActiveWeek   = new Set(checkInsThisWeek.map(ci => ci.client_id)).size
  const overdueCount        = clientSummaries.filter(s => s.days === null || s.days > 7).length

  const isLoading = clientsLoading || checkInsLoading

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Check-ins</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track client progress across weight, body fat, energy and sleep
            </p>
          </div>
          <button
            onClick={() => setLogModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <Plus size={16} /> Log Check-in
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="This Week"
            value={checkInsThisWeek.length}
            sub="check-ins logged"
            color="text-brand-600"
          />
          <StatCard
            label="Clients Active"
            value={`${clientsActiveWeek} / ${activeClients.length}`}
            sub="checked in this week"
            color="text-emerald-600"
          />
          <StatCard
            label="Overdue"
            value={overdueCount}
            sub="clients 7+ days or never"
            color={overdueCount > 0 ? 'text-rose-600' : 'text-gray-400'}
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
          />
        </div>

        {/* Client grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList size={24} className="text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">
              {activeClients.length === 0 ? 'No active clients yet' : 'No clients match your search'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              {activeClients.length === 0
                ? 'Add clients first, then log their check-ins here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <>
            {/* Overdue section */}
            {filtered.some(s => s.days === null || s.days > 7) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Needs Attention
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered
                    .filter(s => s.days === null || s.days > 7)
                    .map(s => (
                      <ClientCheckInCard
                        key={s.client.id}
                        client={s.client}
                        lastCheckIn={s.lastCheckIn}
                        days={s.days}
                        recentCount={s.recentCount}
                        onLog={() => setLogModal({ open: true, clientId: s.client.id })}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* On track section */}
            {filtered.some(s => s.days !== null && s.days <= 7) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  On Track
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered
                    .filter(s => s.days !== null && s.days <= 7)
                    .map(s => (
                      <ClientCheckInCard
                        key={s.client.id}
                        client={s.client}
                        lastCheckIn={s.lastCheckIn}
                        days={s.days}
                        recentCount={s.recentCount}
                        onLog={() => setLogModal({ open: true, clientId: s.client.id })}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log modal */}
      {logModal.open && (
        <LogCheckInModal
          clients={activeClients}
          preselectedClientId={logModal.clientId}
          onClose={() => setLogModal({ open: false })}
        />
      )}
    </div>
  )
}
