-- ============================================================
-- FitProto Database Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Organizations (one per coaching business)
-- Right now you'll have one. Sub-coaches join an existing org.
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid references auth.users(id) on delete cascade not null,
  created_at  timestamptz default now() not null
);

-- Profiles (extends auth.users — one row per login)
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete cascade,
  full_name       text,
  initials        text,
  role            text not null default 'owner' check (role in ('owner', 'coach')),
  specialization  text,
  created_at      timestamptz default now() not null
);

-- Clients
create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  assigned_coach_id  uuid references public.profiles(id),
  name               text not null,
  email              text,
  phone              text,
  status             text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  goal               text,
  category           text,
  group_name         text,
  tags               text[] default '{}',
  joined_at          timestamptz default now(),
  created_at         timestamptz default now() not null
);

-- Exercises
create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  name         text not null,
  category     text,
  muscle_group text,
  equipment    text,
  instructions text,
  video_url    text,
  created_at   timestamptz default now() not null
);

-- Workouts
create table public.workouts (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  description      text,
  difficulty       text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  category         text,
  duration_minutes int,
  created_at       timestamptz default now() not null
);

-- Workout exercises (which exercises are in a workout, in order)
create table public.workout_exercises (
  id                uuid primary key default gen_random_uuid(),
  workout_id        uuid not null references public.workouts(id) on delete cascade,
  exercise_id       uuid references public.exercises(id),
  exercise_name     text not null,
  order_index       int not null default 0,
  notes             text
);

-- Sets within each workout exercise
create table public.workout_sets (
  id                   uuid primary key default gen_random_uuid(),
  workout_exercise_id  uuid not null references public.workout_exercises(id) on delete cascade,
  set_number           int not null,
  reps                 int,
  weight               decimal,
  duration_seconds     int,
  rest_seconds         int
);

-- Programs (collections of workouts over weeks)
create table public.programs (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  description      text,
  duration_weeks   int,
  workouts_per_week int,
  difficulty       text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  category         text,
  created_at       timestamptz default now() not null
);

-- Which workouts are scheduled in a program (week + day)
create table public.program_workouts (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.programs(id) on delete cascade,
  workout_id  uuid references public.workouts(id),
  week_number int not null,
  day_number  int not null
);

-- Client → program assignments
create table public.program_assignments (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  program_id  uuid references public.programs(id),
  start_date  date,
  end_date    date,
  active      boolean default true,
  created_at  timestamptz default now() not null
);

-- One conversation per client (for direct messaging)
create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  last_message_at  timestamptz,
  created_at       timestamptz default now() not null,
  unique(client_id)
);

-- Messages within a conversation
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_type      text not null check (sender_type in ('coach', 'client')),
  sender_id        uuid not null,
  content          text not null,
  read             boolean default false,
  created_at       timestamptz default now() not null
);

-- Coach tasks (linked to a client optionally)
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete set null,
  assigned_to  uuid references public.profiles(id),
  title        text not null,
  type         text check (type in ('check_in', 'workout', 'nutrition', 'general')) default 'general',
  due_date     date,
  completed    boolean default false,
  created_at   timestamptz default now() not null
);

-- Client workout completion logs
create table public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  workout_id   uuid references public.workouts(id),
  completed_at timestamptz default now(),
  notes        text,
  created_at   timestamptz default now() not null
);

-- In-app notifications
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text,
  title      text not null,
  body       text,
  read       boolean default false,
  created_at timestamptz default now() not null
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations     enable row level security;
alter table public.profiles          enable row level security;
alter table public.clients           enable row level security;
alter table public.exercises         enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.programs          enable row level security;
alter table public.program_workouts  enable row level security;
alter table public.program_assignments enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.tasks             enable row level security;
alter table public.workout_logs      enable row level security;
alter table public.notifications     enable row level security;

-- Helper: get the current user's org_id
create or replace function public.get_user_org_id()
returns uuid language sql security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- Organizations
create policy "View own org"   on public.organizations for select using (id = get_user_org_id());
create policy "Update own org" on public.organizations for update using (owner_id = auth.uid());

-- Profiles
create policy "View org profiles"   on public.profiles for select using (org_id = get_user_org_id() or id = auth.uid());
create policy "Insert own profile"  on public.profiles for insert with check (id = auth.uid());
create policy "Update own profile"  on public.profiles for update using (id = auth.uid());

-- Clients
create policy "View org clients"    on public.clients for select using (org_id = get_user_org_id());
create policy "Insert org clients"  on public.clients for insert with check (org_id = get_user_org_id());
create policy "Update org clients"  on public.clients for update using (org_id = get_user_org_id());
create policy "Delete org clients"  on public.clients for delete using (org_id = get_user_org_id());

