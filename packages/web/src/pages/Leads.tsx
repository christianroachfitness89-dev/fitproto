import { useState, useId } from 'react'
import {
  Plus, X, ChevronRight, Search, Loader2, Trash2,
  UserCheck, Phone, Mail, Tag, Calendar, ExternalLink,
  ArrowRight, AlertCircle, Settings2, ClipboardList,
  CheckCircle2, CalendarClock, GripVertical, PhoneCall,
  Upload, Download, FileSpreadsheet,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import clsx from 'clsx'
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, useConvertLeadToClient } from '@/hooks/useLeads'
import {
  useQuestionnaireTemplate,
  useUpsertQuestionnaireTemplate,
  useQuestionnaireResponse,
  useSaveQuestionnaireResponse,
  type QuestionnaireQuestion,
  type QuestionType,
} from '@/hooks/useQuestionnaires'
import type { DbLead, LeadStatus, CallLog, CallOutcome } from '@/lib/database.types'

// ─── Status config ────────────────────────────────────────────
const STAGES: { status: LeadStatus; label: string; color: string; dot: string }[] = [
  { status: 'new',               label: 'New',          color: 'bg-[#161b27] text-[#8a9ab5] border-[#242d40]',       dot: 'bg-[#3a4a62]'    },
  { status: 'called',            label: 'Called',        color: 'bg-sky-50 text-sky-700 border-sky-200',           dot: 'bg-sky-400'     },
  { status: 'booked',            label: 'Booked',        color: 'bg-violet-50 text-violet-700 border-violet-200',  dot: 'bg-violet-400'  },
  { status: 'preq_completed',    label: 'PreQ Done',     color: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-400'  },
  { status: 'consult_completed', label: 'Consult Done',  color: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400'   },
  { status: 'converted',  label: 'Converted',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { status: 'lost',       label: 'Lost',       color: 'bg-rose-50 text-rose-700 border-rose-200',         dot: 'bg-rose-400'    },
  { status: 'follow_up',  label: 'Follow Up',  color: 'bg-orange-50 text-orange-700 border-orange-200',   dot: 'bg-orange-400'  },
]

const CALL_OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'answered',      label: 'Answered'       },
  { value: 'voicemail',     label: 'Voicemail'      },
  { value: 'no_answer',     label: 'No Answer'      },
  { value: 'sms',           label: 'SMS Sent'       },
  { value: 'scheduled',     label: 'Scheduled ✓'   },
  { value: 'not_interested', label: 'Not Interested' },
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

// ─── Setup Templates modal ───────────────────────────────────
function SetupTemplatesModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'preq' | 'consult'>('preq')
  const { data: preqTpl }   = useQuestionnaireTemplate('preq')
  const { data: consultTpl } = useQuestionnaireTemplate('consult')
  const upsert = useUpsertQuestionnaireTemplate()
  const uid = useId()

  const DEFAULT_TITLES = { preq: 'Pre-Qualification', consult: 'Consultation' }

  // local editable state per tab
  const [preqQuestions,    setPreqQuestions]    = useState<QuestionnaireQuestion[] | null>(null)
  const [consultQuestions, setConsultQuestions] = useState<QuestionnaireQuestion[] | null>(null)

  // initialise from fetched data once (on first render with data)
  const qs    = tab === 'preq' ? (preqQuestions ?? preqTpl?.questions ?? []) : (consultQuestions ?? consultTpl?.questions ?? [])
  const setQs = tab === 'preq' ? setPreqQuestions : setConsultQuestions

  function addQuestion() {
    const q: QuestionnaireQuestion = {
      id: `${uid}-${Date.now()}`,
      text: '',
      type: 'text',
      required: false,
    }
    setQs([...qs, q])
  }

  function updateQuestion(id: string, patch: Partial<QuestionnaireQuestion>) {
    setQs(qs.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  function removeQuestion(id: string) {
    setQs(qs.filter(q => q.id !== id))
  }

  async function handleSave() {
    const title = tab === 'preq'
      ? (preqTpl?.title ?? DEFAULT_TITLES.preq)
      : (consultTpl?.title ?? DEFAULT_TITLES.consult)
    await upsert.mutateAsync({ type: tab, title, questions: qs })
  }

  const TABS = [
    { key: 'preq' as const, label: 'Pre-Qualification' },
    { key: 'consult' as const, label: 'Consultation' },
  ]
  const QTYPES: { value: QuestionType; label: string }[] = [
    { value: 'text',           label: 'Short answer' },
    { value: 'textarea',       label: 'Long answer' },
    { value: 'yes_no',         label: 'Yes / No' },
    { value: 'checkbox_group', label: 'Checkboxes' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242d40]">
          <div>
            <h2 className="text-base font-bold text-[#e8edf5]">Questionnaire Templates</h2>
            <p className="text-xs text-[#4a5a75] mt-0.5">Set up questions for PreQ and Consult</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27]">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'px-4 py-2 text-sm font-semibold rounded-lg transition-all',
                tab === t.key ? 'bg-amber-400 text-white' : 'bg-[#161b27] text-[#4a5a75] hover:bg-[#1e2535]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {qs.length === 0 && (
            <p className="text-sm text-[#3a4a62] text-center py-6">
              No questions yet. Add your first one below.
            </p>
          )}
          {qs.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2 bg-[#0d1117] rounded-xl p-3 border border-[#242d40]">
              <span className="text-[#2e3a52] mt-2.5 flex-shrink-0 cursor-grab"><GripVertical size={14} /></span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={q.text}
                  onChange={e => updateQuestion(q.id, { text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-lg bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                  placeholder={`Question ${i + 1}`}
                />
                <div className="flex items-center gap-3">
                  <select
                    value={q.type}
                    onChange={e => updateQuestion(q.id, { type: e.target.value as QuestionType, options: e.target.value === 'checkbox_group' ? (q.options ?? ['']) : undefined })}
                    className="flex-1 text-xs px-2 py-1.5 border border-[#242d40] rounded-lg bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all"
                  >
                    {QTYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-[#4a5a75] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                      className="rounded"
                    />
                    Required
                  </label>
                </div>
                {q.type === 'checkbox_group' && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-[#4a5a75] uppercase tracking-wider">Checkbox options</p>
                    {(q.options ?? ['']).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const opts = [...(q.options ?? [''])]
                            opts[oi] = e.target.value
                            updateQuestion(q.id, { options: opts })
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-[#242d40] rounded-lg bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                          placeholder={`Option ${oi + 1}`}
                        />
                        <button
                          onClick={() => {
                            const opts = (q.options ?? ['']).filter((_, j) => j !== oi)
                            updateQuestion(q.id, { options: opts.length ? opts : [''] })
                          }}
                          className="p-1 text-[#2e3a52] hover:text-rose-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateQuestion(q.id, { options: [...(q.options ?? ['']), ''] })}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-400 transition-colors"
                    >
                      + Add option
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => removeQuestion(q.id)}
                className="p-1.5 text-[#2e3a52] hover:text-rose-400 transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            onClick={addQuestion}
            className="w-full py-2.5 text-sm font-semibold text-amber-400 bg-amber-400/10 border border-dashed border-amber-400/30 rounded-xl hover:bg-amber-400/10 transition-colors"
          >
            + Add Question
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#242d40]">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={upsert.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 transition-all"
          >
            {upsert.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><CheckCircle2 size={14} /> Save Template</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Bulk Import modal ────────────────────────────────────────
interface ImportRow {
  name: string
  email: string
  phone: string
  source: string
  notes: string
  valid: boolean
  error?: string
}

function BulkImportModal({ onClose }: { onClose: () => void }) {
  const createLead = useCreateLead()
  const [rows, setRows]       = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone]       = useState(false)
  const [imported, setImported] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Email', 'Phone', 'Source', 'Notes'],
      ['Jane Smith', 'jane@example.com', '+1 555 000 0000', 'Instagram', 'Interested in 1-on-1 coaching'],
    ])
    ws['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 40 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, 'leads-import-template.xlsx')
  }

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb   = XLSX.read(data, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw  = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

      const parsed: ImportRow[] = raw.map(r => {
        // case-insensitive column matching
        const get = (key: string) => {
          const found = Object.keys(r).find(k => k.trim().toLowerCase() === key.toLowerCase())
          return found ? String(r[found]).trim() : ''
        }
        const name = get('name')
        return {
          name,
          email:  get('email'),
          phone:  get('phone'),
          source: get('source'),
          notes:  get('notes'),
          valid:  !!name,
          error:  !name ? 'Name is required' : undefined,
        }
      })
      setRows(parsed)
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFile(file: File) {
    const ok = file.name.match(/\.(xlsx?|csv)$/i)
    if (!ok) return
    parseFile(file)
  }

  async function handleImport() {
    const valid = rows.filter(r => r.valid)
    if (!valid.length) return
    setImporting(true)
    let count = 0
    for (const row of valid) {
      try {
        await createLead.mutateAsync({
          name:   row.name,
          email:  row.email  || undefined,
          phone:  row.phone  || undefined,
          source: row.source || undefined,
          notes:  row.notes  || undefined,
        })
        count++
      } catch { /* skip errored rows */ }
    }
    setImported(count)
    setImporting(false)
    setDone(true)
  }

  const validCount   = rows.filter(r => r.valid).length
  const invalidCount = rows.filter(r => !r.valid).length

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-sm p-8 z-10 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-[#e8edf5] mb-1">Import Complete</h2>
          <p className="text-[#4a5a75] text-sm mb-6">
            <span className="font-semibold text-emerald-600">{imported}</span> lead{imported !== 1 ? 's' : ''} added to the pool.
            {invalidCount > 0 && <span className="text-rose-500"> {invalidCount} row{invalidCount !== 1 ? 's' : ''} skipped.</span>}
          </p>
          <button onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-white bg-amber-400 hover:bg-amber-400 rounded-xl transition-colors">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242d40]">
          <div>
            <h2 className="text-base font-bold text-[#e8edf5]">Import Leads</h2>
            <p className="text-xs text-[#4a5a75] mt-0.5">Upload an Excel or CSV file to add leads in bulk</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Template download */}
          <div className="flex items-center justify-between p-4 bg-amber-400/10 border border-amber-400/20 rounded-xl">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-400">Download Template</p>
                <p className="text-xs text-amber-400">Get the Excel template with correct column headers</p>
              </div>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-amber-400 hover:bg-amber-400 rounded-lg transition-colors flex-shrink-0">
              <Download size={13} /> Download
            </button>
          </div>

          {/* Drop zone */}
          {rows.length === 0 ? (
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              className={clsx(
                'flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all',
                dragOver ? 'border-amber-400 bg-amber-400/10' : 'border-[#242d40] bg-[#0d1117] hover:border-amber-400/30 hover:bg-amber-400/10/40'
              )}
            >
              <Upload size={28} className={dragOver ? 'text-amber-400' : 'text-[#2e3a52]'} />
              <div className="text-center">
                <p className="text-sm font-semibold text-[#8a9ab5]">Drop your file here, or <span className="text-amber-400">browse</span></p>
                <p className="text-xs text-[#3a4a62] mt-1">Supports .xlsx, .xls, .csv</p>
              </div>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </label>
          ) : (
            /* Row preview */
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-[#8a9ab5]">{rows.length} rows found</p>
                  {validCount > 0   && <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{validCount} valid</span>}
                  {invalidCount > 0 && <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">{invalidCount} invalid</span>}
                </div>
                <button onClick={() => setRows([])}
                  className="text-xs text-[#3a4a62] hover:text-[#8a9ab5] transition-colors">
                  Clear
                </button>
              </div>

              <div className="border border-[#242d40] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-0 text-[11px] font-semibold text-[#4a5a75] uppercase tracking-wide bg-[#0d1117] px-3 py-2 border-b border-[#242d40]">
                  <span className="w-6" />
                  <span>Name</span><span>Email</span><span>Phone</span><span>Source</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#1e2535]">
                  {rows.map((row, i) => (
                    <div key={i}
                      className={clsx('grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-0 items-center px-3 py-2.5 text-xs',
                        row.valid ? 'bg-[#161b27]' : 'bg-rose-50'
                      )}>
                      <div className="w-6 flex-shrink-0">
                        {row.valid
                          ? <CheckCircle2 size={13} className="text-emerald-500" />
                          : <AlertCircle  size={13} className="text-rose-400" />
                        }
                      </div>
                      <span className={clsx('truncate font-medium', row.valid ? 'text-[#e8edf5]' : 'text-rose-600')}>
                        {row.name || <span className="italic text-rose-400">missing</span>}
                      </span>
                      <span className="truncate text-[#4a5a75]">{row.email || '—'}</span>
                      <span className="truncate text-[#4a5a75]">{row.phone || '—'}</span>
                      <span className="truncate text-[#4a5a75]">{row.source || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#242d40]">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={validCount === 0 || importing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 transition-all"
          >
            {importing
              ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
              : <><Upload size={14} /> Import {validCount > 0 ? `${validCount} Lead${validCount !== 1 ? 's' : ''}` : 'Leads'}</>
            }
          </button>
        </div>
      </div>
    </div>
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
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#e8edf5]">Add Lead</h2>
            <p className="text-xs text-[#4a5a75] mt-0.5">Add a new prospect to your pipeline</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27]">
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
            <label className="block text-sm font-medium text-[#8a9ab5] mb-1.5">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
              placeholder="Jane Smith"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#8a9ab5] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8a9ab5] mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8a9ab5] mb-1.5">Source</label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
              placeholder="instagram, referral, website…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8a9ab5] mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all resize-none"
              placeholder="Goals, context, how they found you…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLead.isPending || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 transition-all"
            >
              {createLead.isPending ? <Loader2 size={15} className="animate-spin" /> : <><Plus size={15} /> Add Lead</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Questionnaire fill-out modal ────────────────────────────
function QuestionnaireModal({
  lead,
  type,
  onComplete,
  onClose,
}: {
  lead: DbLead
  type: 'preq' | 'consult'
  onComplete: () => void
  onClose: () => void
}) {
  const { data: template, isLoading: tplLoading } = useQuestionnaireTemplate(type)
  const { data: existing, isLoading: respLoading } = useQuestionnaireResponse(lead.id, type)
  const saveResponse = useSaveQuestionnaireResponse()
  const updateLead   = useUpdateLead()

  const [answers, setAnswers] = useState<Record<string, string | boolean | string[]>>({})
  const [initialised, setInitialised] = useState(false)

  // populate from existing response once loaded
  if (!initialised && !respLoading && existing) {
    setAnswers(existing.answers)
    setInitialised(true)
  }

  const questions = template?.questions ?? []
  const title     = template?.title ?? (type === 'preq' ? 'Pre-Qualification' : 'Consultation')
  const nextStatus: LeadStatus = type === 'preq' ? 'preq_completed' : 'consult_completed'

  async function handleSave() {
    await saveResponse.mutateAsync({
      leadId: lead.id,
      type,
      answers,
      existingId: existing?.id,
    })
    await updateLead.mutateAsync({ id: lead.id, status: nextStatus })
    onComplete()
  }

  const loading = tplLoading || respLoading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] z-10">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-[#242d40]">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-0.5">
              {title}
            </p>
            <h2 className="text-base font-bold text-[#e8edf5] truncate">{lead.name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27] flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-amber-400" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList size={32} className="mx-auto text-[#2e3a52] mb-3" />
              <p className="text-sm font-semibold text-[#8a9ab5] mb-1">No questions set up yet</p>
              <p className="text-xs text-[#3a4a62]">
                Add questions to the {title} template, or mark this as complete now.
              </p>
            </div>
          ) : (
            questions.map((q, i) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-[#e8edf5] mb-1.5">
                  {i + 1}. {q.text || <span className="text-[#3a4a62] italic">Untitled question</span>}
                  {q.required && <span className="text-rose-400 ml-1">*</span>}
                </label>
                {q.type === 'checkbox_group' ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {(q.options ?? []).filter(Boolean).map(opt => {
                      const selected = (answers[q.id] as string[] | undefined) ?? []
                      const checked = selected.includes(opt)
                      return (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? selected.filter(o => o !== opt)
                                : [...selected, opt]
                              setAnswers(a => ({ ...a, [q.id]: next }))
                            }}
                            className="w-4 h-4 rounded border-[#2e3a52] text-amber-400 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
                          />
                          <span className="text-sm text-[#8a9ab5] group-hover:text-[#e8edf5]">{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : q.type === 'yes_no' ? (
                  <div className="flex gap-2">
                    {(['Yes', 'No'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt === 'Yes' }))}
                        className={clsx(
                          'flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition-all',
                          answers[q.id] === (opt === 'Yes')
                            ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                            : 'border-[#242d40] text-[#4a5a75] hover:border-[#2e3a52]'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.type === 'textarea' ? (
                  <textarea
                    value={(answers[q.id] as string) ?? ''}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all resize-none"
                    placeholder="Enter your answer…"
                  />
                ) : (
                  <input
                    type="text"
                    value={(answers[q.id] as string) ?? ''}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                    placeholder="Enter your answer…"
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#242d40]">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveResponse.isPending || updateLead.isPending || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 transition-all"
          >
            {(saveResponse.isPending || updateLead.isPending)
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><CheckCircle2 size={14} /> Save & Mark Complete</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Lead detail panel ────────────────────────────────────────
function LeadPanel({ lead, onClose }: { lead: DbLead; onClose: () => void }) {
  const updateLead  = useUpdateLead()
  const deleteLead  = useDeleteLead()
  const convertLead = useConvertLeadToClient()
  const [notes, setNotes]       = useState(lead.notes ?? '')
  const [notesTouched, setNotesTouched] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [showConvertConfirm, setShowConvertConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false)
  const [questModal, setQuestModal] = useState<'preq' | 'consult' | null>(null)
  const [showScheduleForm, setShowScheduleForm]     = useState(false)
  const [consultDate, setConsultDate]               = useState('')
  const [consultTime, setConsultTime]               = useState('')
  const [calendarBooked, setCalendarBooked]         = useState(false)
  const [showLostForm, setShowLostForm]             = useState(false)
  const [lostReason, setLostReason]                 = useState('')
  const [showCallForm, setShowCallForm]             = useState(false)
  const [callDate, setCallDate]                     = useState(() => new Date().toISOString().slice(0, 10))
  const [callTime, setCallTime]                     = useState(() => new Date().toTimeString().slice(0, 5))
  const [callOutcome, setCallOutcome]               = useState<CallOutcome | ''>('')
  const [followUpDate, setFollowUpDate]             = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10)
  })

  // sync notes when lead prop updates (status change), but not if user is typing
  if (!notesTouched && notes !== (lead.notes ?? '')) setNotes(lead.notes ?? '')

  async function handleStatusChange(status: LeadStatus) {
    await updateLead.mutateAsync({ id: lead.id, status })
  }

  async function handleSaveNotes() {
    setSaving(true)
    await updateLead.mutateAsync({ id: lead.id, notes })
    setSaving(false)
    setNotesTouched(false)
  }

  async function handleConvert() {
    await convertLead.mutateAsync({ leadId: lead.id, lead })
    onClose()
  }

  async function handleDelete() {
    await deleteLead.mutateAsync(lead.id)
    onClose()
  }

  async function handleLogCall() {
    if (!callOutcome) return
    if (callOutcome === 'not_interested' && !followUpDate) return
    const dt = `${callDate}T${callTime}`
    const outcomeLabel = CALL_OUTCOMES.find(o => o.value === callOutcome)?.label ?? callOutcome
    const newLog: CallLog = { called_at: dt, outcome: callOutcome as CallOutcome }
    const existingLogs: CallLog[] = Array.isArray(lead.call_logs) ? lead.call_logs : []
    const line = `📞 ${new Date(dt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} — ${outcomeLabel}`
    const newNotes = lead.notes ? `${lead.notes}\n${line}` : line
    await updateLead.mutateAsync({
      id: lead.id,
      status: callOutcome === 'not_interested' ? 'follow_up' : 'called',
      call_logs: [...existingLogs, newLog],
      notes: newNotes,
      ...(callOutcome === 'not_interested' ? { follow_up_date: followUpDate } : {}),
    })
    setCallOutcome('')
    setCallDate(new Date().toISOString().slice(0, 10))
    setCallTime(new Date().toTimeString().slice(0, 5))
    setShowCallForm(false)
    setNotesTouched(false)
  }

  async function handleMarkLost() {
    await updateLead.mutateAsync({
      id: lead.id,
      status: 'lost',
      non_conversion_reason: lostReason || null,
    })
    setShowLostForm(false)
  }

  async function handleScheduleConsult() {
    const scheduledAt = (consultDate && consultTime)
      ? new Date(`${consultDate}T${consultTime}`).toISOString()
      : null
    await updateLead.mutateAsync({
      id: lead.id,
      status: 'booked',
      consult_scheduled_at: scheduledAt,
      consult_calendar_booked: calendarBooked,
    })
    setShowScheduleForm(false)
  }

  // Contextual next-step action per status
  // 'new' and 'called' are handled by the dedicated call log section below
  const nextStep: { label: string; icon: React.ReactNode; description: string; btnClass: string; action: () => void } | null = (() => {
    switch (lead.status) {
      case 'booked':
        return { label: 'Start PreQ', icon: <ClipboardList size={15} />, description: 'Fill in the Pre-Qualification questions with the lead.', btnClass: 'from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600', action: () => setQuestModal('preq') }
      case 'preq_completed':
        return { label: 'Start Consult', icon: <ClipboardList size={15} />, description: 'Fill in the Consultation answers with the lead.', btnClass: 'from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600', action: () => setQuestModal('consult') }
      default: return null
    }
  })()

  const callLogs: CallLog[] = Array.isArray(lead.call_logs) ? lead.call_logs : []
  const hasScheduledCall = callLogs.some(l => l.outcome === 'scheduled')

  // Hide the natural next step + legacy statuses from manual jump list
  const NATURAL_NEXT: Partial<Record<LeadStatus, LeadStatus>> = {
    new: 'called', called: 'booked', booked: 'preq_completed', preq_completed: 'consult_completed',
  }
  const naturalNext = NATURAL_NEXT[lead.status]
  const otherStages = STAGES.filter(s =>
    s.status !== lead.status &&
    s.status !== 'converted' &&
    s.status !== 'lost' &&
    s.status !== 'follow_up' &&
    s.status !== naturalNext
  )

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />
        <div className="relative w-full max-w-md bg-[#161b27] shadow-2xl flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-[#242d40]">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[#e8edf5] truncate">{lead.name}</h2>
              <div className="mt-1.5"><StatusBadge status={lead.status} /></div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27] flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 p-5 space-y-5">
            {/* Contact info */}
            <div className="space-y-2">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm text-[#8a9ab5] hover:text-amber-400 transition-colors">
                  <Mail size={14} className="text-[#3a4a62] flex-shrink-0" />{lead.email}
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-sm text-[#8a9ab5] hover:text-amber-400 transition-colors">
                  <Phone size={14} className="text-[#3a4a62] flex-shrink-0" />{lead.phone}
                </a>
              )}
              {lead.source && (
                <div className="flex items-center gap-2.5 text-sm text-[#4a5a75]">
                  <Tag size={14} className="text-[#3a4a62] flex-shrink-0" />
                  Source: <span className="font-medium text-[#8a9ab5] ml-1">{lead.source}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm text-[#3a4a62]">
                <Calendar size={14} className="flex-shrink-0" />
                Added {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              {lead.consult_scheduled_at && (
                <div className="flex items-center gap-2.5 text-sm text-violet-600">
                  <CalendarClock size={14} className="flex-shrink-0" />
                  Consult: {new Date(lead.consult_scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {lead.consult_calendar_booked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                      <CheckCircle2 size={10} /> In calendar
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Call Log section (New / Called) ──────── */}
            {(lead.status === 'new' || lead.status === 'called') && (
              <div className="border border-sky-200 bg-sky-50/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Call Log</p>
                    {callLogs.length > 0 && (
                      <p className="text-xs text-[#3a4a62] mt-0.5">{callLogs.length} attempt{callLogs.length > 1 ? 's' : ''} logged</p>
                    )}
                  </div>
                  {!showCallForm && (
                    <button onClick={() => setShowCallForm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-[#161b27] border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors">
                      <PhoneCall size={12} /> Log Call
                    </button>
                  )}
                </div>

                {/* Previous call log entries */}
                {callLogs.length > 0 && (
                  <div className="space-y-1.5">
                    {callLogs.map((log, i) => {
                      const outcomeLabel = CALL_OUTCOMES.find(o => o.value === log.outcome)?.label ?? log.outcome
                      return (
                        <div key={i} className="flex items-center justify-between text-xs bg-[#161b27] border border-sky-100 rounded-lg px-3 py-2">
                          <span className="text-[#4a5a75]">
                            {new Date(log.called_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className={clsx('font-semibold',
                            log.outcome === 'scheduled' ? 'text-emerald-600' :
                            log.outcome === 'answered'  ? 'text-sky-600'     :
                            'text-[#4a5a75]'
                          )}>
                            {outcomeLabel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Log call form */}
                {showCallForm && (
                  <div className="bg-[#161b27] border border-sky-200 rounded-xl p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-[#8a9ab5] mb-1">Date</label>
                        <input type="date" value={callDate} onChange={e => setCallDate(e.target.value)}
                          className="w-full px-2.5 py-2 text-sm border border-[#242d40] rounded-lg bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8a9ab5] mb-1">Time</label>
                        <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)}
                          className="w-full px-2.5 py-2 text-sm border border-[#242d40] rounded-lg bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8a9ab5] mb-1">Outcome</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CALL_OUTCOMES.map(o => (
                          <button key={o.value} type="button" onClick={() => setCallOutcome(o.value)}
                            className={clsx(
                              'px-2.5 py-2 text-xs font-semibold rounded-lg border-2 transition-all',
                              callOutcome === o.value
                                ? o.value === 'scheduled'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : o.value === 'not_interested'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                    : 'border-sky-500 bg-sky-50 text-sky-700'
                                : 'border-[#242d40] text-[#4a5a75] hover:border-[#2e3a52]'
                            )}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {callOutcome === 'not_interested' && (
                      <div>
                        <label className="block text-xs font-medium text-[#8a9ab5] mb-1">Follow-up Date <span className="text-rose-500">*</span></label>
                        <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                          className="w-full px-2.5 py-2 text-sm border border-orange-200 rounded-lg bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all" />
                        <p className="text-[11px] text-orange-600 mt-1">Lead will move to the Follow Up pool on save.</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setShowCallForm(false)}
                        className="flex-1 py-2 text-xs font-semibold text-[#8a9ab5] bg-[#161b27] rounded-lg hover:bg-[#1e2535] transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleLogCall}
                        disabled={!callOutcome || updateLead.isPending || (callOutcome === 'not_interested' && !followUpDate)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors">
                        {updateLead.isPending ? <Loader2 size={12} className="animate-spin" /> : <><PhoneCall size={12} /> Save Log</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Move to Booked — only once a Scheduled outcome is logged */}
                {!showCallForm && !showScheduleForm && (
                  hasScheduledCall ? (
                    <button onClick={() => setShowScheduleForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 rounded-xl transition-all">
                      <CalendarClock size={15} /> Move to Booked / Scheduled →
                    </button>
                  ) : (
                    <p className="text-center text-xs text-[#3a4a62] py-1">
                      Log a call with outcome <span className="font-semibold text-emerald-600">Scheduled ✓</span> to proceed
                    </p>
                  )
                )}
              </div>
            )}

            {/* ── Next Step (contextual — Booked / PreQ Done) ── */}
            {nextStep && !showScheduleForm && (
              <div className="border border-amber-400/20 bg-amber-400/10/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Next Step</p>
                <p className="text-xs text-[#4a5a75] mb-3">{nextStep.description}</p>
                <button
                  onClick={nextStep.action}
                  disabled={updateLead.isPending}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r rounded-xl transition-all disabled:opacity-50',
                    nextStep.btnClass
                  )}
                >
                  {updateLead.isPending ? <Loader2 size={15} className="animate-spin" /> : nextStep.icon}
                  {nextStep.label}
                </button>
              </div>
            )}

            {/* ── Schedule / Book form ──────────────────── */}
            {showScheduleForm && (lead.status === 'called' || lead.status === 'new') && (
              <div className="border border-violet-200 bg-violet-50/40 rounded-xl p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-1">Schedule Consult</p>
                  <p className="text-xs text-[#4a5a75]">Set the date and time for this consult.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#8a9ab5] mb-1">Date</label>
                    <input
                      type="date"
                      value={consultDate}
                      onChange={e => setConsultDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-xl bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8a9ab5] mb-1">Time</label>
                    <input
                      type="time"
                      value={consultTime}
                      onChange={e => setConsultTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#242d40] rounded-xl bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-[#8a9ab5] mb-2">Added to calendar?</p>
                  <div className="flex gap-2">
                    {(['Yes', 'No'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCalendarBooked(opt === 'Yes')}
                        className={clsx(
                          'flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition-all',
                          calendarBooked === (opt === 'Yes')
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-[#242d40] text-[#3a4a62] hover:border-[#2e3a52]'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowScheduleForm(false)}
                    className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] border border-[#242d40] rounded-xl hover:bg-[#0d1117] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScheduleConsult}
                    disabled={updateLead.isPending || !consultDate || !consultTime}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all"
                  >
                    {updateLead.isPending
                      ? <Loader2 size={14} className="animate-spin" />
                      : <><CalendarClock size={14} /> Confirm Schedule</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ── Consult Outcome (after consult done) ── */}
            {lead.status === 'consult_completed' && (
              <div className="border border-[#242d40] rounded-xl p-4 bg-[#0d1117] space-y-3">
                <div>
                  <p className="text-xs font-semibold text-[#8a9ab5] uppercase tracking-wider mb-0.5">Consult Outcome</p>
                  <p className="text-xs text-[#4a5a75]">Did this lead convert?</p>
                </div>

                {/* Convert path */}
                {!showLostForm && (
                  showConvertConfirm ? (
                    <div className="flex gap-2">
                      <button onClick={() => setShowConvertConfirm(false)}
                        className="flex-1 py-2.5 text-xs font-semibold text-[#8a9ab5] bg-[#161b27] border border-[#242d40] rounded-xl hover:bg-[#161b27] transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleConvert} disabled={convertLead.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                        {convertLead.isPending ? <Loader2 size={12} className="animate-spin" /> : <><UserCheck size={12} /> Confirm Convert</>}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowConvertConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors">
                      <UserCheck size={15} /> Yes — Convert to Client
                    </button>
                  )
                )}

                {/* Not converted path */}
                {!showConvertConfirm && (
                  showLostForm ? (
                    <div className="space-y-2.5">
                      <select
                        value={lostReason}
                        onChange={e => setLostReason(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all"
                      >
                        <option value="">Select a reason…</option>
                        <option value="Price / budget concerns">Price / budget concerns</option>
                        <option value="Not ready to start">Not ready to start</option>
                        <option value="Chose another coach or gym">Chose another coach or gym</option>
                        <option value="Schedule / location conflict">Schedule / location conflict</option>
                        <option value="Lost interest">Lost interest</option>
                        <option value="No response after consult">No response after consult</option>
                        <option value="Health / medical reasons">Health / medical reasons</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => setShowLostForm(false)}
                          className="flex-1 py-2.5 text-xs font-semibold text-[#8a9ab5] bg-[#161b27] border border-[#242d40] rounded-xl hover:bg-[#161b27] transition-colors">
                          Back
                        </button>
                        <button
                          onClick={handleMarkLost}
                          disabled={updateLead.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
                          {updateLead.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirm — Mark Lost'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowLostForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-rose-600 bg-[#161b27] border border-rose-200 hover:bg-rose-400/10 rounded-xl transition-colors">
                      No — Not Converted
                    </button>
                  )
                )}
              </div>
            )}

            {lead.status === 'converted' && lead.converted_client_id && (
              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 flex items-center gap-3">
                <UserCheck size={18} className="text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800">Converted to Client</p>
                  <a href={`#/clients/${lead.converted_client_id}`} className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mt-0.5 transition-colors">
                    View client profile <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}

            {lead.status === 'lost' && (
              <div className="space-y-3">
                {lead.non_conversion_reason && (
                  <div className="border border-rose-200 rounded-xl p-4 bg-rose-50">
                    <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Not Converted</p>
                    <p className="text-sm text-rose-800">{lead.non_conversion_reason}</p>
                  </div>
                )}
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Reactivate Lead</p>
                  <p className="text-xs text-amber-600 mb-3">Move this lead back into the active pipeline.</p>
                  <button
                    onClick={() => updateLead.mutateAsync({ id: lead.id, status: 'new', non_conversion_reason: null })}
                    disabled={updateLead.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 transition-colors"
                  >
                    {updateLead.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Reactivate'}
                  </button>
                </div>
              </div>
            )}

            {lead.status === 'follow_up' && (
              <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">Follow Up Pool</p>
                  {lead.follow_up_date ? (
                    <p className="text-sm font-semibold text-orange-800">
                      Follow up: {new Date(lead.follow_up_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  ) : (
                    <p className="text-xs text-orange-600">No follow-up date set.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-[#8a9ab5] mb-1">Update Follow-up Date</label>
                    <input
                      type="date"
                      defaultValue={lead.follow_up_date ?? ''}
                      onChange={e => updateLead.mutate({ id: lead.id, follow_up_date: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-orange-200 rounded-xl bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={() => updateLead.mutateAsync({ id: lead.id, status: 'called', follow_up_date: null })}
                  disabled={updateLead.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 rounded-xl disabled:opacity-50 transition-all"
                >
                  {updateLead.isPending ? <Loader2 size={14} className="animate-spin" /> : <><PhoneCall size={14} /> Contact Now — Back to Pipeline</>}
                </button>
                <button
                  onClick={() => handleStatusChange('lost')}
                  disabled={updateLead.isPending}
                  className="w-full py-2 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-400/10 rounded-xl transition-colors disabled:opacity-50"
                >
                  Mark as Lost
                </button>
              </div>
            )}

            {/* ── Manual stage jump ────────────────────── */}
            {lead.status !== 'converted' && lead.status !== 'lost' && lead.status !== 'follow_up' && otherStages.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#3a4a62] uppercase tracking-wider mb-2">Jump to Stage</p>
                <div className="flex flex-wrap gap-2">
                  {otherStages.map(s => (
                    <button key={s.status} onClick={() => handleStatusChange(s.status)} disabled={updateLead.isPending}
                      className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all hover:shadow-sm disabled:opacity-50', s.color)}>
                      {s.label} <ArrowRight size={11} />
                    </button>
                  ))}
                </div>
                <button onClick={() => handleStatusChange('lost')} disabled={updateLead.isPending}
                  className="mt-2 text-xs text-rose-400 hover:text-rose-600 transition-colors disabled:opacity-50">
                  Mark as lost
                </button>
              </div>
            )}

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-[#4a5a75] uppercase tracking-wider mb-2">Notes</p>
              <textarea
                value={notes}
                onChange={e => { setNotes(e.target.value); setNotesTouched(true) }}
                rows={4}
                className="w-full px-3 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all resize-none"
                placeholder="Goals, context, follow-up reminders…"
              />
              <button onClick={handleSaveNotes} disabled={saving || !notesTouched}
                className="mt-2 w-full py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 transition-all">
                {saving ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          </div>

          {/* Delete */}
          <div className="p-5 border-t border-[#242d40]">
            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] rounded-xl hover:bg-[#1e2535] transition-colors">Cancel</button>
                <button onClick={handleDelete} disabled={deleteLead.isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
                  {deleteLead.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={14} /> Delete Lead</>}
                </button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-400/10 rounded-xl transition-colors">
                <Trash2 size={14} /> Delete Lead
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Questionnaire modal sits above the panel */}
      {questModal && (
        <QuestionnaireModal
          lead={lead}
          type={questModal}
          onClose={() => setQuestModal(null)}
          onComplete={() => setQuestModal(null)}
        />
      )}
    </>
  )
}

// ─── Lead card ────────────────────────────────────────────────
function LeadCard({ lead, onClick }: { lead: DbLead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#161b27] border border-[#242d40] rounded-xl p-4 hover:border-amber-400/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#e8edf5] truncate group-hover:text-amber-400 transition-colors">{lead.name}</p>
          {(lead.email || lead.phone) && (
            <p className="text-xs text-[#3a4a62] mt-0.5 truncate">
              {lead.email ?? lead.phone}
            </p>
          )}
          {lead.source && (
            <p className="text-xs text-[#3a4a62] mt-0.5">via {lead.source}</p>
          )}
          {lead.notes && (
            <p className="text-xs text-[#4a5a75] mt-1.5 line-clamp-2">{lead.notes}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-[#2e3a52] group-hover:text-amber-400 flex-shrink-0 mt-0.5 transition-colors" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={lead.status} />
        <span className="text-[11px] text-[#3a4a62]">
          {lead.status === 'follow_up' && lead.follow_up_date
            ? `Follow up ${new Date(lead.follow_up_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function Leads() {
  const { data: leads = [], isLoading } = useLeads()
  const [showAdd, setShowAdd]           = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [pool, setPool]                 = useState<'pipeline' | 'followup'>('pipeline')

  // Always read the live lead from the query so status updates reflect immediately
  const selected = selectedId ? (leads.find(l => l.id === selectedId) ?? null) : null
  const [activeStage, setActiveStage] = useState<LeadStatus | 'all'>('all')
  const [search, setSearch]           = useState('')

  // Separate follow-up leads from main pipeline
  const followUpLeads = leads
    .filter(l => l.status === 'follow_up')
    .sort((a, b) => {
      if (!a.follow_up_date) return 1
      if (!b.follow_up_date) return -1
      return a.follow_up_date.localeCompare(b.follow_up_date)
    })
  const pipelineLeads = leads.filter(l => l.status !== 'follow_up')

  const filtered = pool === 'followup'
    ? followUpLeads.filter(l => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return l.name.toLowerCase().includes(q) || (l.email ?? '').toLowerCase().includes(q) || (l.phone ?? '').toLowerCase().includes(q)
      })
    : pipelineLeads.filter(l => {
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

  // Pipeline-only stages for the stage filter tabs (exclude follow_up)
  const PIPELINE_STAGES = STAGES.filter(s => s.status !== 'follow_up')

  const activeLeads    = leads.filter(l => l.status !== 'converted' && l.status !== 'lost' && l.status !== 'follow_up')
  const convertedLeads = leads.filter(l => l.status === 'converted')

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b27] border-b border-[#242d40] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#e8edf5]">
              {pool === 'followup' ? 'Follow Up Pool' : 'Lead Pipeline'}
            </h1>
            <p className="text-sm text-[#4a5a75] mt-0.5">
              {pool === 'followup'
                ? `${followUpLeads.length} lead${followUpLeads.length !== 1 ? 's' : ''} awaiting follow up`
                : `${activeLeads.length} active · ${convertedLeads.length} converted`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              title="Setup questionnaire templates"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] hover:bg-[#1e2535] rounded-xl transition-colors"
            >
              <Settings2 size={15} /> Templates
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#8a9ab5] bg-[#161b27] hover:bg-[#1e2535] rounded-xl transition-colors"
            >
              <Upload size={15} /> Import
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-300 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} /> Add Lead
            </button>
          </div>
        </div>

        {/* Pool toggle */}
        <div className="flex items-center gap-1.5 mb-3">
          <button
            onClick={() => setPool('pipeline')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              pool === 'pipeline' ? 'bg-[#0d1117] text-white' : 'bg-[#161b27] text-[#4a5a75] hover:bg-[#1e2535]'
            )}
          >
            Pipeline
            <span className="opacity-60">{pipelineLeads.length}</span>
          </button>
          <button
            onClick={() => setPool('followup')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              pool === 'followup' ? 'bg-orange-500 text-white' : 'bg-[#161b27] text-[#4a5a75] hover:bg-[#1e2535]'
            )}
          >
            <span className={clsx('w-1.5 h-1.5 rounded-full', pool === 'followup' ? 'bg-[#161b27]/70' : 'bg-orange-400')} />
            Follow Up
            {followUpLeads.length > 0 && (
              <span className={clsx('opacity-80', pool !== 'followup' && 'text-orange-600')}>{followUpLeads.length}</span>
            )}
          </button>
        </div>

        {/* Stage filter tabs — pipeline only */}
        {pool === 'pipeline' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveStage('all')}
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeStage === 'all'
                  ? 'bg-[#0d1117] text-white'
                  : 'bg-[#161b27] text-[#4a5a75] hover:bg-[#1e2535]'
              )}
            >
              All <span className="ml-1 opacity-60">{pipelineLeads.length}</span>
            </button>
            {PIPELINE_STAGES.map(s => (
              <button
                key={s.status}
                onClick={() => setActiveStage(s.status)}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  activeStage === s.status
                    ? 'bg-[#0d1117] text-white'
                    : 'bg-[#161b27] text-[#4a5a75] hover:bg-[#1e2535]'
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
        )}
      </div>

      {/* Search */}
      <div className="px-6 py-3 bg-[#161b27] border-b border-[#242d40]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a4a62]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads by name, email, or phone…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#0d1117] border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-amber-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[#161b27] rounded-2xl flex items-center justify-center mb-4">
              <UserCheck size={24} className="text-[#3a4a62]" />
            </div>
            <p className="text-base font-semibold text-[#8a9ab5]">
              {pool === 'followup'
                ? 'No follow-up leads'
                : leads.length === 0 ? 'No leads yet' : 'No leads match your filter'}
            </p>
            <p className="text-sm text-[#3a4a62] mt-1 max-w-xs">
              {pool === 'followup'
                ? 'When a lead says "Not Interested" on a call, they\'ll appear here with a follow-up date.'
                : leads.length === 0
                  ? 'Add your first prospect to start tracking your pipeline.'
                  : 'Try a different stage filter or search term.'}
            </p>
            {leads.length === 0 && pool === 'pipeline' && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-300 text-white text-sm font-semibold rounded-xl hover:from-amber-400 hover:to-amber-300 transition-all"
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
                onClick={() => setSelectedId(lead.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pipeline summary bar */}
      {leads.length > 0 && pool === 'pipeline' && (
        <div className="bg-[#161b27] border-t border-[#242d40] px-6 py-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {PIPELINE_STAGES.filter(s => s.status !== 'lost').map((s, i) => {
              const count = counts[s.status]
              const isLast = i === PIPELINE_STAGES.filter(s => s.status !== 'lost').length - 1
              return (
                <div key={s.status} className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('w-2 h-2 rounded-full', s.dot)} />
                    <span className="text-xs text-[#4a5a75]">{s.label}</span>
                    <span className="text-xs font-bold text-[#8a9ab5]">{count}</span>
                  </div>
                  {!isLast && <ChevronRight size={12} className="text-[#2e3a52] mx-1" />}
                </div>
              )
            })}
            {counts['lost'] > 0 && (
              <>
                <span className="text-[#8a9ab5] mx-2">·</span>
                <span className="text-xs text-rose-400">{counts['lost']} lost</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd        && <AddLeadModal onClose={() => setShowAdd(false)} />}
      {showTemplates  && <SetupTemplatesModal onClose={() => setShowTemplates(false)} />}
      {showBulkImport && <BulkImportModal onClose={() => setShowBulkImport(false)} />}
      {selected && (
        <LeadPanel
          lead={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
