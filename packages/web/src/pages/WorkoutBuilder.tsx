import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Search, X, Loader2, Dumbbell, Clock, TrendingUp,
  ChevronDown as Expand, LayoutList, ChevronRight, SlidersHorizontal,
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import {
  useWorkoutDetail, useUpdateWorkout, useCreateWorkout,
  useAddWorkoutExercise, useUpdateWorkoutExercise, useRemoveWorkoutExercise,
  useAddWorkoutSet, useUpdateWorkoutSet, useRemoveWorkoutSet,
  useExercises, usePrograms, useCreateProgram,
  type WorkoutExerciseWithSets,
} from '@/hooks/useWorkouts'
import type { DbWorkoutSet, ExerciseMetricType, ProgressionType, Difficulty } from '@/lib/database.types'
import { weightLabel, useUnitSystem, type UnitSystem } from '@/lib/units'

// ─── Helpers ──────────────────────────────────────────────────
function buildMetricLabels(unit: UnitSystem): Record<ExerciseMetricType, { icon: string; label: string; cols: string[] }> {
  const wt = weightLabel(unit)
  return {
    reps_weight:  { icon: '🏋️', label: 'Reps + Weight', cols: ['Set', 'Reps', `Weight (${wt})`, 'Rest (s)'] },
    reps:         { icon: '🔄', label: 'Reps only',     cols: ['Set', 'Reps', 'Rest (s)'] },
    time:         { icon: '⏱️', label: 'Timed',          cols: ['Set', 'Duration (s)', 'Rest (s)'] },
    distance:     { icon: '📏', label: 'Distance',       cols: ['Set', 'Distance (m)', 'Rest (s)'] },
  }
}

const PROGRESSION_LABELS: Record<ProgressionType, string> = {
  none:                 'No progression',
  linear:               'Linear (add fixed amount)',
  percentage:           'Percentage increase',
  double_progression:   'Double progression (reps → weight)',
}

function buildProgressionUnit(unit: UnitSystem): Record<ProgressionType, Record<ExerciseMetricType, string>> {
  const wt = weightLabel(unit)
  return {
    none:               { reps_weight: '', reps: '', time: '', distance: '' },
    linear:             { reps_weight: `${wt}/session`, reps: 'reps/session', time: 'sec/session', distance: 'm/session' },
    percentage:         { reps_weight: '% / session', reps: '% / session', time: '% / session', distance: '% / session' },
    double_progression: { reps_weight: `Add ${wt} once all sets hit top rep`, reps: 'n/a', time: 'n/a', distance: 'n/a' },
  }
}

function progressionHint(pt: ProgressionType, pv: number | null, metric: ExerciseMetricType, unit: UnitSystem): string {
  if (pt === 'none' || !pv) return ''
  const unitMap = buildProgressionUnit(unit)
  const u = unitMap[pt][metric]
  if (pt === 'linear') return `+${pv} ${u}`
  if (pt === 'percentage') return `+${pv}% each session`
  if (pt === 'double_progression') return `Add ${pv} ${weightLabel(unit)} once all sets hit max reps`
  return ''
}

