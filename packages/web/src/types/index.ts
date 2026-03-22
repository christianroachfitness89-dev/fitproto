export interface Client {
  id: string
  name: string
  email: string
  avatar?: string
  initials: string
  status: 'active' | 'inactive' | 'pending'
  category?: string
  group?: string
  lastActivity: string
  last7dTraining: number
  last30dTraining: number
  last7dTasks: number
  joinedAt: string
  goal?: string
  phone?: string
  tags?: string[]
}

export interface Exercise {
  id: string
  name: string
  category: string
  muscleGroup: string
  equipment: string
  videoUrl?: string
  thumbnailUrl?: string
  instructions?: string
  createdAt: string
}

export interface WorkoutSet {
  reps?: number
  weight?: number
  duration?: number
  restTime?: number
}

export interface WorkoutExercise {
  exerciseId: string
  exerciseName: string
  sets: WorkoutSet[]
  notes?: string
}

export interface Workout {
  id: string
  name: string
  description?: string
  exercises: WorkoutExercise[]
  duration?: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  createdAt: string
}

export interface Program {
  id: string
  name: string
  description?: string
  duration: number
  workoutsPerWeek: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  workouts: string[]
  assignedClients: number
  createdAt: string
}

export interface Message {
  id: string
  clientId: string
  clientName: string
  clientInitials: string
  content: string
  timestamp: string
  read: boolean
  type: 'text' | 'image' | 'file'
}

export interface Notification {
  id: string
  type: 'workout_completed' | 'message' | 'client_joined' | 'payment'
  title: string
  body: string
  timestamp: string
  read: boolean
}

export interface Task {
  id: string
  title: string
  clientId: string
  clientName: string
  dueDate: string
  completed: boolean
  type: 'check_in' | 'workout' | 'nutrition' | 'general'
}

export interface Coach {
  id: string
  name: string
  email: string
  avatar?: string
  initials: string
  specialization?: string
  clientCount: number
}
