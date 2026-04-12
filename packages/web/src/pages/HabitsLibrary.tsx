import { useState } from 'react'
import {
  Repeat2, Plus, Trash2, Search, Loader2,
  UserPlus, ToggleLeft, ToggleRight, X, Library,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useAllHabits, useHabitTemplates,
  useCreateHabit, useDeleteHabit, useToggleHabitActive, useAssignHabitTemplate,
  type DbHabit,
} from '@/hooks/useHabits'
import { useClients } from '@/hooks/useClients'
import { useMetricDefinitions } from '@/hooks/useMetrics'
import clsx from 'clsx'

type Tab = 'templates' | 'assigned'

const EMOJIS = ['✅', '💧', '🏃', '🥗', '😴', '🧘', '💪', '📖', '🚶', '🥤', '🎯', '⚡']

const FREQ_LABELS: Record<DbHabit['frequency'], string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  weekly: 'Weekly',
}

// ── Assign-template modal ────────────────────────────────────
function AssignModal({
  template,
  clients,
  onAssign,
  onClose,
}: {
  template: DbHabit
  clients: { id: string; name: string }[]
  onAssign: (clientId: string) => Promise<unknown>
  onClose: () => void
}) {
  const [clientId, setClientId] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setBusy(true)
    try { await onAssign(clientId); onClose() }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#242d40] rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#e8edf5]">Assign Habit</h3>
            <p className="text-xs text-[#8a9ab5] mt-0.5">{template.emoji} {template.name}</p>
          </div>
          <button onClick={onClose} className="text-[#4a5a75] hover:text-[#8a9ab5] p-1"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
          >
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm font-semibold text-[#8a9ab5] bg-[#1e2535] rounded-xl hover:bg-[#242d40] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!clientId || busy}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-black text-[#0d1117] bg-amber-400 rounded-xl disabled:opacity-50 hover:bg-amber-300 transition-all">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function HabitsLibrary() {
  const { profile } = useAuth()
  const { data: habits = [], isLoading: habitsLoading } = useAllHabits()
  const { data: templates = [], isLoading: templatesLoading } = useHabitTemplates()
  const { data: clients = [] } = useClients()
  const createHabit = useCreateHabit()
  const deleteHabit = useDeleteHabit()
  const toggleActive = useToggleHabitActive()
  const assignTemplate = useAssignHabitTemplate()

  const [tab, setTab] = useState<Tab>('templates')
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [assigningTemplate, setAssigningTemplate] = useState<DbHabit | null>(null)

  // Create form
  const { data: metricDefs = [] } = useMetricDefinitions()

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✅')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<DbHabit['frequency']>('daily')
  const [assignTo, setAssignTo] = useState('')
  const [metricDefId, setMetricDefId] = useState('')
  const [creating, setCreating] = useState(false)

  if (!profile?.org_id) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-amber-400" /></div>

  const isTemplate = tab === 'templates'

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (!isTemplate && !assignTo) return
    setCreating(true)
    try {
      await createHabit.mutateAsync({
        client_id:            isTemplate ? null : assignTo,
        name:                 name.trim(),
        description:          description.trim() || undefined,
        emoji,
        frequency,
        is_template:          isTemplate,
        metric_definition_id: metricDefId || null,
      })
      setName(''); setDescription(''); setEmoji('✅'); setFrequency('daily'); setAssignTo(''); setMetricDefId('')
    } finally {
      setCreating(false)
    }
  }

  const filteredHabits = habits.filter(h => {
    if (statusFilter === 'active' && !h.active) return false
    if (statusFilter === 'inactive' && h.active) return false
    if (clientFilter !== 'all' && h.client_id !== clientFilter) return false
    if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredTemplates = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = habits.filter(h => h.active).length

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto bg-[#0d1117] min-h-screen">
      {assigningTemplate && (
        <AssignModal
          template={assigningTemplate}
          clients={clients}
          onAssign={(clientId) =>
            assignTemplate.mutateAsync({ template: assigningTemplate, clientId })
          }
          onClose={() => setAssigningTemplate(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <Repeat2 size={18} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#e8edf5]">Habits</h1>
          {activeCount > 0 && (
            <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              {activeCount} active
            </span>
          )}
        </div>
        <p className="text-sm text-[#8a9ab5] ml-12">Build a habit template library, then assign to any client instantly.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#161b27] border border-[#242d40] rounded-xl mb-6 w-fit">
        {([
          { id: 'templates', label: 'Templates', count: templates.length },
          { id: 'assigned',  label: 'Assigned',  count: activeCount || habits.length },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2',
              tab === t.id
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/5'
                : 'text-[#3a4a62] hover:text-[#8a9ab5]'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.id ? 'bg-amber-400/10 text-amber-400' : 'bg-[#1e2535] text-[#4a5a75]'
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-[#161b27] rounded-2xl border border-[#242d40] p-4 sm:p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          {isTemplate
            ? <Library size={14} className="text-[#4a5a75]" />
            : <UserPlus size={14} className="text-[#4a5a75]" />
          }
          <p className="text-xs font-semibold text-[#8a9ab5] uppercase tracking-wide">
            {isTemplate ? 'New Template' : 'Assign New Habit'}
          </p>
        </div>

        {/* Emoji picker */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={clsx(
                'w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                emoji === e ? 'bg-amber-400/10 ring-2 ring-amber-400/50 ring-offset-1 ring-offset-[#161b27]' : 'hover:bg-[#1e2535]'
              )}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={isTemplate ? 'Habit template name…' : 'Habit name…'}
            className="flex-1 px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb] placeholder-[#3a4a62]"
          />
          {!isTemplate && (
            <select
              value={assignTo}
              onChange={e => setAssignTo(e.target.value)}
              required={!isTemplate}
              className="px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
            >
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb] placeholder-[#3a4a62]"
          />
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as DbHabit['frequency'])}
            className="px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
          >
            {(Object.keys(FREQ_LABELS) as DbHabit['frequency'][]).map(f => (
              <option key={f} value={f}>{FREQ_LABELS[f]}</option>
            ))}
          </select>
          {metricDefs.length > 0 && (
            <select
              value={metricDefId}
              onChange={e => setMetricDefId(e.target.value)}
              className="px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
            >
              <option value="">+ Link metric (optional)</option>
              {metricDefs.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.name}{d.unit ? ` (${d.unit})` : ''}</option>)}
            </select>
          )}
          <button
            type="submit"
            disabled={!name.trim() || (!isTemplate && !assignTo) || creating}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-black text-[#0d1117] bg-amber-400 rounded-xl hover:bg-amber-300 disabled:opacity-50 transition-all"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isTemplate ? 'Save Template' : 'Assign Habit'}
          </button>
        </div>
      </form>

      {/* Search bar */}
      <div className="relative mb-4 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5a75]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb] placeholder-[#3a4a62]"
        />
      </div>

      {/* ── Templates tab ── */}
      {isTemplate && (
        <>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-amber-400" /></div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16">
              <Library size={32} className="mx-auto mb-3 text-[#2e3a52]" />
              <p className="text-sm font-medium text-[#3a4a62]">No templates yet</p>
              <p className="text-xs mt-1 text-[#3a4a62]">Save a template above — then assign it to any client in one click.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map(t => (
                <div key={t.id}
                  className="flex items-center gap-3 p-4 bg-[#161b27] rounded-xl border border-[#242d40] hover:bg-white/[0.03] transition-all">
                  <span className="text-xl flex-shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e8edf5] truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#1e2535] text-[#8a9ab5] border border-[#2e3a52]">
                        {FREQ_LABELS[t.frequency]}
                      </span>
                      {t.metric_definition_id && metricDefs.find(d => d.id === t.metric_definition_id) && (() => {
                        const d = metricDefs.find(m => m.id === t.metric_definition_id)!
                        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">{d.emoji} {d.name}</span>
                      })()}
                      {t.description && (
                        <span className="text-xs text-[#4a5a75] truncate max-w-[140px]">{t.description}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setAssigningTemplate(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <UserPlus size={12} />
                    Assign
                  </button>
                  <button
                    onClick={() => deleteHabit.mutate({ id: t.id, clientId: null, isTemplate: true })}
                    className="flex-shrink-0 p-1.5 rounded-lg text-[#3a4a62] hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Assigned tab ── */}
      {!isTemplate && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex gap-2">
              {(['all', 'active', 'inactive'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors',
                    statusFilter === s ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-[#4a5a75] hover:bg-[#1e2535]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb] sm:ml-auto"
            >
              <option value="all">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {habitsLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-amber-400" /></div>
          ) : filteredHabits.length === 0 ? (
            <div className="text-center py-16">
              <Repeat2 size={32} className="mx-auto mb-3 text-[#2e3a52]" />
              <p className="text-sm font-medium text-[#3a4a62]">No habits found</p>
              <p className="text-xs mt-1 text-[#3a4a62]">Assign a habit above or use a template.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHabits.map(h => (
                <div key={h.id}
                  className={clsx(
                    'flex items-center gap-3 p-4 rounded-xl border transition-all',
                    h.active ? 'bg-[#161b27] border-[#242d40]' : 'bg-[#161b27] border-[#1e2535] opacity-60'
                  )}>
                  <span className="text-xl flex-shrink-0">{h.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e8edf5] truncate">{h.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#1e2535] text-[#8a9ab5] border border-[#2e3a52]">
                        {FREQ_LABELS[h.frequency]}
                      </span>
                      {(h as any).clients?.name && (
                        <span className="text-xs text-[#4a5a75]">{(h as any).clients.name}</span>
                      )}
                      {h.metric_definition_id && metricDefs.find(d => d.id === h.metric_definition_id) && (() => {
                        const d = metricDefs.find(m => m.id === h.metric_definition_id)!
                        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">{d.emoji} {d.name}</span>
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive.mutate({ id: h.id, clientId: h.client_id, active: !h.active })}
                    title={h.active ? 'Deactivate' : 'Activate'}
                    className="flex-shrink-0 text-[#4a5a75] hover:text-amber-400 transition-colors"
                  >
                    {h.active
                      ? <ToggleRight size={20} className="text-amber-400" />
                      : <ToggleLeft size={20} />
                    }
                  </button>
                  <button
                    onClick={() => deleteHabit.mutate({ id: h.id, clientId: h.client_id })}
                    className="flex-shrink-0 p-1.5 rounded-lg text-[#3a4a62] hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
