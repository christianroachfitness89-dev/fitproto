import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Plus, Filter, Dumbbell, MoreHorizontal, Clock, BarChart3, Users } from 'lucide-react'
import { mockExercises, mockWorkouts, mockPrograms } from '../data/mockData'
import clsx from 'clsx'

function DifficultyBadge({ level }: { level: 'beginner' | 'intermediate' | 'advanced' }) {
  return (
    <span className={clsx(
      'px-2 py-0.5 rounded text-xs font-medium',
      level === 'beginner' && 'bg-emerald-50 text-emerald-700',
      level === 'intermediate' && 'bg-amber-50 text-amber-700',
      level === 'advanced' && 'bg-rose-50 text-rose-700',
    )}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

function ExercisesList() {
  const [search, setSearch] = useState('')
  const filtered = mockExercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscleGroup.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <Filter size={15} />
          Filter
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700">
          <Plus size={15} />
          New Exercise
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
            {filtered.map(ex => (
              <tr key={ex.id} className="hover:bg-gray-50/70 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Dumbbell size={16} className="text-brand-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{ex.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">{ex.category}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{ex.muscleGroup}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{ex.equipment}</td>
                <td className="px-4 py-4">
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-all">
                    <MoreHorizontal size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WorkoutsList() {
  const [search, setSearch] = useState('')
  const filtered = mockWorkouts.filter(w => w.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search workouts..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700">
          <Plus size={15} />
          New Workout
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(workout => (
          <div key={workout.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Dumbbell size={20} className="text-brand-600" />
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-400 transition-all">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">{workout.name}</h3>
            {workout.description && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{workout.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Dumbbell size={12} />
                {workout.exercises.length} exercises
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                {workout.duration}min
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <DifficultyBadge level={workout.difficulty} />
              <span className="text-xs text-gray-400">{workout.category}</span>
            </div>
          </div>
        ))}
        {/* New workout card */}
        <button className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-5 hover:border-brand-300 hover:bg-brand-50/30 transition-all group flex flex-col items-center justify-center min-h-[160px] gap-2">
          <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
            <Plus size={20} className="text-gray-400 group-hover:text-brand-600" />
          </div>
          <span className="text-sm font-medium text-gray-400 group-hover:text-brand-600">Create Workout</span>
        </button>
      </div>
    </div>
  )
}

function ProgramsList() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search programs..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700">
          <Plus size={15} />
          New Program
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockPrograms.map(program => (
          <div key={program.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <BarChart3 size={20} className="text-emerald-600" />
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-400 transition-all">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">{program.name}</h3>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{program.description}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                {program.duration} weeks
              </div>
              <div className="flex items-center gap-1">
                <Dumbbell size={12} />
                {program.workoutsPerWeek}x/week
              </div>
              <div className="flex items-center gap-1">
                <Users size={12} />
                {program.assignedClients} clients
              </div>
            </div>
            <div className="flex items-center justify-between">
              <DifficultyBadge level={program.difficulty} />
              <span className="text-xs text-gray-400">{program.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Dumbbell size={28} className="text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">This section is coming soon. Build and manage your {title.toLowerCase()} here.</p>
      <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 mx-auto">
        <Plus size={15} />
        Create First
      </button>
    </div>
  )
}

export default function Library() {
  const { section } = useParams<{ section: string }>()

  const renderContent = () => {
    switch (section) {
      case 'exercises': return <ExercisesList />
      case 'workouts': return <WorkoutsList />
      case 'programs': return <ProgramsList />
      case 'tasks': return <PlaceholderSection title="Tasks" />
      case 'forms': return <PlaceholderSection title="Forms & Questionnaires" />
      case 'meals': return <PlaceholderSection title="Meal Plan Templates" />
      case 'metrics': return <PlaceholderSection title="Metric Groups" />
      default: return <ExercisesList />
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {renderContent()}
    </div>
  )
}
