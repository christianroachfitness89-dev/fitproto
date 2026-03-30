import { useState, useEffect, useRef } from 'react'
import {
  ShieldCheck, Dumbbell, BarChart2, Heart, Plus, Trash2,
  Pencil, Check, Loader2, LogOut, Database,
  Users, RefreshCw, Upload, Download, AlertCircle, X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  DbGlobalTemplateExercise,
  DbGlobalTemplateMetric,
  DbGlobalTemplateHabit,
} from '@/lib/database.types'

// ─── Excel helpers ─────────────────────────────────────────────
function downloadTemplate(
  filename: string,
  headers: string[],
  example: Record<string, string>,
) {
  const ws = XLSX.utils.json_to_sheet([example], { header: headers })
  // Style header row width
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Templates')
  XLSX.writeFile(wb, filename)
}

function parseUploadedFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── Bulk Upload component ─────────────────────────────────────
interface BulkUploadProps {
  templateFilename: string
  templateHeaders: string[]
  templateExample: Record<string, string>
  validateRow:  (row: Record<string, string>) => string | null   // returns error or null
  insertRows:   (rows: Record<string, string>[]) => Promise<void>
  onDone:       () => void
}

function BulkUpload({
  templateFilename, templateHeaders, templateExample,
  validateRow, insertRows, onDone,
}: BulkUploadProps) {
  const inputRef                = useRef<HTMLInputElement>(null)
  const [rows,    setRows]      = useState<Record<string, string>[] | null>(null)
  const [errors,  setErrors]    = useState<string[]>([])
  const [loading, setLoading]   = useState(false)
  const [done,    setDone]      = useState(false)

  async function handleFile(file: File) {
    try {
      const parsed = await parseUploadedFile(file)
      const errs: string[] = []
      parsed.forEach((row, i) => {
        const err = validateRow(row)
        if (err) errs.push(`Row ${i + 2}: ${err}`)
      })
      setErrors(errs)
      setRows(parsed)
      setDone(false)
    } catch {
      setErrors(['Could not read file. Make sure it is a valid .xlsx or .csv file.'])
    }
  }

  async function handleImport() {
    if (!rows?.length) return
    setLoading(true)
    try {
      await insertRows(rows)
      setDone(true)
      setRows(null)
      onDone()
    } catch (e: any) {
      setErrors([e?.message ?? 'Import failed'])
    }
    setLoading(false)
  }

  const validRows   = rows?.filter(r => !validateRow(r)) ?? []
  const invalidRows = rows?.filter(r => validateRow(r))  ?? []

  return (
    <div className="space-y-3">
      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => downloadTemplate(templateFilename, templateHeaders, templateExample)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm transition-colors"
        >
          <Download size={14} /> Download Template
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
        >
          <Upload size={14} /> Upload Excel / CSV
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
      </div>

      {/* Preview */}
      {rows && rows.length > 0 && (
        <div className="bg-white/4 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-3">
            <p className="text-white/70 text-sm flex-1">
              <span className="text-white font-semibold">{rows.length}</span> rows found
              {invalidRows.length > 0 && (
                <span className="text-amber-400 ml-2">· {invalidRows.length} will be skipped (errors below)</span>
              )}
            </p>
            {validRows.length > 0 && (
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Import {validRows.length} rows
              </button>
            )}
            <button onClick={() => { setRows(null); setErrors([]) }} className="p-1 text-white/30 hover:text-white/60">
              <X size={15} />
            </button>
          </div>
          {/* First 5 rows preview */}
          <div className="divide-y divide-white/5">
            {rows.slice(0, 5).map((row, i) => {
              const err = validateRow(row)
              return (
                <div key={i} className={`px-4 py-2 flex items-center gap-3 text-xs ${err ? 'opacity-50' : ''}`}>
                  {err
                    ? <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />
                    : <Check size={13} className="text-emerald-400 flex-shrink-0" />
                  }
                  <span className="text-white/70 truncate">
                    {templateHeaders.map(h => row[h]).filter(Boolean).slice(0, 3).join(' · ')}
                  </span>
                  {err && <span className="text-amber-400/70 ml-auto flex-shrink-0">{err}</span>}
                </div>
              )
            })}
            {rows.length > 5 && (
              <div className="px-4 py-2 text-xs text-white/30">
                + {rows.length - 5} more rows...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-rose-400 text-xs">{e}</p>
          ))}
        </div>
      )}

      {done && (
        <p className="text-emerald-400 text-sm flex items-center gap-1.5">
          <Check size={14} /> Import complete!
        </p>
      )}
    </div>
  )
}

