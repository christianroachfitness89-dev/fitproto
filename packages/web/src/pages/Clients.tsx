import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, UserPlus, ArrowUpDown,
  MessageSquare, MoreHorizontal, LayoutGrid, List,
  Loader2, X, Users, Upload, Download, CheckCircle2, AlertCircle,
  Copy, Check, Mail, UserCheck, Archive, Trash2, AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients'
import type { DbClient } from '@/lib/database.types'

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending'
type ViewMode = 'table' | 'grid'

// ─── Shared toolbar components ────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 shadow-sm transition-all"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
          <X size={13} />
        </button>
      )}
    </div>
  )
}

function FilterPopover({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all',
          open || activeCount > 0
            ? 'bg-brand-50 border-brand-200 text-brand-700'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
        )}
      >
        <SlidersHorizontal size={15} />
        <span className="hidden sm:inline">Filter</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 min-w-[220px]">
          {children}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: DbClient['status'] }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      status === 'active'   && 'bg-emerald-50 text-emerald-700',
      status === 'inactive' && 'bg-gray-100 text-gray-600',
      status === 'pending'  && 'bg-amber-50 text-amber-700',
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full',
        status === 'active'   && 'bg-emerald-500',
        status === 'inactive' && 'bg-gray-400',
        status === 'pending'  && 'bg-amber-500',
      )} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ComplianceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full', value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-400')}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm text-gray-600 w-8">{value}%</span>
    </div>
  )
}

