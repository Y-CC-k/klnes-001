-- Schema for 班級點名系統 (Class Attendance System)
-- Run this in Supabase SQL Editor after creating your project.

-- Teachers profile (linked to Supabase Auth)
create table if not exists public.CLASS_teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  created_at timestamptz default now()
);

-- Roster (名冊)
create table if not exists public.CLASS_students (
  id bigserial primary key,
  grade text not null,
  class_name text not null,
  seat_no text not null,
  name text not null,
  seat_index int,
  score int default 0,
  full_class_name text generated always as (grade || class_name) stored,
  unique (grade, class_name, seat_no, name)
);

-- Attendance log (點名紀錄)
create table if not exists public.CLASS_attendance (
  id bigserial primary key,
  recorded_at timestamptz default now(),
  grade text not null,
  class_name text not null,
  seat_no text not null,
  name text not null,
  status text not null,
  full_class_name text generated always as (grade || class_name) stored
);

-- Points log (加分紀錄)
create table if not exists public.CLASS_points_log (
  id bigserial primary key,
  recorded_at timestamptz default now(),
  grade text not null,
  class_name text not null,
  seat_no text not null,
  name text not null,
  points int not null,
  reason text,
  full_class_name text generated always as (grade || class_name) stored
);

-- Student state overlay (scores + seat positions) for school_students
create table if not exists public.CLASS_student_state (
  student_id uuid primary key,
  score int default 0,
  seat_index int,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.CLASS_teachers enable row level security;
alter table public.CLASS_students enable row level security;
alter table public.CLASS_attendance enable row level security;
alter table public.CLASS_points_log enable row level security;

-- Policies: any authenticated user (teacher) has full access (matches original: any valid teacher accesses all classes)
create policy "teachers read own" on public.CLASS_teachers for select to authenticated using (auth.uid() = id);
create policy "teachers update own" on public.CLASS_teachers for update to authenticated using (auth.uid() = id);

create policy "auth all students" on public.CLASS_students for all to authenticated using (true) with check (true);
create policy "auth all attendance" on public.CLASS_attendance for all to authenticated using (true) with check (true);
create policy "auth all points_log" on public.CLASS_points_log for all to authenticated using (true) with check (true);
create policy "auth all student_state" on public.CLASS_student_state for all to authenticated using (true) with check (true);

-- Indexes
create index if not exists idx_students_class on public.CLASS_students(full_class_name);
create index if not exists idx_attendance_class_date on public.CLASS_attendance(full_class_name, recorded_at);
create index if not exists idx_points_class on public.CLASS_points_log(full_class_name);
