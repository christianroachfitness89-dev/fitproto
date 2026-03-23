import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search, Plus, Dumbbell,
  Clock, BarChart3, X, Loader2, Trash2, ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'
import {
  useExercises, useCreateExercise, useDeleteExercise,
  useWorkouts,  useCreateWorkout,  useDeleteWorkout,
  usePrograms,  useCreateProgram,
} from '@/hooks/useWorkouts'
import type { DbExercise, DbWorkout, DbProgram, Difficulty, ExerciseMetricType } from '@/lib/database.types'

const METRIC_OPTIONS: { value: ExerciseMetricType; label: string; desc: string; icon: string }[] = [
  { value: 'reps_weight', label: 'Reps + Weight', desc: 'e.g. Bench Press, Squat',  icon: '🏋️' },
  { value: 'reps',        label: 'Reps only',     desc: 'e.g. Push-ups, Pull-ups', icon: '🔄' },
  { value: 'time',        label: 'Timed',          desc: 'e.g. Plank, Wall sit',    icon: '⏱️' },
  { value: 'distance',    label: 'Distance',       desc: 'e.g. Run 400m, Row 500m', icon: '📏' },
]

// ─── Shared ───────────────────────────────────────────────────
function DifficultyBadge({ level }: { level: Difficulty | null }) {
  if (!level) return null
  return (
    <span className={clsx(
      'px-2 py-0.5 rounded text-xs font-medium',
      level === 'beginner'     && 'bg-emerald-50 text-emerald-700',
      level === 'intermediate' && 'bg-amber-50 text-amber-700',
      level === 'advanced'     && 'bg-rose-50 text-rose-700',
    )}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

// ─── Exercise modal ───────────────────────────────────────────
function ExerciseModal({ onClose }: { onClose: () => void }) {
  const create = useCreateExercise()
  const [form, setForm] = useState({
    name: '', category: '', muscle_group: '', equipment: '', instructions: '',
    metric_type: 'reps_weight' as ExerciseMetricType,
  })
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setError(null)
    try {
      await create.mutateAsync({
        name:         form.name,
        category:     form.category     || null,
        muscle_group: form.muscle_group || null,
        equipment:    form.equipment    || null,
        instructions: form.instructions || null,
        video_url:    null,
        metric_type:  form.metric_type,
      })
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Exercise</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          {/* Metric type picker — most important field, set it first */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">How is this exercise measured? *</label>
            <div className="grid grid-cols-2 gap-2">
              {METRIC_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, metric_type: opt.value }))}
                  className={clsx(
                    'flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all',
                    form.metric_type === opt.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-100 hover:border-gray-200 bg-white',
                  )}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <p className={clsx('text-xs font-semibold', form.metric_type === opt.value ? 'text-brand-700' : 'text-gray-700')}>{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Exercise Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              placeholder="e.g. Barbell Back Squat"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Strength, Cardio..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Muscle Group</label>
              <input value={form.muscle_group} onChange={e => setForm(f => ({ ...f, muscle_group: e.target.value }))}
                placeholder="Legs, Chest..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Equipment</label>
            <input value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
              placeholder="Barbell, Dumbbells, Bodyweight..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Instructions</label>
            <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={2} placeholder="Step-by-step instructions..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" disabled={create.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-60 transition-all">
              {create.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Create Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Workout modal ────────────────────────────────────────────
function WorkoutModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateWorkout()
  const [form, setForm] = useState({
    name: '', description: '', category: '',
    difficulty: '' as Difficulty | '',
    duration_minutes: '',
  })
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setError(null)
    try {
      const workout = await create.mutateAsync({
        name:             form.name,
        description:      form.description      || null,
        category:         form.category         || null,
        difficulty:       (form.difficulty as Difficulty) || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      })
      navigate(`/library/workouts/${workout.id}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Workout</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Workout Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              placeholder="e.g. Upper Body Strength A"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Brief description..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Strength..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty | '' }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white">
                <option value="">—</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Duration (min)</label>
              <input type="number" min="1" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                placeholder="45"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" disabled={create.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-60 transition-all">
              {create.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Create Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Exercises list ───────────────────────────────────────────
function ExercisesList() {
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data: exercises = [], isLoading } = useExercises(search.length >= 2 ? search : undefined)
  const deleteExercise = useDeleteExercise()

  const categories = [...new Set(exercises.map(e => e.category).filter(Boolean))] as string[]

  const filtered = categoryFilter
    ? exercises.filter(e => e.category === categoryFilter)
    : exercises

  return (
    <div className="space-y-4">
      {showModal && <ExerciseModal onClose={() => setShowModal(false)} />}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 shadow-sm" />
        </div>
        {categories.length > 0 && (
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 flex-wrap">
            <button onClick={() => setCategoryFilter('')}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                categoryFilter === '' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  categoryFilter === cat ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
                {cat}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 shadow-sm transition-all">
          <Plus size={15} />New Exercise
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={28} className="text-brand-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No exercises yet</p>
          <p className="text-sm text-gray-400 mb-4">Add your first exercise to build your library</p>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-brand-50 text-brand-600 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors">
            + New Exercise
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Exercise</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Muscle Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipment</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(ex => {
                  const metricOpt = METRIC_OPTIONS.find(m => m.value === ex.metric_type)
                  return (
                  <tr key={ex.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 text-base">
                          {metricOpt?.icon ?? '🏋️'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{ex.name}</p>
                          <p className="text-xs text-gray-400">{metricOpt?.label ?? 'Reps + Weight'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{ex.category ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{ex.muscle_group ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{ex.equipment ?? '—'}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => deleteExercise.mutate(ex.id)}
                        disabled={deleteExercise.isPending}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 text-gray-300 hover:text-rose-500 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
            {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Workouts list ────────────────────────────────────────────
function WorkoutsList() {
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)

  const { data: workouts = [], isLoading } = useWorkouts(search.length >= 2 ? search : undefined)
  const deleteWorkout = useDeleteWorkout()

  return (
    <div className="space-y-4">
      {showModal && <WorkoutModal onClose={() => setShowModal(false)} />}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workouts..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 shadow-sm" />
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 shadow-sm transition-all">
          <Plus size={15} />New Workout
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : workouts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={28} className="text-emerald-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No workouts yet</p>
          <p className="text-sm text-gray-400 mb-4">Create your first workout template</p>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-brand-50 text-brand-600 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors">
            + New Workout
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workouts.map(workout => (
            <div
              key={workout.id}
              onClick={() => navigate(`/library/workouts/${workout.id}`)}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-card-hover hover:border-brand-200 transition-all group relative cursor-pointer"
            >
              <button
                onClick={e => { e.stopPropagation(); deleteWorkout.mutate(workout.id) }}
                disabled={deleteWorkout.isPending}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 text-gray-300 hover:text-rose-500 transition-all disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                <Dumbbell size={20} className="text-brand-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1 pr-6">{workout.name}</h3>
              {workout.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{workout.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Dumbbell size={12} />
                  {workout.workout_exercises.length} exercise{workout.workout_exercises.length !== 1 ? 's' : ''}
                </div>
                {workout.duration_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {workout.duration_minutes} min
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <DifficultyBadge level={workout.difficulty} />
                <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
              </div>
            </div>
          ))}

          {/* Create new card */}
          <button onClick={() => setShowModal(true)}
            className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 hover:border-brand-300 hover:bg-brand-50/30 transition-all group flex flex-col items-center justify-center min-h-[180px] gap-2">
            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
              <Plus size={20} className="text-gray-400 group-hover:text-brand-600" />
            </div>
            <span className="text-sm font-medium text-gray-400 group-hover:text-brand-600">Create Workout</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Programs list (real data, create only) ───────────────────
function ProgramsList() {
  const [search, setSearch] = useState('')
  const { data: programs = [], isLoading } = usePrograms(search.length >= 2 ? search : undefined)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programs..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 shadow-sm" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 shadow-sm transition-all">
          <Plus size={15} />New Program
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-emerald-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No programs yet</p>
          <p className="text-sm text-gray-400 mb-4">Build multi-week training programs for your clients</p>
          <button className="px-4 py-2 bg-brand-50 text-brand-600 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors">
            + New Program
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(program => (
            <div key={program.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-card-hover hover:border-brand-200 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <BarChart3 size={20} className="text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{program.name}</h3>
              {program.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{program.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                {program.duration_weeks && (
                  <div className="flex items-center gap-1"><Clock size={12} />{program.duration_weeks} weeks</div>
                )}
                {program.workouts_per_week && (
                  <div className="flex items-center gap-1"><Dumbbell size={12} />{program.workouts_per_week}x/week</div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <DifficultyBadge level={program.difficulty} />
                {program.category && <span className="text-xs text-gray-400">{program.category}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Placeholder tab ──────────────────────────────────────────
function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Dumbbell size={28} className="text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">Coming soon</p>
      <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 mx-auto">
        <Plus size={15} />Create First
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function Library() {
  const { section } = useParams<{ section: string }>()

  const renderContent = () => {
    switch (section) {
      case 'exercises': return <ExercisesList />
      case 'workouts':  return <WorkoutsList />
      case 'programs':  return <ProgramsList />
      case 'tasks':     return <PlaceholderSection title="Tasks" />
      case 'forms':     return <PlaceholderSection title="Forms & Questionnaires" />
      case 'meals':     return <PlaceholderSection title="Meal Plan Templates" />
      case 'metrics':   return <PlaceholderSection title="Metric Groups" />
      default:          return <ExercisesList />
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {renderContent()}
    </div>
  )
}
