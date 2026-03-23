import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Search, X, Loader2, Dumbbell, Clock, TrendingUp,
  ChevronDown as Expand,
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import {
  useWorkoutDetail, useUpdateWorkout,
  useAddWorkoutExercise, useUpdateWorkoutExercise, useRemoveWorkoutExercise,
  useAddWorkoutSet, useUpdateWorkoutSet, useRemoveWorkoutSet,
  useExercises, type WorkoutExerciseWithSets,
} from '@/hooks/useWorkouts'
import type { DbWorkoutSet, ExerciseMetricType, ProgressionType } from '@/lib/database.types'
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

// ─── Exercise picker modal ────────────────────────────────────
function ExercisePicker({
  onPick, onClose,
}: {
  onPick: (ex: { id: string; name: string }) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const { data: exercises = [], isLoading } = useExercises(search.length >= 1 ? search : undefined)
  const unit = useUnitSystem()
  const metricLabels = buildMetricLabels(unit)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
              />
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : exercises.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No exercises found</div>
          ) : (
            exercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => { onPick({ id: ex.id, name: ex.name }); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 text-base">
                  {metricLabels[ex.metric_type]?.icon ?? '🏋️'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{ex.name}</p>
                  <p className="text-xs text-gray-400">
                    {[ex.muscle_group, ex.category, metricLabels[ex.metric_type]?.label].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Set row ──────────────────────────────────────────────────
function SetRow({
  set,
  metric,
  onUpdate,
  onRemove,
  isOnly,
}: {
  set: DbWorkoutSet
  metric: ExerciseMetricType
  onUpdate: (patch: Partial<DbWorkoutSet>) => void
  onRemove: () => void
  isOnly: boolean
}) {
  function numInput(
    value: number | null,
    field: keyof DbWorkoutSet,
    placeholder: string,
    width = 'w-16',
  ) {
    return (
      <input
        type="number"
        min={0}
        defaultValue={value ?? ''}
        onBlur={e => {
          const v = e.target.value === '' ? null : parseFloat(e.target.value)
          onUpdate({ [field]: v })
        }}
        placeholder={placeholder}
        className={clsx(
          width,
          'px-2 py-1.5 text-sm text-center border border-gray-200 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400',
          'bg-gray-50 hover:bg-white transition-colors',
        )}
      />
    )
  }

  return (
    <tr className="group">
      <td className="py-2 px-3 text-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
          {set.set_number}
        </span>
      </td>

      {metric === 'reps_weight' && (
        <>
          <td className="py-2 px-2">{numInput(set.reps, 'reps', '8')}</td>
          <td className="py-2 px-2">{numInput(set.weight, 'weight', '0', 'w-20')}</td>
        </>
      )}
      {metric === 'reps' && (
        <td className="py-2 px-2">{numInput(set.reps, 'reps', '10')}</td>
      )}
      {metric === 'time' && (
        <td className="py-2 px-2">{numInput(set.duration_seconds, 'duration_seconds', '60', 'w-20')}</td>
      )}
      {metric === 'distance' && (
        <td className="py-2 px-2">{numInput(set.distance_meters, 'distance_meters', '400', 'w-20')}</td>
      )}

      <td className="py-2 px-2">{numInput(set.rest_seconds, 'rest_seconds', '60')}</td>

      <td className="py-2 px-2">
        <button
          onClick={onRemove}
          disabled={isOnly}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-0"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

// ─── Progression config ───────────────────────────────────────
function ProgressionConfig({
  exerciseId,
  workoutId,
  metric,
  progressionType,
  progressionValue,
}: {
  exerciseId: string
  workoutId: string
  metric: ExerciseMetricType
  progressionType: ProgressionType
  progressionValue: number | null
}) {
  const updateExercise = useUpdateWorkoutExercise(workoutId)
  const unit = useUnitSystem()
  const [type, setType] = useState<ProgressionType>(progressionType)
  const [value, setValue] = useState<string>(progressionValue?.toString() ?? '')

  function saveProgression(pt: ProgressionType, pv: string) {
    updateExercise.mutate({
      id: exerciseId,
      progression_type: pt,
      progression_value: pv ? parseFloat(pv) : null,
    })
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
      <TrendingUp size={14} className="text-brand-400 flex-shrink-0" />
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progression</span>

      <select
        value={type}
        onChange={e => {
          const pt = e.target.value as ProgressionType
          setType(pt)
          saveProgression(pt, value)
        }}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        {(Object.keys(PROGRESSION_LABELS) as ProgressionType[]).map(k => (
          <option key={k} value={k}>{PROGRESSION_LABELS[k]}</option>
        ))}
      </select>

      {type !== 'none' && (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            step={0.5}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={() => saveProgression(type, value)}
            placeholder="amount"
            className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-center"
          />
          <span className="text-xs text-gray-400">{buildProgressionUnit(unit)[type][metric]}</span>
        </div>
      )}

      {type !== 'none' && value && (
        <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">
          {progressionHint(type, parseFloat(value) || null, metric, unit)}
        </span>
      )}
    </div>
  )
}

// ─── Exercise block ───────────────────────────────────────────
function ExerciseBlock({
  we,
  workoutId,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  we: WorkoutExerciseWithSets
  workoutId: string
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
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
    const nextNum = (lastSet?.set_number ?? 0) + 1
    addSet.mutate({
      workout_exercise_id: we.id,
      set_number: nextNum,
      reps: metric === 'reps_weight' || metric === 'reps' ? (lastSet?.reps ?? 8) : null,
      weight: metric === 'reps_weight' ? (lastSet?.weight ?? null) : null,
      duration_seconds: metric === 'time' ? (lastSet?.duration_seconds ?? 60) : null,
      distance_meters: metric === 'distance' ? (lastSet?.distance_meters ?? 400) : null,
      rest_seconds: lastSet?.rest_seconds ?? 60,
    })
  }

  return (
    <div className={clsx(
      'bg-white rounded-2xl border shadow-sm transition-shadow',
      expanded ? 'border-gray-200 shadow-card' : 'border-gray-100',
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0} className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20">
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">
          {metricLabels[metric].icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{we.exercise_name}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{metricLabels[metric].label}</span>
            {we.exercise?.muscle_group && <><span>·</span><span>{we.exercise.muscle_group}</span></>}
            {we.exercise?.equipment && <><span>·</span><span>{we.exercise.equipment}</span></>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            {we.workout_sets.length} set{we.workout_sets.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Expand size={15} className={clsx('transition-transform', !expanded && '-rotate-90')} />
          </button>
          <button
            onClick={() => removeExercise.mutate(we.id)}
            disabled={removeExercise.isPending}
            className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Sets table */}
      {expanded && (
        <div className="px-4 pb-4">
          <table className="w-full">
            <thead>
              <tr>
                {cols.map(col => (
                  <th key={col} className="py-1 px-2 text-xs font-semibold text-gray-400 text-center">{col}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {we.workout_sets.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="py-4 text-center text-sm text-gray-400">
                    No sets yet — add one below
                  </td>
                </tr>
              ) : (
                we.workout_sets.map(set => (
                  <SetRow
                    key={set.id}
                    set={set}
                    metric={metric}
                    isOnly={we.workout_sets.length === 1}
                    onUpdate={patch => updateSet.mutate({ id: set.id, ...patch })}
                    onRemove={() => removeSet.mutate(set.id)}
                  />
                ))
              )}
            </tbody>
          </table>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleAddSet}
              disabled={addSet.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-60"
            >
              {addSet.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Add set
            </button>

            {/* Quick duplicate: copy all sets */}
            {we.workout_sets.length > 0 && (
              <button
                onClick={() => {
                  const last = we.workout_sets[we.workout_sets.length - 1]!
                  addSet.mutate({
                    workout_exercise_id: we.id,
                    set_number: last.set_number + 1,
                    reps: last.reps,
                    weight: last.weight,
                    duration_seconds: last.duration_seconds,
                    distance_meters: last.distance_meters,
                    rest_seconds: last.rest_seconds,
                  })
                }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Copy last set
              </button>
            )}
          </div>

          <ProgressionConfig
            exerciseId={we.id}
            workoutId={workoutId}
            metric={metric}
            progressionType={(we.progression_type as ProgressionType) ?? 'none'}
            progressionValue={we.progression_value}
          />
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

  const { data: workout, isLoading, error } = useWorkoutDetail(id)
  const addExercise = useAddWorkoutExercise(id!)
  const updateWorkout = useUpdateWorkout()

  // Name inline editing
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
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (error || !workout) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Workout not found.</p>
        <button onClick={() => navigate('/library/workouts')} className="mt-3 text-brand-600 text-sm hover:underline">
          ← Back to workouts
        </button>
      </div>
    )
  }

  const exercises = workout.workout_exercises

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {showPicker && (
        <ExercisePicker
          onClose={() => setShowPicker(false)}
          onPick={ex =>
            addExercise.mutate({
              exercise_id: ex.id,
              exercise_name: ex.name,
              order_index: exercises.length,
            })
          }
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/library/workouts')}
          className="mt-1 p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameRef}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="text-2xl font-bold text-gray-900 w-full border-b-2 border-brand-400 outline-none bg-transparent"
            />
          ) : (
            <h1
              onClick={startEditName}
              className="text-2xl font-bold text-gray-900 cursor-text hover:text-brand-700 transition-colors truncate"
              title="Click to rename"
            >
              {workout.name}
            </h1>
          )}

          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            {workout.category   && <span className="bg-gray-100 px-2 py-0.5 rounded">{workout.category}</span>}
            {workout.difficulty && <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">{workout.difficulty}</span>}
            {workout.duration_minutes && (
              <span className="flex items-center gap-1"><Clock size={11} />{workout.duration_minutes} min</span>
            )}
            <span className="flex items-center gap-1"><Dumbbell size={11} />{exercises.length} exercises</span>
          </div>
        </div>
      </div>

      {/* Exercise blocks */}
      {exercises.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={28} className="text-brand-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No exercises yet</p>
          <p className="text-sm text-gray-400 mb-4">Add exercises from your library to build this workout</p>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 shadow-sm transition-all mx-auto"
          >
            <Plus size={15} />Add Exercise
          </button>
        </div>
      ) : (
        <>
          {exercises.map((we, idx) => (
            <ExerciseBlock
              key={we.id}
              we={we}
              workoutId={id!}
              index={idx}
              total={exercises.length}
              onMoveUp={() => swapOrder(we.id, idx, exercises[idx - 1].id, idx - 1)}
              onMoveDown={() => swapOrder(we.id, idx, exercises[idx + 1].id, idx + 1)}
            />
          ))}

          <button
            onClick={() => setShowPicker(true)}
            disabled={addExercise.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/30 transition-all"
          >
            {addExercise.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add Exercise
          </button>
        </>
      )}
    </div>
  )
}