// ─── New workout creation screen ──────────────────────────────
function NewWorkoutScreen() {
  const navigate = useNavigate()
  const createWorkout = useCreateWorkout()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Workout name is required'); return }
    setError(null)
    const workout = await createWorkout.mutateAsync({
      name: name.trim(),
      category: category || null,
      difficulty: (difficulty as Difficulty) || null,
      description: null,
      duration_minutes: null,
    })
    navigate(`/library/workouts/${workout.id}`, { replace: true })
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate('/library/workouts')}
        className="flex items-center gap-2 text-sm text-[#4a5a75] hover:text-[#e8edf5] mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Workouts
      </button>

      <div className="bg-[#161b27] rounded-2xl border border-[#242d40] shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
            <Dumbbell size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e8edf5]">New Workout</h1>
            <p className="text-sm text-[#3a4a62]">Name it, then build it exercise by exercise</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8a9ab5] uppercase tracking-wide mb-1.5">
              Workout Name *
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Upper Body Strength A"
              className="w-full px-4 py-3 text-base border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] uppercase tracking-wide mb-1.5">Category</label>
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Strength, Cardio…"
                className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8a9ab5] uppercase tracking-wide mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as Difficulty | '')}
                className="w-full px-3.5 py-2.5 text-sm border border-[#242d40] rounded-xl bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
              >
                <option value="">—</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={createWorkout.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 transition-all shadow-sm shadow-amber-400/20 mt-2"
          >
            {createWorkout.isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <><Plus size={16} /> Create & Start Building</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Add to Program panel ─────────────────────────────────────
function AddToProgramPanel({ workoutId }: { workoutId: string }) {
  const navigate = useNavigate()
  const { data: programs = [], isLoading } = usePrograms()
  const createProgram = useCreateProgram()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleNewProgram() {
    setCreating(true)
    try {
      const program = await createProgram.mutateAsync({
        name: 'New Program',
        description: null,
        difficulty: null,
        category: null,
        duration_weeks: 4,
        assigned_coach_id: null,
      } as any)
      navigate(`/library/programs/${program.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all',
          open
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-[#161b27] border-[#242d40] text-[#8a9ab5] hover:bg-[#0d1117]',
        )}
      >
        <LayoutList size={15} />
        Add to Program
        <ChevronRight size={14} className={clsx('transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#161b27] rounded-2xl shadow-xl border border-[#242d40] z-20 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#242d40] bg-[#0d1117]/60">
            <p className="text-xs font-semibold text-[#4a5a75] uppercase tracking-wide">Add to a Program</p>
            <p className="text-xs text-[#3a4a62] mt-0.5">Select a program to add this workout to it</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-[#2e3a52]" />
              </div>
            ) : programs.length === 0 ? (
              <p className="text-sm text-[#3a4a62] text-center py-6">No programs yet</p>
            ) : (
              programs.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/library/programs/${p.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-400/10 transition-colors border-b border-[#1e2535] last:border-0 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <LayoutList size={14} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#e8edf5] truncate group-hover:text-amber-400">{p.name}</p>
                    {p.duration_weeks && (
                      <p className="text-xs text-[#3a4a62]">{p.duration_weeks} weeks</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-[#2e3a52] group-hover:text-amber-400 flex-shrink-0" />
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t border-[#242d40]">
            <button
              onClick={handleNewProgram}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-violet-700 bg-violet-50 rounded-xl hover:bg-violet-100 disabled:opacity-60 transition-colors"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create New Program
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Exercise picker modal ────────────────────────────────────
function ExercisePicker({
  onPick, onClose,
}: {
  onPick: (ex: { id: string; name: string }) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [catFilters, setCatFilters] = useState<string[]>([])
  const [musFilters, setMusFilters] = useState<string[]>([])
  const [eqpFilters, setEqpFilters] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: allExercises = [], isLoading } = useExercises(search || undefined)
  const unit = useUnitSystem()
  const metricLabels = buildMetricLabels(unit)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Derive unique filter options from full list
  const categories   = [...new Set(allExercises.map(e => e.category).filter(Boolean) as string[])].sort()
  const muscleGroups = [...new Set(allExercises.map(e => e.muscle_group).filter(Boolean) as string[])].sort()
  const equipments   = [...new Set(allExercises.map(e => e.equipment).filter(Boolean) as string[])].sort()

  // Apply active filters
  const exercises = allExercises.filter(ex => {
    if (catFilters.length && !catFilters.includes(ex.category ?? '')) return false
    if (musFilters.length && !musFilters.includes(ex.muscle_group ?? '')) return false
    if (eqpFilters.length && !eqpFilters.includes(ex.equipment ?? '')) return false
    return true
  })

  const activeFilterCount = catFilters.length + musFilters.length + eqpFilters.length

  function clearFilters() {
    setCatFilters([]); setMusFilters([]); setEqpFilters([])
  }

  function toggleFilter(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
  }

  // Group by category when no search active and no category filter
  const grouped = !search && catFilters.length === 0
    ? exercises.reduce<Record<string, typeof exercises>>((acc, ex) => {
        const cat = ex.category || 'Other'
        ;(acc[cat] ||= []).push(ex)
        return acc
      }, {})
    : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-[#161b27] shadow-2xl flex flex-col">

        {/* Search + close */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-[#242d40] flex-shrink-0">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a4a62] pointer-events-none" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-[#242d40] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2e3a52] hover:text-[#4a5a75]">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all flex-shrink-0',
              showFilters || activeFilterCount > 0
                ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
                : 'bg-[#161b27] border-[#242d40] text-[#4a5a75] hover:bg-[#0d1117]',
            )}
          >
            <SlidersHorizontal size={15} />
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white text-[10px] font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button onClick={onClose} className="p-2 rounded-xl text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27] flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-4 py-3 border-b border-[#242d40] bg-[#0d1117] flex-shrink-0 space-y-3">
            <PickerFilterGroup label="Category" options={categories} selected={catFilters}
              onToggle={v => toggleFilter(catFilters, setCatFilters, v)} />
            <PickerFilterGroup label="Muscle Group" options={muscleGroups} selected={musFilters}
              onToggle={v => toggleFilter(musFilters, setMusFilters, v)} />
            <PickerFilterGroup label="Equipment" options={equipments} selected={eqpFilters}
              onToggle={v => toggleFilter(eqpFilters, setEqpFilters, v)} />
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-amber-400 hover:text-amber-400 font-medium">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Count row */}
        <div className="px-4 py-2 border-b border-[#1e2535] flex-shrink-0">
          <p className="text-xs text-[#3a4a62]">
            {isLoading ? 'Loading…' : `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}${activeFilterCount > 0 ? ' (filtered)' : ''}`}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-[#2e3a52]" /></div>
          ) : exercises.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#3a4a62] mb-2">No exercises match</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-amber-400 hover:underline">Clear filters</button>
              )}
            </div>
          ) : grouped ? (
            Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, exs]) => (
              <div key={cat}>
                <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#3a4a62] bg-[#0d1117] sticky top-0">
                  {cat}
                </p>
                {exs.map(ex => (
                  <ExercisePickerRow key={ex.id} ex={ex} icon={metricLabels[ex.metric_type]?.icon ?? '🏋️'}
                    subtitle={[ex.muscle_group, metricLabels[ex.metric_type]?.label].filter(Boolean).join(' · ')}
                    onPick={() => { onPick({ id: ex.id, name: ex.name }); onClose() }} />
                ))}
              </div>
            ))
          ) : (
            exercises.map(ex => (
              <ExercisePickerRow key={ex.id} ex={ex} icon={metricLabels[ex.metric_type]?.icon ?? '🏋️'}
                subtitle={[ex.muscle_group, ex.category, metricLabels[ex.metric_type]?.label].filter(Boolean).join(' · ')}
                onPick={() => { onPick({ id: ex.id, name: ex.name }); onClose() }} />
            ))
          )}
        </div>
      </div>
    </>
  )
}

function PickerFilterGroup({
  label, options, selected, onToggle,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  if (options.length === 0) return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a4a62] mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
              selected.includes(opt)
                ? 'bg-amber-400 border-amber-400 text-white'
                : 'bg-[#161b27] border-[#242d40] text-[#8a9ab5] hover:border-amber-400/30 hover:text-amber-400',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function ExercisePickerRow({
  ex, icon, subtitle, onPick,
}: {
  ex: { id: string; name: string }
  icon: string
  subtitle: string
  onPick: () => void
}) {
  return (
    <button
      onClick={onPick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-400/10 active:bg-amber-400/10 transition-colors border-b border-[#1e2535] last:border-0"
    >
      <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0 text-base">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#e8edf5] truncate">{ex.name}</p>
        {subtitle && <p className="text-xs text-[#3a4a62] truncate">{subtitle}</p>}
      </div>
    </button>
  )
}

// ─── Set row ──────────────────────────────────────────────────
function SetRow({
  set, metric, onUpdate, onRemove, isOnly,
}: {
  set: DbWorkoutSet
  metric: ExerciseMetricType
  onUpdate: (patch: Partial<DbWorkoutSet>) => void
  onRemove: () => void
  isOnly: boolean
}) {
  function numInput(value: number | null, field: keyof DbWorkoutSet, placeholder: string, width = 'w-16') {
    return (
      <input
        type="number" min={0}
        defaultValue={value ?? ''}
        onBlur={e => { const v = e.target.value === '' ? null : parseFloat(e.target.value); onUpdate({ [field]: v }) }}
        placeholder={placeholder}
        className={clsx(width, 'px-2 py-1.5 text-sm text-center border border-[#242d40] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-[#0d1117] hover:bg-[#161b27] transition-colors')}
      />
    )
  }

  return (
    <tr className="group">
      <td className="py-2 px-3 text-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold">
          {set.set_number}
        </span>
      </td>
      {metric === 'reps_weight' && (<>
        <td className="py-2 px-2">{numInput(set.reps, 'reps', '8')}</td>
        <td className="py-2 px-2">{numInput(set.weight, 'weight', '0', 'w-20')}</td>
      </>)}
      {metric === 'reps'     && <td className="py-2 px-2">{numInput(set.reps, 'reps', '10')}</td>}
      {metric === 'time'     && <td className="py-2 px-2">{numInput(set.duration_seconds, 'duration_seconds', '60', 'w-20')}</td>}
      {metric === 'distance' && <td className="py-2 px-2">{numInput(set.distance_meters, 'distance_meters', '400', 'w-20')}</td>}
      <td className="py-2 px-2">{numInput(set.rest_seconds, 'rest_seconds', '60')}</td>
      <td className="py-2 px-2">
        <button onClick={onRemove} disabled={isOnly}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#2e3a52] hover:text-rose-500 hover:bg-rose-400/10 transition-all disabled:opacity-0">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

// ─── Progression config ───────────────────────────────────────
function ProgressionConfig({ exerciseId, workoutId, metric, progressionType, progressionValue }: {
  exerciseId: string; workoutId: string; metric: ExerciseMetricType
  progressionType: ProgressionType; progressionValue: number | null
}) {
  const updateExercise = useUpdateWorkoutExercise(workoutId)
  const unit = useUnitSystem()
  const [type, setType] = useState<ProgressionType>(progressionType)
  const [value, setValue] = useState<string>(progressionValue?.toString() ?? '')

  function saveProgression(pt: ProgressionType, pv: string) {
    updateExercise.mutate({ id: exerciseId, progression_type: pt, progression_value: pv ? parseFloat(pv) : null })
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#242d40] flex flex-wrap items-center gap-3">
      <TrendingUp size={14} className="text-amber-400 flex-shrink-0" />
      <span className="text-xs font-semibold text-[#4a5a75] uppercase tracking-wide">Progression</span>
      <select value={type} onChange={e => { const pt = e.target.value as ProgressionType; setType(pt); saveProgression(pt, value) }}
        className="text-xs border border-[#242d40] rounded-lg px-2.5 py-1.5 bg-[#161b27] focus:outline-none focus:ring-2 focus:ring-amber-400/20">
        {(Object.keys(PROGRESSION_LABELS) as ProgressionType[]).map(k => (
          <option key={k} value={k}>{PROGRESSION_LABELS[k]}</option>
        ))}
      </select>
      {type !== 'none' && (
        <div className="flex items-center gap-1.5">
          <input type="number" min={0} step={0.5} value={value}
            onChange={e => setValue(e.target.value)} onBlur={() => saveProgression(type, value)}
            placeholder="amount"
            className="w-16 px-2 py-1.5 text-xs border border-[#242d40] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/20 text-center" />
          <span className="text-xs text-[#3a4a62]">{buildProgressionUnit(unit)[type][metric]}</span>
        </div>
      )}
      {type !== 'none' && value && (
        <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
          {progressionHint(type, parseFloat(value) || null, metric, unit)}
        </span>
      )}
    </div>
  )
}

// ─── Exercise block ───────────────────────────────────────────
function ExerciseBlock({ we, workoutId, index, total, onMoveUp, onMoveDown }: {
  we: WorkoutExerciseWithSets; workoutId: string
  index: number; total: number; onMoveUp: () => void; onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const removeExercise = useRemoveWorkoutExercise(workoutId)
  const addSet = useAddWorkoutSet(workoutId)
  const updateSet = useUpdateWorkoutSet(workoutId)
  const removeSet = useRemoveWorkoutSet(workoutId)
  const unit = useUnitSystem()
  const metricLabels = buildMetricLabels(unit)
  const metric: ExerciseMetricType = we.exercise?.metric_type ?? 'reps_weight'
  const cols = metricLabels[metric].cols

  function handleAddSet() {
    const lastSet = we.workout_sets[we.workout_sets.length - 1]
    addSet.mutate({
      workout_exercise_id: we.id,
      set_number: (lastSet?.set_number ?? 0) + 1,
      reps: metric === 'reps_weight' || metric === 'reps' ? (lastSet?.reps ?? 8) : null,
      weight: metric === 'reps_weight' ? (lastSet?.weight ?? null) : null,
      duration_seconds: metric === 'time' ? (lastSet?.duration_seconds ?? 60) : null,
      distance_meters: metric === 'distance' ? (lastSet?.distance_meters ?? 400) : null,
      rest_seconds: lastSet?.rest_seconds ?? 60,
    })
  }

  return (
    <div className={clsx('bg-[#161b27] rounded-2xl border shadow-sm transition-shadow', expanded ? 'border-[#242d40] shadow-card' : 'border-[#242d40]')}>
      <div className="flex items-center gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0} className="p-0.5 text-[#2e3a52] hover:text-[#4a5a75] disabled:opacity-20"><ChevronUp size={14} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-0.5 text-[#2e3a52] hover:text-[#4a5a75] disabled:opacity-20"><ChevronDown size={14} /></button>
        </div>
        <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-lg flex-shrink-0">
          {metricLabels[metric].icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#e8edf5] truncate">{we.exercise_name}</p>
          <div className="flex items-center gap-2 text-xs text-[#3a4a62]">
            <span>{metricLabels[metric].label}</span>
            {we.exercise?.muscle_group && <><span>·</span><span>{we.exercise.muscle_group}</span></>}
            {we.exercise?.equipment && <><span>·</span><span>{we.exercise.equipment}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-[#3a4a62] bg-[#161b27] px-2 py-1 rounded-lg">
            {we.workout_sets.length} set{we.workout_sets.length !== 1 ? 's' : ''}
          </span>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27] transition-colors">
            <Expand size={15} className={clsx('transition-transform', !expanded && '-rotate-90')} />
          </button>
          <button onClick={() => removeExercise.mutate(we.id)} disabled={removeExercise.isPending}
            className="p-1.5 rounded-lg text-[#2e3a52] hover:text-rose-500 hover:bg-rose-400/10 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <table className="w-full">
            <thead>
              <tr>
                {cols.map(col => <th key={col} className="py-1 px-2 text-xs font-semibold text-[#3a4a62] text-center">{col}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {we.workout_sets.length === 0 ? (
                <tr><td colSpan={cols.length + 1} className="py-4 text-center text-sm text-[#3a4a62]">No sets yet — add one below</td></tr>
              ) : (
                we.workout_sets.map(set => (
                  <SetRow key={set.id} set={set} metric={metric} isOnly={we.workout_sets.length === 1}
                    onUpdate={patch => updateSet.mutate({ id: set.id, ...patch })}
                    onRemove={() => removeSet.mutate(set.id)} />
                ))
              )}
            </tbody>
          </table>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={handleAddSet} disabled={addSet.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 rounded-lg hover:bg-amber-400/10 transition-colors disabled:opacity-60">
              {addSet.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add set
            </button>
            {we.workout_sets.length > 0 && (
              <button
                onClick={() => {
                  const last = we.workout_sets[we.workout_sets.length - 1]!
                  addSet.mutate({ workout_exercise_id: we.id, set_number: last.set_number + 1,
                    reps: last.reps, weight: last.weight, duration_seconds: last.duration_seconds,
                    distance_meters: last.distance_meters, rest_seconds: last.rest_seconds })
                }}
                className="text-xs text-[#3a4a62] hover:text-[#8a9ab5] px-2 py-1.5 rounded-lg hover:bg-[#161b27] transition-colors">
                Copy last set
              </button>
            )}
          </div>
          <ProgressionConfig exerciseId={we.id} workoutId={workoutId} metric={metric}
            progressionType={(we.progression_type as ProgressionType) ?? 'none'}
            progressionValue={we.progression_value} />
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function WorkoutBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)

  // Handle new workout creation
  if (!id || id === 'new') return <NewWorkoutScreen />

  const { data: workout, isLoading, error } = useWorkoutDetail(id)
  const addExercise = useAddWorkoutExercise(id)
  const updateWorkout = useUpdateWorkout()

  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  function startEditName() {
    setDraftName(workout!.name)
    setEditingName(true)
    setTimeout(() => nameRef.current?.select(), 50)
  }

  function saveName() {
    if (draftName.trim() && draftName !== workout!.name) {
      updateWorkout.mutate({ id: id!, name: draftName.trim() })
    }
    setEditingName(false)
  }

  async function swapOrder(aId: string, aIdx: number, bId: string, bIdx: number) {
    await Promise.all([
      supabase.from('workout_exercises').update({ order_index: bIdx } as any).eq('id', aId),
      supabase.from('workout_exercises').update({ order_index: aIdx } as any).eq('id', bId),
    ])
    qc.invalidateQueries({ queryKey: ['workout-detail', id] })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-96"><Loader2 size={28} className="animate-spin text-[#2e3a52]" /></div>
  }

  if (error || !workout) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#4a5a75]">Workout not found.</p>
        <button onClick={() => navigate('/library/workouts')} className="mt-3 text-amber-400 text-sm hover:underline">← Back to workouts</button>
      </div>
    )
  }

  const exercises = workout.workout_exercises

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {showPicker && (
        <ExercisePicker
          onClose={() => setShowPicker(false)}
          onPick={ex => addExercise.mutate({ exercise_id: ex.id, exercise_name: ex.name, order_index: exercises.length })}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/library/workouts')}
          className="mt-1 p-2 rounded-xl text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-[#161b27] transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <input ref={nameRef} value={draftName} onChange={e => setDraftName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="text-2xl font-bold text-[#e8edf5] w-full border-b-2 border-amber-400 outline-none bg-transparent" />
          ) : (
            <h1 onClick={startEditName}
              className="text-2xl font-bold text-[#e8edf5] cursor-text hover:text-amber-400 transition-colors truncate"
              title="Click to rename">
              {workout.name}
            </h1>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-[#3a4a62] flex-wrap">
            {workout.category   && <span className="bg-[#161b27] px-2 py-0.5 rounded">{workout.category}</span>}
            {workout.difficulty && <span className="bg-[#161b27] px-2 py-0.5 rounded capitalize">{workout.difficulty}</span>}
            {workout.duration_minutes && <span className="flex items-center gap-1"><Clock size={11} />{workout.duration_minutes} min</span>}
            <span className="flex items-center gap-1"><Dumbbell size={11} />{exercises.length} exercises</span>
          </div>
        </div>

        {/* Add to Program */}
        <div className="flex-shrink-0 mt-1">
          <AddToProgramPanel workoutId={id} />
        </div>
      </div>

      {/* Exercise blocks */}
      {exercises.length === 0 ? (
        <div className="bg-[#161b27] rounded-2xl border-2 border-dashed border-[#242d40] p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={28} className="text-amber-400" />
          </div>
          <p className="font-semibold text-[#8a9ab5] mb-1">No exercises yet</p>
          <p className="text-sm text-[#3a4a62] mb-4">Add exercises from your library to build this workout</p>
          <button onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-300 text-white text-sm font-semibold rounded-xl hover:from-amber-400 hover:to-amber-300 shadow-sm transition-all mx-auto">
            <Plus size={15} />Add Exercise
          </button>
        </div>
      ) : (
        <>
          {exercises.map((we, idx) => (
            <ExerciseBlock key={we.id} we={we} workoutId={id} index={idx} total={exercises.length}
              onMoveUp={() => swapOrder(we.id, idx, exercises[idx - 1].id, idx - 1)}
              onMoveDown={() => swapOrder(we.id, idx, exercises[idx + 1].id, idx + 1)} />
          ))}

          <button onClick={() => setShowPicker(true)} disabled={addExercise.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#242d40] rounded-2xl text-sm font-medium text-[#3a4a62] hover:border-amber-400/30 hover:text-amber-400 hover:bg-amber-400/10/30 transition-all">
            {addExercise.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add Exercise
          </button>

          {/* Add to Program footer */}
          <div className="bg-gradient-to-br from-violet-50 to-amber-300 rounded-2xl border border-violet-100 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[#e8edf5] text-sm">Ready to schedule this workout?</p>
              <p className="text-xs text-[#4a5a75] mt-0.5">Add it to a training program and assign it to clients</p>
            </div>
            <AddToProgramPanel workoutId={id} />
          </div>
        </>
      )}
    </div>
  )
}
