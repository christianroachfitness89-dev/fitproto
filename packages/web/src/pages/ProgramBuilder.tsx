import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, Loader2, Trash2, Search,
  Dumbbell, Clock, ChevronLeft, ChevronRight, Minus,
} from 'lucide-react'
import clsx from 'clsx'
import {
  useProgramDetail, useUpdateProgram, useDeleteProgram,
  useAddProgramWorkout, useRemoveProgramWorkout,
  useWorkouts,
} from '@/hooks/useWorkouts'

// ─── Constants ────────────────────────────────────────────────
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Workout picker modal ─────────────────────────────────────
function WorkoutPicker({
  week, day, isPending,
  onAdd, onClose,
}: {
  week: number
  day: number
  isPending: boolean
  onAdd: (workoutId: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const { data: workouts = [], isLoading } = useWorkouts(search.length >= 2 ? search : undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Workout</h2>
            <p className="text-xs text-gray-400 mt-0.5">Week {week} · {DAY_NAMES[day - 1]}</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search workouts..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : workouts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              {search.length >= 2 ? 'No workouts match your search' : 'No workouts in your library yet'}
            </p>
          ) : (
            workouts.map(w => (
              <button key={w.id} type="button"
                onClick={() => onAdd(w.id)}
                disabled={isPending}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group disabled:opacity-50">
                <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={15} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{w.name}</p>
                  <p className="text-xs text-gray-400">
                    {(w as any).workout_exercises?.length ?? 0} exercises
                    {w.difficulty ? ` · ${w.difficulty}` : ''}
                    {w.duration_minutes ? ` · ${w.duration_minutes}min` : ''}
                  </p>
                </div>
                {isPending
                  ? <Loader2 size={14} className="animate-spin text-gray-300 flex-shrink-0" />
                  : <Plus size={14} className="text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                }
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Program Builder ──────────────────────────────────────────
export default function ProgramBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: program, isLoading } = useProgramDetail(id)
  const updateProgram  = useUpdateProgram()
  const deleteProgram  = useDeleteProgram()
  const addWorkout     = useAddProgramWorkout(id!)
  const removeWorkout  = useRemoveProgramWorkout(id!)

  const [currentWeek, setCurrentWeek] = useState(1)
  const [addingSlot, setAddingSlot]   = useState<{ week: number; day: number } | null>(null)
  const [name, setName]               = useState('')
  const [savingName, setSavingName]   = useState(false)
  const nameTimer = useRef<ReturnType<typeof setTimeout>>()

  // Sync name field when program loads
  useEffect(() => {
    if (program) setName(program.name)
  }, [program?.id])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="p-8 text-center text-gray-400">Program not found.</div>
    )
  }

  const totalWeeks = Math.max(program.duration_weeks ?? 1, 1)

  // Build slot map: week → day → slots
  const slotMap: Record<number, Record<number, typeof program.program_workouts>> = {}
  for (const pw of program.program_workouts) {
    ;(slotMap[pw.week_number] ??= {})[pw.day_number] ??= []
    slotMap[pw.week_number][pw.day_number].push(pw)
  }

  function handleNameChange(val: string) {
    setName(val)
    clearTimeout(nameTimer.current)
    setSavingName(true)
    nameTimer.current = setTimeout(async () => {
      await updateProgram.mutateAsync({ id: program!.id, name: val.trim() || 'Untitled Program' })
      setSavingName(false)
    }, 600)
  }

  async function addWeek() {
    const next = totalWeeks + 1
    await updateProgram.mutateAsync({ id: program!.id, duration_weeks: next })
    setCurrentWeek(next)
  }

  async function removeLastWeek() {
    if (totalWeeks <= 1) return
    const toDelete = program!.program_workouts.filter(pw => pw.week_number === totalWeeks)
    for (const pw of toDelete) await removeWorkout.mutateAsync(pw.id)
    await updateProgram.mutateAsync({ id: program!.id, duration_weeks: totalWeeks - 1 })
    if (currentWeek >= totalWeeks) setCurrentWeek(totalWeeks - 1)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${program!.name}"? This cannot be undone.`)) return
    await deleteProgram.mutateAsync(program!.id)
    navigate('/library/programs')
  }

  async function handleAddWorkout(workoutId: string) {
    if (!addingSlot) return
    await addWorkout.mutateAsync({
      workout_id: workoutId,
      week_number: addingSlot.week,
      day_number: addingSlot.day,
    })
    setAddingSlot(null)
  }

  // Count total scheduled workouts across all weeks
  const totalScheduled = program.program_workouts.length

  return (
    <div className="flex flex-col min-h-screen">
      {/* Workout picker */}
      {addingSlot && (
        <WorkoutPicker
          week={addingSlot.week}
          day={addingSlot.day}
          isPending={addWorkout.isPending}
          onAdd={handleAddWorkout}
          onClose={() => setAddingSlot(null)}
        />
      )}

      {/* ── Sticky top bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate('/library/programs')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors flex-shrink-0">
          <ArrowLeft size={16} /> Programs
        </button>
        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
        <input
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          className="flex-1 text-lg font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 min-w-0"
          placeholder="Program name…"
        />
        {savingName && <Loader2 size={14} className="animate-spin text-gray-300 flex-shrink-0" />}
        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
          <span className="font-semibold text-gray-600">{totalWeeks}</span> wks ·{' '}
          <span className="font-semibold text-gray-600">{totalScheduled}</span> sessions
        </div>
        <button onClick={handleDelete}
          className="p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0"
          title="Delete program">
          <Trash2 size={16} />
        </button>
      </div>

      {/* ── Metadata bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Level</label>
          <select
            value={program.difficulty ?? ''}
            onChange={e => updateProgram.mutate({ id: program.id, difficulty: (e.target.value as any) || null })}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white">
            <option value="">Any</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</label>
          <input
            key={program.id + '-cat'}
            defaultValue={program.category ?? ''}
            onBlur={e => updateProgram.mutate({ id: program.id, category: e.target.value.trim() || null })}
            placeholder="e.g. Strength"
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white w-32" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">Description</label>
          <input
            key={program.id + '-desc'}
            defaultValue={program.description ?? ''}
            onBlur={e => updateProgram.mutate({ id: program.id, description: e.target.value.trim() || null })}
            placeholder="Brief description…"
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white flex-1 min-w-0" />
        </div>
      </div>

      {/* ── Week navigator ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-2">
        <button onClick={() => setCurrentWeek(w => Math.max(1, w - 1))} disabled={currentWeek <= 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
          <ChevronLeft size={16} />
        </button>

        {/* Week pills — show all, click to jump */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
            <button key={w} onClick={() => setCurrentWeek(w)}
              className={clsx(
                'flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                w === currentWeek
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100',
              )}>
              W{w}
            </button>
          ))}
        </div>

        <button onClick={() => setCurrentWeek(w => Math.min(totalWeeks, w + 1))} disabled={currentWeek >= totalWeeks}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
          <ChevronRight size={16} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <button onClick={addWeek} disabled={updateProgram.isPending}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
          <Plus size={13} /> Week
        </button>
        {totalWeeks > 1 && (
          <button onClick={removeLastWeek} disabled={updateProgram.isPending || removeWorkout.isPending}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            <Minus size={13} /> Week
          </button>
        )}
      </div>

      {/* ── Day grid ── */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="grid grid-cols-7 gap-3 min-w-[700px]">
          {DAY_NAMES.map((dayName, idx) => {
            const dayNum   = idx + 1
            const slots    = slotMap[currentWeek]?.[dayNum] ?? []
            const isWeekend = dayNum >= 6

            return (
              <div key={dayNum} className="flex flex-col gap-2">
                {/* Day header */}
                <div className={clsx(
                  'text-center py-2.5 rounded-xl',
                  isWeekend ? 'bg-gray-100' : 'bg-brand-50',
                )}>
                  <p className={clsx(
                    'text-xs font-bold',
                    isWeekend ? 'text-gray-500' : 'text-brand-600',
                  )}>{dayName}</p>
                </div>

                {/* Workout slots */}
                {slots.map(slot => (
                  <div key={slot.id}
                    className="group bg-white border border-gray-200 rounded-xl p-3 hover:border-brand-300 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 flex-1">
                        {slot.workout?.name ?? 'Unnamed'}
                      </p>
                      <button
                        onClick={() => removeWorkout.mutate(slot.id)}
                        disabled={removeWorkout.isPending}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-300 hover:text-rose-400 transition-all disabled:opacity-50 mt-0.5">
                        <X size={12} />
                      </button>
                    </div>
                    {slot.workout?.difficulty && (
                      <span className={clsx(
                        'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                        slot.workout.difficulty === 'beginner'     ? 'bg-emerald-50 text-emerald-600' :
                        slot.workout.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600'    :
                                                                     'bg-rose-50 text-rose-600',
                      )}>
                        {slot.workout.difficulty}
                      </span>
                    )}
                    {slot.workout?.duration_minutes && (
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={9} />{slot.workout.duration_minutes}m
                      </p>
                    )}
                  </div>
                ))}

                {/* Add button */}
                <button
                  onClick={() => setAddingSlot({ week: currentWeek, day: dayNum })}
                  className="flex items-center justify-center gap-1 py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50 transition-all">
                  <Plus size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
