import { useState } from 'react'
import {
  Plus, X, ChevronRight, Search, Loader2, Trash2,
  UserCheck, Phone, Mail, Tag, Calendar, ExternalLink,
  ArrowRight, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, useConvertLeadToClient } from '@/hooks/useLeads'
import type { DbLead, LeadStatus } from '@/lib/database.types'

// ─── Status config ────────────────────────────────────────────
const STAGES: { status: LeadStatus; label: string; color: string; dot: string }[] = [
  { status: 'new',                label: 'New',                color: 'bg-gray-100 text-gray-700 border-gray-200',      dot: 'bg-gray-400' },
  { status: 'preq_sent',         label: 'PreQ Sent',          color: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-400' },
  { status: 'preq_completed',    label: 'PreQ Completed',     color: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-400' },
  { status: 'consult_scheduled', label: 'Consult Scheduled',  color: 'bg-violet-50 text-violet-700 border-violet-200',  dot: 'bg-violet-400' },
  { status: 'consult_completed', label: 'Consult Done',       color: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400' },
  { status: 'converted',         label: 'Converted',          color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { status: 'lost',              label: 'Lost',               color: 'bg-rose-50 text-rose-700 border-rose-200',        dot: 'bg-rose-400' },
]

function statusCfg(s: LeadStatus) {
  return STAGES.find(st => st.status === s) ?? STAGES[0]
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = statusCfg(status)
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', cfg.color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── Add Lead modal ───────────────────────────────────────────
function AddLeadModal({ onClose }: { onClose: () => void }) {
  const createLead = useCreateLead()
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [phone, setPhone]   = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes]   = useState('')
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    try {
      await createLead.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to add lead')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Lead</h2>
            <p className="text-xs text-gray-500 mt-0.5">Add a new prospect to your pipeline</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
              placeholder="Jane Smith"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
              placeholder="instagram, referral, website…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none"
              placeholder="Goals, context, how they found you…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLead.isPending || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-50 transition-all"
            >
              {createLead.isPending ? <Loader2 size={15} className="animate-spin" /> : <><Plus size={15} /> Add Lead</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Lead detail panel ────────────────────────────────────────
function LeadPanel({ lead, onClose }: { lead: DbLead; onClose: () => void }) {
  const updateLead  = useUpdateLead()
  const deleteLead  = useDeleteLead()
  const convertLead = useConvertLeadToClient()
  const [notes, setNotes]   = useState(lead.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [showConvertConfirm, setShowConvertConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleStatusChange(status: LeadStatus) {
    await updateLead.mutateAsync({ id: lead.id, status })
  }

  async function handleSaveNotes() {
    setSaving(true)
    await updateLead.mutateAsync({ id: lead.id, notes })
    setSaving(false)
  }

  async function handleConvert() {
    await convertLead.mutateAsync({ leadId: lead.id, lead })
    onClose()
  }

  async function handleDelete() {
    await deleteLead.mutateAsync(lead.id)
    onClose()
  }

  const cfg = statusCfg(lead.status)
  const nextStatuses = STAGES.filter(s => s.status !== lead.status && s.status !== 'converted' && s.status !== 'lost')

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{lead.name}</h2>
            <div className="mt-1.5">
              <StatusBadge status={lead.status} />
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Contact info */}
          <div className="space-y-2">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-brand-600 transition-colors">
                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-brand-600 transition-colors">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                {lead.phone}
              </a>
            )}
            {lead.source && (
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <Tag size={14} className="text-gray-400 flex-shrink-0" />
                Source: <span className="font-medium text-gray-700">{lead.source}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-gray-400">
              <Calendar size={14} className="flex-shrink-0" />
              Added {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Move stage */}
          {lead.status !== 'converted' && lead.status !== 'lost' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Move to Stage</p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(s => (
                  <button
                    key={s.status}
                    onClick={() => handleStatusChange(s.status)}
                    disabled={updateLead.isPending}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all hover:shadow-sm disabled:opacity-50',
                      s.color
                    )}
                  >
                    {s.label}
                    <ArrowRight size={11} />
                  </button>
                ))}
              </div>

              {/* Quick-set lost */}
              <button
                onClick={() => handleStatusChange('lost')}
                disabled={updateLead.isPending}
                className="mt-2 text-xs text-rose-400 hover:text-rose-600 transition-colors disabled:opacity-50"
              >
                Mark as lost
              </button>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none"
              placeholder="Goals, context, follow-up reminders…"
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving || notes === (lead.notes ?? '')}
              className="mt-2 w-full py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-40 transition-all"
            >
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>

          {/* Convert to client */}
          {lead.status !== 'converted' && lead.status !== 'lost' && (
            <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck size={16} className="text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">Convert to Client</p>
              </div>
              <p className="text-xs text-emerald-700 mb-3">
                Creates a new active client profile from this lead's details.
              </p>
              {showConvertConfirm ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConvertConfirm(false)}
                    className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConvert}
                    disabled={convertLead.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {convertLead.isPending ? <Loader2 size={12} className="animate-spin" /> : <><UserCheck size={12} /> Confirm</>}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConvertConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <UserCheck size={12} /> Convert to Client
                </button>
              )}
            </div>
          )}

          {lead.status === 'converted' && lead.converted_client_id && (
            <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 flex items-center gap-3">
              <UserCheck size={18} className="text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">Converted to Client</p>
                <a
                  href={`#/clients/${lead.converted_client_id}`}
                  className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mt-0.5 transition-colors"
                >
                  View client profile <ExternalLink size={10} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="p-5 border-t border-gray-100">
          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLead.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {deleteLead.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={14} /> Delete Lead</>}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <Trash2 size={14} /> Delete Lead
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Lead card ────────────────────────────────────────────────
function LeadCard({ lead, onClick }: { lead: DbLead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">{lead.name}</p>
          {(lead.email || lead.phone) && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {lead.email ?? lead.phone}
            </p>
          )}
          {lead.source && (
            <p className="text-xs text-gray-400 mt-0.5">via {lead.source}</p>
          )}
          {lead.notes && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{lead.notes}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-400 flex-shrink-0 mt-0.5 transition-colors" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={lead.status} />
        <span className="text-[11px] text-gray-400">
          {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function Leads() {
  const { data: leads = [], isLoading } = useLeads()
  const [showAdd, setShowAdd]       = useState(false)
  const [selected, setSelected]     = useState<DbLead | null>(null)
  const [activeStage, setActiveStage] = useState<LeadStatus | 'all'>('all')
  const [search, setSearch]         = useState('')

  const filtered = leads.filter(l => {
    if (activeStage !== 'all' && l.status !== activeStage) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        l.name.toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.phone ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = STAGES.reduce((acc, s) => {
    acc[s.status] = leads.filter(l => l.status === s.status).length
    return acc
  }, {} as Record<LeadStatus, number>)

  const activeLeads     = leads.filter(l => l.status !== 'converted' && l.status !== 'lost')
  const convertedLeads  = leads.filter(l => l.status === 'converted')

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lead Pool</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeLeads.length} active · {convertedLeads.length} converted
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <Plus size={16} /> Add Lead
          </button>
        </div>

        {/* Stage filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveStage('all')}
            className={clsx(
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeStage === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            All <span className="ml-1 opacity-60">{leads.length}</span>
          </button>
          {STAGES.map(s => (
            <button
              key={s.status}
              onClick={() => setActiveStage(s.status)}
              className={clsx(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeStage === s.status
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
              {s.label}
              {counts[s.status] > 0 && (
                <span className={clsx('opacity-60', activeStage === s.status ? 'text-white' : '')}>
                  {counts[s.status]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 bg-white border-b border-gray-100">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads by name, email, or phone…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <UserCheck size={24} className="text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">
              {leads.length === 0 ? 'No leads yet' : 'No leads match your filter'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              {leads.length === 0
                ? 'Add your first prospect to start tracking your pipeline.'
                : 'Try a different stage filter or search term.'}
            </p>
            {leads.length === 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all"
              >
                <Plus size={16} /> Add First Lead
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => setSelected(lead)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pipeline summary bar */}
      {leads.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {STAGES.filter(s => s.status !== 'lost').map((s, i) => {
              const count = counts[s.status]
              const isLast = i === STAGES.filter(s => s.status !== 'lost').length - 1
              return (
                <div key={s.status} className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('w-2 h-2 rounded-full', s.dot)} />
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className="text-xs font-bold text-gray-700">{count}</span>
                  </div>
                  {!isLast && <ChevronRight size={12} className="text-gray-300 mx-1" />}
                </div>
              )
            })}
            {counts['lost'] > 0 && (
              <>
                <span className="text-gray-200 mx-2">·</span>
                <span className="text-xs text-rose-400">{counts['lost']} lost</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} />}
      {selected && (
        <LeadPanel
          lead={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