-- Exercises
create policy "View org exercises"   on public.exercises for select using (org_id = get_user_org_id());
create policy "Insert org exercises" on public.exercises for insert with check (org_id = get_user_org_id());
create policy "Update org exercises" on public.exercises for update using (org_id = get_user_org_id());
create policy "Delete org exercises" on public.exercises for delete using (org_id = get_user_org_id());

-- Workouts
create policy "View org workouts"   on public.workouts for select using (org_id = get_user_org_id());
create policy "Insert org workouts" on public.workouts for insert with check (org_id = get_user_org_id());
create policy "Update org workouts" on public.workouts for update using (org_id = get_user_org_id());
create policy "Delete org workouts" on public.workouts for delete using (org_id = get_user_org_id());

-- Workout exercises (scoped via workout)
create policy "View workout exercises"   on public.workout_exercises for select using (
  workout_id in (select id from public.workouts where org_id = get_user_org_id())
);
create policy "Manage workout exercises" on public.workout_exercises for all using (
  workout_id in (select id from public.workouts where org_id = get_user_org_id())
);

-- Workout sets (scoped via workout_exercise)
create policy "View workout sets"   on public.workout_sets for select using (
  workout_exercise_id in (
    select we.id from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.org_id = get_user_org_id()
  )
);
create policy "Manage workout sets" on public.workout_sets for all using (
  workout_exercise_id in (
    select we.id from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.org_id = get_user_org_id()
  )
);

-- Programs
create policy "View org programs"   on public.programs for select using (org_id = get_user_org_id());
create policy "Insert org programs" on public.programs for insert with check (org_id = get_user_org_id());
create policy "Update org programs" on public.programs for update using (org_id = get_user_org_id());
create policy "Delete org programs" on public.programs for delete using (org_id = get_user_org_id());

-- Program workouts
create policy "View program workouts"   on public.program_workouts for select using (
  program_id in (select id from public.programs where org_id = get_user_org_id())
);
create policy "Manage program workouts" on public.program_workouts for all using (
  program_id in (select id from public.programs where org_id = get_user_org_id())
);

-- Program assignments
create policy "View program assignments"   on public.program_assignments for select using (
  client_id in (select id from public.clients where org_id = get_user_org_id())
);
create policy "Manage program assignments" on public.program_assignments for all using (
  client_id in (select id from public.clients where org_id = get_user_org_id())
);

-- Conversations
create policy "View org conversations"   on public.conversations for select using (org_id = get_user_org_id());
create policy "Insert org conversations" on public.conversations for insert with check (org_id = get_user_org_id());

-- Messages
create policy "View conversation messages"   on public.messages for select using (
  conversation_id in (select id from public.conversations where org_id = get_user_org_id())
);
create policy "Insert conversation messages" on public.messages for insert with check (
  conversation_id in (select id from public.conversations where org_id = get_user_org_id())
);
create policy "Update conversation messages" on public.messages for update using (
  conversation_id in (select id from public.conversations where org_id = get_user_org_id())
);

-- Tasks
create policy "View org tasks"   on public.tasks for select using (org_id = get_user_org_id());
create policy "Insert org tasks" on public.tasks for insert with check (org_id = get_user_org_id());
create policy "Update org tasks" on public.tasks for update using (org_id = get_user_org_id());
create policy "Delete org tasks" on public.tasks for delete using (org_id = get_user_org_id());

-- Workout logs
create policy "View client workout logs"   on public.workout_logs for select using (
  client_id in (select id from public.clients where org_id = get_user_org_id())
);
create policy "Insert client workout logs" on public.workout_logs for insert with check (
  client_id in (select id from public.clients where org_id = get_user_org_id())
);

-- Notifications
create policy "View own notifications"   on public.notifications for select using (user_id = auth.uid());
create policy "Update own notifications" on public.notifications for update using (user_id = auth.uid());

-- ============================================================
-- TRIGGER: Auto-create org + profile on first signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
  user_name  text;
  user_init  text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  user_init := upper(left(regexp_replace(user_name, '[^A-Za-z ]', '', 'g'), 1))
            || upper(substring(regexp_replace(user_name, '[^A-Za-z ]', '', 'g') from '[ ][A-Za-z]'));
  user_init := left(user_init, 2);

  insert into public.organizations (name, owner_id)
  values (
    coalesce(new.raw_user_meta_data->>'org_name', user_name || '''s Coaching'),
    new.id
  )
  returning id into new_org_id;

  insert into public.profiles (id, org_id, full_name, initials, role)
  values (new.id, new_org_id, user_name, user_init, 'owner');

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- REALTIME: Enable for messages + notifications
-- ============================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