type AdminTab = 'exercises' | 'metrics' | 'habits' | 'orgs'

// ─── Exercise template form ────────────────────────────────────
const METRIC_TYPES = ['reps_weight', 'reps', 'time', 'distance'] as const
const CATEGORIES   = ['Strength', 'Cardio', 'Flexibility', 'Balance', 'Power', 'Plyometric', 'Functional']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

function ExerciseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<DbGlobalTemplateExercise>
  onSave: (data: Omit<DbGlobalTemplateExercise, 'id' | 'created_at'>) => Promise<void>
  onCancel: () => void
}) {
  const [name,        setName]        = useState(initial?.name        ?? '')
  const [category,    setCategory]    = useState(initial?.category    ?? '')
  const [muscleGroup, setMuscleGroup] = useState(initial?.muscle_group ?? '')
  const [equipment,   setEquipment]   = useState(initial?.equipment   ?? '')
  const [metricType,  setMetricType]  = useState<typeof METRIC_TYPES[number]>(
    (initial?.metric_type as any) ?? 'reps_weight'
  )
  const [difficulty,  setDifficulty]  = useState(initial?.difficulty  ?? '')
  const [instructions,setInstructions]= useState(initial?.instructions ?? '')
  const [saving,      setSaving]      = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name:             name.trim(),
      category:         category    || null,
      muscle_group:     muscleGroup || null,
      equipment:        equipment   || null,
      metric_type:      metricType,
      difficulty:       difficulty  || null,
      instructions:     instructions || null,
      secondary_muscle: null,
      movement_pattern: null,
      body_region:      null,
      mechanics:        null,
    })
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-white/50 mb-1 block">Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="e.g. Barbell Squat"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60"
          >
            <option value="">—</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Muscle Group</label>
          <input
            value={muscleGroup}
            onChange={e => setMuscleGroup(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="e.g. Quads"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Equipment</label>
          <input
            value={equipment}
            onChange={e => setEquipment(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="e.g. Barbell"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Metric Type</label>
          <select
            value={metricType}
            onChange={e => setMetricType(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60"
          >
            {METRIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Difficulty</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60"
          >
            <option value="">—</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-white/50 mb-1 block">Instructions</label>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 resize-none"
            placeholder="Step-by-step instructions..."
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Metric template form ──────────────────────────────────────
const METRIC_CATEGORIES = ['body_composition', 'performance', 'wellness', 'measurements', 'custom'] as const

function MetricForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<DbGlobalTemplateMetric>
  onSave: (data: Omit<DbGlobalTemplateMetric, 'id' | 'created_at'>) => Promise<void>
  onCancel: () => void
}) {
  const [name,     setName]     = useState(initial?.name     ?? '')
  const [unit,     setUnit]     = useState(initial?.unit     ?? '')
  const [emoji,    setEmoji]    = useState(initial?.emoji    ?? '📊')
  const [category, setCategory] = useState<typeof METRIC_CATEGORIES[number]>(
    (initial?.category as any) ?? 'custom'
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), unit, emoji, category })
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-white/50 mb-1 block">Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="e.g. Body Weight"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Unit</label>
          <input
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="e.g. kg"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Emoji</label>
          <input
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="📊"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-white/50 mb-1 block">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60"
          >
            {METRIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Habit template form ───────────────────────────────────────
const HABIT_FREQUENCIES = ['daily', 'weekdays', 'weekends', 'weekly'] as const

function HabitForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<DbGlobalTemplateHabit>
  onSave: (data: Omit<DbGlobalTemplateHabit, 'id' | 'created_at'>) => Promise<void>
  onCancel: () => void
}) {
  const [name,        setName]        = useState(initial?.name        ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [emoji,       setEmoji]       = useState(initial?.emoji       ?? '✅')
  const [frequency,   setFrequency]   = useState<typeof HABIT_FREQUENCIES[number]>(
    (initial?.frequency as any) ?? 'daily'
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), description: description || null, emoji, frequency })
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="e.g. Drink 2L Water"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Emoji</label>
          <input
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="✅"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-white/50 mb-1 block">Description</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60"
            placeholder="Optional description..."
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-white/50 mb-1 block">Frequency</label>
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60"
          >
            {HABIT_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Exercises tab ─────────────────────────────────────────────
function ExercisesTab() {
  const [items,    setItems]    = useState<DbGlobalTemplateExercise[]>([])
  const [loading,  setLoading]  = useState(true)
  const [adding,   setAdding]   = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('global_template_exercises')
      .select('*')
      .order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(data: Omit<DbGlobalTemplateExercise, 'id' | 'created_at'>) {
    await supabase.from('global_template_exercises').insert(data as any)
    setAdding(false)
    load()
  }

  async function handleUpdate(id: string, data: Omit<DbGlobalTemplateExercise, 'id' | 'created_at'>) {
    await supabase.from('global_template_exercises').update(data as any).eq('id', id)
    setEditId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this exercise template?')) return
    await supabase.from('global_template_exercises').delete().eq('id', id)
    load()
  }

  const EXERCISE_HEADERS = ['name','category','muscle_group','equipment','metric_type','difficulty','instructions']
  const EXERCISE_EXAMPLE = {
    name: 'Barbell Squat', category: 'Strength', muscle_group: 'Quads',
    equipment: 'Barbell', metric_type: 'reps_weight', difficulty: 'intermediate',
    instructions: 'Stand with feet shoulder-width apart...',
  }

  async function bulkInsertExercises(rows: Record<string, string>[]) {
    const valid = rows
      .filter(r => r.name?.trim())
      .map(r => ({
        name:             r.name.trim(),
        category:         r.category         || null,
        muscle_group:     r.muscle_group     || null,
        equipment:        r.equipment        || null,
        metric_type:      METRIC_TYPES.includes(r.metric_type as any) ? r.metric_type : 'reps_weight',
        difficulty:       r.difficulty       || null,
        instructions:     r.instructions     || null,
        secondary_muscle: null,
        movement_pattern: null,
        body_region:      null,
        mechanics:        null,
      }))
    if (valid.length) await supabase
      .from('global_template_exercises')
      .upsert(valid as any, { onConflict: 'name', ignoreDuplicates: false })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{items.length} templates</p>
        <button
          onClick={() => { setAdding(true); setEditId(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} /> Add Exercise
        </button>
      </div>

      {/* Bulk upload */}
      <BulkUpload
        templateFilename="exercise_templates.xlsx"
        templateHeaders={EXERCISE_HEADERS}
        templateExample={EXERCISE_EXAMPLE}
        validateRow={r => r.name?.trim() ? null : 'name is required'}
        insertRows={bulkInsertExercises}
        onDone={load}
      />

      {adding && (
        <div className="bg-white/5 border border-violet-500/30 rounded-2xl p-4">
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">New Exercise Template</p>
          <ExerciseForm onSave={handleCreate} onCancel={() => setAdding(false)} />
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-white/30" /></div>
      ) : items.length === 0 && !adding ? (
        <div className="py-12 text-center text-white/30 text-sm">No exercise templates yet. Add one above.</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
              {editId === item.id ? (
                <div className="p-4">
                  <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">Editing</p>
                  <ExerciseForm
                    initial={item}
                    onSave={data => handleUpdate(item.id, data)}
                    onCancel={() => setEditId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-white/35 text-xs">
                      {[item.category, item.muscle_group, item.metric_type].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditId(item.id); setAdding(false) }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Metrics tab ───────────────────────────────────────────────
function MetricsTab() {
  const [items,   setItems]   = useState<DbGlobalTemplateMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('global_template_metric_definitions')
      .select('*')
      .order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(data: Omit<DbGlobalTemplateMetric, 'id' | 'created_at'>) {
    await supabase.from('global_template_metric_definitions').insert(data as any)
    setAdding(false)
    load()
  }

  async function handleUpdate(id: string, data: Omit<DbGlobalTemplateMetric, 'id' | 'created_at'>) {
    await supabase.from('global_template_metric_definitions').update(data as any).eq('id', id)
    setEditId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this metric template?')) return
    await supabase.from('global_template_metric_definitions').delete().eq('id', id)
    load()
  }

  const METRIC_HEADERS = ['name','unit','emoji','category']
  const METRIC_EXAMPLE = { name: 'Body Weight', unit: 'kg', emoji: '⚖️', category: 'body_composition' }

  async function bulkInsertMetrics(rows: Record<string, string>[]) {
    const valid = rows
      .filter(r => r.name?.trim())
      .map(r => ({
        name:     r.name.trim(),
        unit:     r.unit     || '',
        emoji:    r.emoji    || '📊',
        category: METRIC_CATEGORIES.includes(r.category as any) ? r.category : 'custom',
      }))
    if (valid.length) await supabase.from('global_template_metric_definitions').insert(valid as any)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{items.length} templates</p>
        <button
          onClick={() => { setAdding(true); setEditId(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} /> Add Metric
        </button>
      </div>

      {/* Bulk upload */}
      <BulkUpload
        templateFilename="metric_templates.xlsx"
        templateHeaders={METRIC_HEADERS}
        templateExample={METRIC_EXAMPLE}
        validateRow={r => r.name?.trim() ? null : 'name is required'}
        insertRows={bulkInsertMetrics}
        onDone={load}
      />

      {adding && (
        <div className="bg-white/5 border border-violet-500/30 rounded-2xl p-4">
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">New Metric Template</p>
          <MetricForm onSave={handleCreate} onCancel={() => setAdding(false)} />
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-white/30" /></div>
      ) : items.length === 0 && !adding ? (
        <div className="py-12 text-center text-white/30 text-sm">No metric templates yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
              {editId === item.id ? (
                <div className="p-4">
                  <MetricForm
                    initial={item}
                    onSave={data => handleUpdate(item.id, data)}
                    onCancel={() => setEditId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-white/35 text-xs">{item.unit ? `${item.unit} · ` : ''}{item.category}</p>
                  </div>
                  <button
                    onClick={() => { setEditId(item.id); setAdding(false) }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Habits tab ────────────────────────────────────────────────
function HabitsTab() {
  const [items,   setItems]   = useState<DbGlobalTemplateHabit[]>([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('global_template_habits')
      .select('*')
      .order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(data: Omit<DbGlobalTemplateHabit, 'id' | 'created_at'>) {
    await supabase.from('global_template_habits').insert(data as any)
    setAdding(false)
    load()
  }

  async function handleUpdate(id: string, data: Omit<DbGlobalTemplateHabit, 'id' | 'created_at'>) {
    await supabase.from('global_template_habits').update(data as any).eq('id', id)
    setEditId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this habit template?')) return
    await supabase.from('global_template_habits').delete().eq('id', id)
    load()
  }

  const HABIT_HEADERS = ['name','description','emoji','frequency']
  const HABIT_EXAMPLE = { name: 'Drink 2L Water', description: 'Stay hydrated throughout the day', emoji: '💧', frequency: 'daily' }

  async function bulkInsertHabits(rows: Record<string, string>[]) {
    const valid = rows
      .filter(r => r.name?.trim())
      .map(r => ({
        name:        r.name.trim(),
        description: r.description || null,
        emoji:       r.emoji       || '✅',
        frequency:   HABIT_FREQUENCIES.includes(r.frequency as any) ? r.frequency : 'daily',
      }))
    if (valid.length) await supabase.from('global_template_habits').insert(valid as any)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{items.length} templates</p>
        <button
          onClick={() => { setAdding(true); setEditId(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} /> Add Habit
        </button>
      </div>

      {/* Bulk upload */}
      <BulkUpload
        templateFilename="habit_templates.xlsx"
        templateHeaders={HABIT_HEADERS}
        templateExample={HABIT_EXAMPLE}
        validateRow={r => r.name?.trim() ? null : 'name is required'}
        insertRows={bulkInsertHabits}
        onDone={load}
      />

      {adding && (
        <div className="bg-white/5 border border-violet-500/30 rounded-2xl p-4">
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">New Habit Template</p>
          <HabitForm onSave={handleCreate} onCancel={() => setAdding(false)} />
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-white/30" /></div>
      ) : items.length === 0 && !adding ? (
        <div className="py-12 text-center text-white/30 text-sm">No habit templates yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
              {editId === item.id ? (
                <div className="p-4">
                  <HabitForm
                    initial={item}
                    onSave={data => handleUpdate(item.id, data)}
                    onCancel={() => setEditId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-white/35 text-xs">{item.frequency}{item.description ? ` · ${item.description}` : ''}</p>
                  </div>
                  <button
                    onClick={() => { setEditId(item.id); setAdding(false) }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Orgs tab (seed management) ────────────────────────────────
interface OrgRow { id: string; name: string; owner_id: string; created_at: string }

function OrgsTab() {
  const [orgs,    setOrgs]    = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState<string | null>(null)
  const [done,    setDone]    = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)
    const { data } = await supabase.rpc('admin_list_orgs')
    setOrgs((data as OrgRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function seedOrg(orgId: string) {
    setSeeding(orgId)
    await supabase.rpc('admin_seed_org', { p_org_id: orgId })
    setSeeding(null)
    setDone(prev => new Set([...prev, orgId]))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{orgs.length} organisations</p>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <div className="bg-white/4 border border-amber-500/20 rounded-2xl px-4 py-3 text-amber-400/80 text-xs">
        Seeding copies all current global templates into the org. Existing template rows are not duplicated — only run on orgs that are missing templates.
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-white/30" /></div>
      ) : (
        <div className="space-y-2">
          {orgs.map(org => (
            <div key={org.id} className="flex items-center gap-3 px-4 py-3 bg-white/4 border border-white/8 rounded-2xl">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{org.name}</p>
                <p className="text-white/30 text-xs">{new Date(org.created_at).toLocaleDateString()}</p>
              </div>
              {done.has(org.id) ? (
                <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                  <Check size={13} /> Seeded
                </span>
              ) : (
                <button
                  onClick={() => seedOrg(org.id)}
                  disabled={seeding === org.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {seeding === org.id ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                  Seed Templates
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main AdminPanel ───────────────────────────────────────────
const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'exercises', label: 'Exercises', icon: <Dumbbell size={16} /> },
  { key: 'metrics',   label: 'Metrics',   icon: <BarChart2 size={16} /> },
  { key: 'habits',    label: 'Habits',    icon: <Heart size={16} />     },
  { key: 'orgs',      label: 'Orgs',      icon: <Users size={16} />     },
]

export default function AdminPanel() {
  const { signOut } = useAuth()
  const [tab, setTab] = useState<AdminTab>('exercises')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="border-b border-white/8 px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">FitProto Admin</p>
            <p className="text-white/30 text-xs">Developer Console</p>
          </div>
        </div>
        <div className="flex-1" />
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 text-sm transition-colors"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/4 rounded-2xl p-1 mb-8">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'exercises' && <ExercisesTab />}
        {tab === 'metrics'   && <MetricsTab />}
        {tab === 'habits'    && <HabitsTab />}
        {tab === 'orgs'      && <OrgsTab />}
      </div>
    </div>
  )
}
