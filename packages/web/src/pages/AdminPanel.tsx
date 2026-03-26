import { useState, useEffect } from 'react'
import {
  ShieldCheck, Dumbbell, BarChart2, Heart, Plus, Trash2,
  Pencil, X, Check, Loader2, LogOut, ChevronDown, Database,
  Users, RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  DbGlobalTemplateExercise,
  DbGlobalTemplateMetric,
  DbGlobalTemplateHabit,
} from '@/lib/database.types'

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