function ClientCard({ client }: { client: DbClient }) {
  const initials = client.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link
      to={`/clients/${client.id}`}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-card-hover hover:border-brand-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">{client.name}</p>
            <p className="text-xs text-gray-500">{client.email ?? '—'}</p>
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Goal</span>
          <span className="font-medium text-gray-700">{client.goal ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Joined</span>
          <span className="text-gray-600">{new Date(client.joined_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2">
        <button
          onClick={e => e.preventDefault()}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
        >
          <MessageSquare size={12} />
          Message
        </button>
        <button
          onClick={e => e.preventDefault()}
          className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          View Profile
        </button>
      </div>
    </Link>
  )
}

// ─── Add Client Modal ─────────────────────────────────────────
function AddClientModal({ onClose }: { onClose: () => void }) {
  const create = useCreateClient()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', goal: '', category: '',
    status: 'active' as DbClient['status'],
  })
  const [error, setError] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setError(null)
    try {
      await create.mutateAsync({
        name:     form.name,
        email:    form.email || undefined,
        phone:    form.phone || undefined,
        goal:     form.goal || undefined,
        category: form.category || undefined,
        status:   form.status,
      })
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  placeholder="+61 4xx xxx xxx"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Primary Goal</label>
              <input
                type="text"
                value={form.goal}
                onChange={e => set('goal', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                placeholder="Weight Loss, Muscle Gain, Performance..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  placeholder="Premium, Standard..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all bg-white"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-60 transition-all"
            >
              {create.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Bulk Import ──────────────────────────────────────────────
type ImportMethod = 'email' | 'manual'
type ImportRow = {
  name: string
  email: string
  phone: string
  goal: string
  category: string
  group_name: string
  invite_method: ImportMethod
}
type ImportResult = ImportRow & { status: 'success' | 'error'; error?: string; clientId?: string }

const TEMPLATE_COLUMNS = ['name', 'email', 'phone', 'goal', 'category', 'group_name', 'invite_method']
const TEMPLATE_EXAMPLE: ImportRow[] = [
  { name: 'Jane Smith', email: 'jane@example.com', phone: '+61412345678', goal: 'Weight Loss', category: 'Premium', group_name: 'Group A', invite_method: 'email' },
  { name: 'John Doe',   email: '',                 phone: '+61498765432', goal: 'Muscle Gain',  category: 'Standard', group_name: '',        invite_method: 'manual' },
]

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_EXAMPLE, { header: TEMPLATE_COLUMNS })
  // Style the header row
  ws['!cols'] = TEMPLATE_COLUMNS.map(c => ({ wch: Math.max(c.length + 4, 18) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clients')
  XLSX.writeFile(wb, 'fitproto_client_import_template.xlsx')
}

function parseImportFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        const parsed: ImportRow[] = rows.map(r => ({
          name:          (r['name'] || r['Name'] || '').toString().trim(),
          email:         (r['email'] || r['Email'] || '').toString().trim(),
          phone:         (r['phone'] || r['Phone'] || '').toString().trim(),
          goal:          (r['goal'] || r['Goal'] || '').toString().trim(),
          category:      (r['category'] || r['Category'] || '').toString().trim(),
          group_name:    (r['group_name'] || r['Group Name'] || r['group'] || '').toString().trim(),
          invite_method: ((r['invite_method'] || r['Invite Method'] || 'manual').toString().toLowerCase().trim() === 'email' ? 'email' : 'manual') as ImportMethod,
        })).filter(r => r.name)
        resolve(parsed)
      } catch (err: any) {
        reject(new Error('Could not read file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsArrayBuffer(file)
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="ml-1.5 p-1 rounded text-gray-400 hover:text-brand-600 transition-colors"
      title="Copy link"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  )
}

function BulkImportModal({ onClose }: { onClose: () => void }) {
  const create = useCreateClient()
  const fileRef = useRef<HTMLInputElement>(null)

  type Step = 'upload' | 'preview' | 'results'
  const [step, setStep]         = useState<Step>('upload')
  const [rows, setRows]         = useState<ImportRow[]>([])
  const [results, setResults]   = useState<ImportResult[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting]   = useState(false)
  const [progress, setProgress]     = useState(0)

  const portalBase = window.location.origin + '/portal/'

  async function handleFile(file: File) {
    setParseError(null)
    try {
      const parsed = await parseImportFile(file)
      if (parsed.length === 0) { setParseError('No valid rows found. Make sure the file has a "name" column.'); return }
      setRows(parsed)
      setStep('preview')
    } catch (err: any) {
      setParseError(err.message)
    }
  }

  function onFileDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function runImport() {
    setImporting(true)
    setProgress(0)
    const out: ImportResult[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        if (row.invite_method === 'email' && !row.email) throw new Error('Email required for email invite')
        const client = await create.mutateAsync({
          name:      row.name,
          email:     row.email || undefined,
          phone:     row.phone || undefined,
          goal:      row.goal || undefined,
          category:  row.category || undefined,
          status:    row.invite_method === 'email' ? 'pending' : 'active',
        })
        out.push({ ...row, status: 'success', clientId: client.id })
      } catch (err: any) {
        out.push({ ...row, status: 'error', error: err.message })
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100))
    }
    setResults(out)
    setImporting(false)
    setStep('results')
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount   = results.filter(r => r.status === 'error').length
  const emailClients = results.filter(r => r.status === 'success' && r.invite_method === 'email')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={importing ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Upload size={16} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Bulk Import Clients</h2>
              <p className="text-xs text-gray-400">
                {step === 'upload'  && 'Upload a spreadsheet to import multiple clients at once'}
                {step === 'preview' && `${rows.length} client${rows.length !== 1 ? 's' : ''} ready to import`}
                {step === 'results' && `Import complete — ${successCount} added`}
              </p>
            </div>
          </div>
          {!importing && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">

          {/* ── Upload step ─────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Download template */}
              <div className="flex items-center justify-between p-4 bg-brand-50 rounded-xl border border-brand-100">
                <div>
                  <p className="text-sm font-semibold text-brand-800">Download Template</p>
                  <p className="text-xs text-brand-600 mt-0.5">
                    Fill in the spreadsheet then upload it below
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-brand-200 text-brand-700 text-xs font-semibold rounded-lg hover:bg-brand-50 transition-colors shadow-sm"
                >
                  <Download size={14} />
                  Download (.xlsx)
                </button>
              </div>

              {/* Template column guide */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Template Columns</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { col: 'name',          req: true,  desc: 'Full name' },
                    { col: 'email',         req: false, desc: 'Required for email invite' },
                    { col: 'phone',         req: false, desc: 'Mobile number' },
                    { col: 'goal',          req: false, desc: 'e.g. Weight Loss' },
                    { col: 'category',      req: false, desc: 'e.g. Premium' },
                    { col: 'group_name',    req: false, desc: 'Group or cohort' },
                    { col: 'invite_method', req: true,  desc: '"email" or "manual"' },
                  ].map(({ col, req, desc }) => (
                    <div key={col} className="flex items-start gap-2">
                      <code className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono text-gray-700 flex-shrink-0">{col}</code>
                      <span className="text-gray-500 leading-relaxed">{desc}{req && <span className="text-rose-500 ml-1">*</span>}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  <span className="font-semibold text-brand-600">email</span> — creates client + marks as Pending, so you can share their portal link<br />
                  <span className="font-semibold text-gray-600">manual</span> — creates client as Active with no invite
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDrop={onFileDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload size={20} className="text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Drop your file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .xls, .csv</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* ── Preview step ─────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{rows.filter(r => r.invite_method === 'manual').length}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <UserCheck size={13} className="text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-600">Manual (Active)</p>
                  </div>
                </div>
                <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 text-center">
                  <p className="text-2xl font-bold text-brand-700">{rows.filter(r => r.invite_method === 'email').length}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Mail size={13} className="text-brand-600" />
                    <p className="text-xs font-semibold text-brand-600">Email Invite (Pending)</p>
                  </div>
                </div>
              </div>

              {/* Table preview */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 sticky top-0">
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Goal</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Invite</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map((r, i) => {
                        const warn = r.invite_method === 'email' && !r.email ? 'Email required' : null
                        return (
                          <tr key={i} className={clsx('hover:bg-gray-50/60', warn && 'bg-rose-50/40')}>
                            <td className="px-3 py-2.5 font-medium text-gray-800">{r.name}</td>
                            <td className="px-3 py-2.5 text-gray-500">{r.email || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500">{r.goal || '—'}</td>
                            <td className="px-3 py-2.5">
                              {r.invite_method === 'email'
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full font-semibold"><Mail size={10} /> Email</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold"><UserCheck size={10} /> Manual</span>
                              }
                            </td>
                            <td className="px-3 py-2.5">
                              {warn
                                ? <span className="flex items-center gap-1 text-rose-600"><AlertCircle size={12} />{warn}</span>
                                : <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} />Ready</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {rows.some(r => r.invite_method === 'email' && !r.email) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  Rows with email invite method but no email will fail. Add an email or change their method to manual.
                </div>
              )}

              {importing && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Importing clients…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Results step ─────────────────────────── */}
          {step === 'results' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600" />
                  <p className="text-2xl font-bold text-emerald-700">{successCount}</p>
                  <p className="text-xs font-semibold text-emerald-600">Imported</p>
                </div>
                <div className={clsx('p-4 rounded-xl border text-center', errorCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100')}>
                  <AlertCircle size={20} className={clsx('mx-auto mb-1', errorCount > 0 ? 'text-rose-500' : 'text-gray-300')} />
                  <p className={clsx('text-2xl font-bold', errorCount > 0 ? 'text-rose-700' : 'text-gray-400')}>{errorCount}</p>
                  <p className={clsx('text-xs font-semibold', errorCount > 0 ? 'text-rose-600' : 'text-gray-400')}>Failed</p>
                </div>
              </div>

              {/* Portal links for email-invite clients */}
              {emailClients.length > 0 && (
                <div className="border border-brand-100 rounded-xl overflow-hidden">
                  <div className="bg-brand-50 px-4 py-3 border-b border-brand-100">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-brand-600" />
                      <p className="text-sm font-semibold text-brand-800">Portal Links — Share with Clients</p>
                    </div>
                    <p className="text-xs text-brand-600 mt-0.5">Copy each link and send via email or message</p>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                    {emailClients.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/60">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.email}</p>
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs text-gray-400 truncate max-w-[160px]">{portalBase}{r.clientId}</span>
                          <CopyButton text={portalBase + r.clientId} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {errorCount > 0 && (
                <div className="border border-rose-100 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-100">
                    <p className="text-xs font-semibold text-rose-700">Failed Rows</p>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-36 overflow-y-auto">
                    {results.filter(r => r.status === 'error').map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <p className="text-sm font-medium text-gray-700">{r.name}</p>
                        <p className="text-xs text-rose-600">{r.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          {step === 'upload' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors">
                <Download size={15} />
                Get Template
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('upload'); setRows([]) }} disabled={importing} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors">
                Back
              </button>
              <button
                onClick={runImport}
                disabled={importing || rows.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-60 transition-all shadow-sm shadow-brand-500/20"
              >
                {importing
                  ? <><Loader2 size={15} className="animate-spin" />Importing…</>
                  : <><Upload size={15} />Import {rows.length} Client{rows.length !== 1 ? 's' : ''}</>
                }
              </button>
            </>
          )}
          {step === 'results' && (
            <button onClick={onClose} className="ml-auto px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Client table row with actions ───────────────────────────
function ClientRow({ client }: { client: DbClient }) {
  const navigate = useNavigate()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const initials = client.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  async function archive() {
    setMenuOpen(false)
    await updateClient.mutateAsync({ id: client.id, status: client.status === 'inactive' ? 'active' : 'inactive' })
  }

  async function confirmDelete() {
    setDeleting(true)
    try { await deleteClient.mutateAsync(client.id) } finally { setDeleting(false) }
  }

  return (
    <>
      <tr className="hover:bg-gray-50/70 transition-colors group">
        <td className="px-5 py-4"><input type="checkbox" className="rounded border-gray-300" /></td>
        <td className="px-4 py-4">
          <Link to={`/clients/${client.id}`} className="flex items-center gap-3 group/link">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover/link:text-brand-600 transition-colors">{client.name}</p>
              <p className="text-xs text-gray-500">{client.email ?? '—'}</p>
            </div>
          </Link>
        </td>
        <td className="px-4 py-4"><StatusBadge status={client.status} /></td>
        <td className="px-4 py-4 text-sm text-gray-600">{client.goal ?? '—'}</td>
        <td className="px-4 py-4 text-sm text-gray-600">{new Date(client.joined_at).toLocaleDateString()}</td>
        <td className="px-4 py-4 text-sm text-gray-600">{client.category ?? '—'}</td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => navigate(`/clients/${client.id}`)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MessageSquare size={15} />
            </button>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <MoreHorizontal size={15} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  <button
                    onClick={archive}
                    disabled={updateClient.isPending}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Archive size={14} className="text-amber-500" />
                    {client.status === 'inactive' ? 'Unarchive' : 'Archive'}
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={() => { setMenuOpen(false); setShowConfirm(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>

      {showConfirm && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
                <div className="flex flex-col items-center text-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertTriangle size={22} className="text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Delete {client.name}?</h3>
                    <p className="text-sm text-gray-500 mt-1">This permanently removes the client and all their data. This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors"
                  >
                    {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Clients page ─────────────────────────────────────────────
export default function Clients() {
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode]     = useState<ViewMode>('table')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const { data: clients = [], isLoading } = useClients({
    status: statusFilter,
    search: search.length >= 2 ? search : undefined,
  })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {showAddModal    && <AddClientModal   onClose={() => setShowAddModal(false)} />}
      {showImportModal && <BulkImportModal onClose={() => setShowImportModal(false)} />}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 leading-none">
            Clients <span className="text-gray-400 font-normal text-base">{!isLoading && `(${clients.length})`}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <SearchBar value={search} onChange={setSearch} placeholder="Search clients…" />
          <FilterPopover activeCount={statusFilter !== 'all' ? 1 : 0}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'active', 'inactive', 'pending'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',
                    statusFilter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </FilterPopover>
          <button
            onClick={() => setViewMode(v => v === 'table' ? 'grid' : 'table')}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            {viewMode === 'table' ? <LayoutGrid size={16} /> : <List size={16} />}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm flex-shrink-0"
          >
            <Upload size={15} /><span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all shadow-sm shadow-brand-500/20 flex-shrink-0"
          >
            <UserPlus size={15} /><span className="hidden sm:inline">Add Client</span>
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* Grid view */}
      {!isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map(c => <ClientCard key={c.id} client={c} />)}
          {clients.length === 0 && <EmptyState onAdd={() => setShowAddModal(true)} />}
        </div>
      )}

      {/* Table view */}
      {!isLoading && viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left"><input type="checkbox" className="rounded border-gray-300" /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Goal</th>
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                      Joined <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map(client => <ClientRow key={client.id} client={client} />)}
              </tbody>
            </table>
          </div>
          {clients.length === 0 && (
            <div className="text-center py-16">
              <EmptyState onAdd={() => setShowAddModal(true)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-8 text-gray-400 col-span-full">
      <Users size={40} className="mx-auto mb-3 opacity-20" />
      <p className="font-medium text-sm">No clients found</p>
      <p className="text-xs mt-1 mb-4">Add your first client to get started</p>
      <button
        onClick={onAdd}
        className="px-4 py-2 bg-brand-50 text-brand-600 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors"
      >
        + Add Client
      </button>
    </div>
  )
}
