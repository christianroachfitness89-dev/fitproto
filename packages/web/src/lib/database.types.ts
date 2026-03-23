// Database row types — mirrors the Supabase schema exactly

export type ClientStatus = 'active' | 'inactive' | 'pending'
export type UserRole = 'owner' | 'coach'
export type SenderType = 'coach' | 'client'
export type TaskType = 'check_in' | 'workout' | 'nutrition' | 'general'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

/** How sets are measured for an exercise */
export type ExerciseMetricType = 'reps_weight' | 'reps' | 'time' | 'distance'

/** Progressive overload strategy for a workout exercise */
export type ProgressionType = 'none' | 'linear' | 'percentage' | 'double_progression'

export type UnitSystem = 'imperial' | 'metric'

export interface DbOrganization {
  id: string
  name: string
  owner_id: string
  unit_system: UnitSystem
  created_at: string
}

export interface DbProfile {
  id: string
  org_id: string
  full_name: string | null
  initials: string | null
  role: UserRole
  specialization: string | null
  created_at: string
}

export interface DbClient {
  id: string
  org_id: string
  assigned_coach_id: string | null
  name: string
  email: string | null
  phone: string | null
  status: ClientStatus
  goal: string | null
  category: string | null
  group_name: string | null
  tags: string[]
  joined_at: string
  created_at: string
}

export interface DbExercise {
  id: string
  org_id: string
  name: string
  category: string | null
  muscle_group: string | null
  secondary_muscle: string | null
  tertiary_muscle: string | null
  equipment: string | null
  instructions: string | null
  video_url: string | null
  video_explanation_url: string | null
  difficulty: string | null
  body_region: string | null
  mechanics: string | null
  laterality: string | null
  posture: string | null
  movement_pattern: string | null
  /** How this exercise is tracked in a set */
  metric_type: ExerciseMetricType
  created_at: string
}

export interface DbWorkout {
  id: string
  org_id: string
  name: string
  description: string | null
  difficulty: Difficulty | null
  category: string | null
  duration_minutes: number | null
  created_at: string
}

export interface DbWorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string | null
  exercise_name: string
  order_index: number
  notes: string | null
  /** How to progress this exercise each session */
  progression_type: ProgressionType
  /** Amount to progress (lbs, %, seconds, or meters) */
  progression_value: number | null
}

export interface DbWorkoutSet {
  id: string
  workout_exercise_id: string
  set_number: number
  reps: number | null
  weight: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  distance_meters: number | null
}

export interface DbWorkoutSetLog {
  id: string
  workout_log_id: string
  workout_exercise_id: string
  set_number: number
  reps_achieved: number | null
  weight_used: number | null
  duration_seconds: number | null
  distance_meters: number | null
  rpe: number | null
  created_at: string
}

export interface DbProgram {
  id: string
  org_id: string
  name: string
  description: string | null
  duration_weeks: number | null
  workouts_per_week: number | null
  difficulty: Difficulty | null
  category: string | null
  created_at: string
}

export interface DbConversation {
  id: string
  org_id: string
  client_id: string
  last_message_at: string | null
  created_at: string
}

export interface DbMessage {
  id: string
  conversation_id: string
  sender_type: SenderType
  sender_id: string
  content: string
  read: boolean
  created_at: string
}

export interface DbTask {
  id: string
  org_id: string
  client_id: string | null
  assigned_to: string | null
  title: string
  type: TaskType
  due_date: string | null
  completed: boolean
  created_at: string
}

export interface DbWorkoutLog {
  id: string
  client_id: string
  workout_id: string | null
  completed_at: string
  notes: string | null
  created_at: string
}

export type ClientWorkoutStatus = 'assigned' | 'completed' | 'skipped'

export interface DbClientWorkout {
  id: string
  client_id: string
  workout_id: string
  assigned_at: string
  due_date: string | null
  status: ClientWorkoutStatus
  notes: string | null
  created_at: string
}

export interface DbClientWorkoutWithWorkout extends DbClientWorkout {
  workout: DbWorkout
}

export interface DbCheckIn {
  id: string
  client_id: string
  checked_in_at: string
  weight_kg: number | null
  body_fat_pct: number | null
  notes: string | null
  energy_level: number | null
  sleep_hours: number | null
  created_at: string
}

export interface DbNotification {
  id: string
  org_id: string
  user_id: string
  type: string | null
  title: string
  body: string | null
  read: boolean
  created_at: string
}

// Supabase Database type for the client constructor
export interface Database {
  public: {
    Tables: {
      organizations:      { Row: DbOrganization;    Insert: Omit<DbOrganization, 'id' | 'created_at'>;    Update: Partial<DbOrganization> }
      profiles:           { Row: DbProfile;         Insert: Omit<DbProfile, 'created_at'>;                Update: Partial<DbProfile> }
      clients:            { Row: DbClient;          Insert: Omit<DbClient, 'id' | 'created_at' | 'joined_at'>; Update: Partial<DbClient> }
      exercises:          { Row: DbExercise;        Insert: Omit<DbExercise, 'id' | 'created_at'>;        Update: Partial<DbExercise> }
      workouts:           { Row: DbWorkout;         Insert: Omit<DbWorkout, 'id' | 'created_at'>;         Update: Partial<DbWorkout> }
      workout_exercises:  { Row: DbWorkoutExercise; Insert: Omit<DbWorkoutExercise, 'id'>;                Update: Partial<DbWorkoutExercise> }
      workout_sets:       { Row: DbWorkoutSet;      Insert: Omit<DbWorkoutSet, 'id'>;                     Update: Partial<DbWorkoutSet> }
      workout_set_logs:   { Row: DbWorkoutSetLog;   Insert: Omit<DbWorkoutSetLog, 'id' | 'created_at'>;   Update: Partial<DbWorkoutSetLog> }
      programs:           { Row: DbProgram;         Insert: Omit<DbProgram, 'id' | 'created_at'>;         Update: Partial<DbProgram> }
      conversations:      { Row: DbConversation;    Insert: Omit<DbConversation, 'id' | 'created_at'>;    Update: Partial<DbConversation> }
      messages:           { Row: DbMessage;         Insert: Omit<DbMessage, 'id' | 'created_at'>;         Update: Partial<DbMessage> }
      tasks:              { Row: DbTask;            Insert: Omit<DbTask, 'id' | 'created_at'>;            Update: Partial<DbTask> }
      workout_logs:       { Row: DbWorkoutLog;        Insert: Omit<DbWorkoutLog, 'id' | 'created_at'>;        Update: Partial<DbWorkoutLog> }
      client_workouts:    { Row: DbClientWorkout;    Insert: Omit<DbClientWorkout, 'id' | 'created_at'>;    Update: Partial<DbClientWorkout> }
      check_ins:          { Row: DbCheckIn;          Insert: Omit<DbCheckIn, 'id' | 'created_at'>;          Update: Partial<DbCheckIn> }
      notifications:      { Row: DbNotification;     Insert: Omit<DbNotification, 'id' | 'created_at'>;     Update: Partial<DbNotification> }
    }
  }
}
