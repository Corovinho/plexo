/*
# Create Pulse App Tables (single-tenant, no auth)

1. New Tables
  - `goals`
    - `id` (uuid, primary key)
    - `text` (text, not null)
    - `completed` (boolean, default false)
    - `category` (text, not null) — one of 'daily', 'weekly', 'tasks'
    - `created_at` (timestamptz, default now)
  - `schedule_events`
    - `id` (uuid, primary key)
    - `day` (integer, not null) — 0=Mon through 6=Sun
    - `start_time` (text, not null)
    - `end_time` (text, not null)
    - `category` (text, not null)
    - `title` (text, not null)
    - `custom_color` (text, nullable)
    - `created_at` (timestamptz, default now)
  - `flashcards`
    - `id` (uuid, primary key)
    - `front` (text, not null)
    - `back` (text, not null)
    - `next_review` (text, not null) — ISO date string
    - `interval` (integer, not null, default 1)
    - `created_at` (timestamptz, default now)
  - `urgent_tasks`
    - `id` (uuid, primary key)
    - `text` (text, not null)
    - `completed` (boolean, default false)
    - `created_at` (timestamptz, default now)

2. Security
  - Enable RLS on all tables.
  - Allow anon + authenticated full CRUD because this is a single-tenant app with no sign-in.

3. Notes
  - This app has no authentication; all data is shared/public.
  - Policies use USING (true) intentionally for single-tenant access.
*/

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  category text NOT NULL CHECK (category IN ('daily', 'weekly', 'tasks')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_goals" ON goals;
CREATE POLICY "anon_select_goals" ON goals FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_goals" ON goals;
CREATE POLICY "anon_insert_goals" ON goals FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_goals" ON goals;
CREATE POLICY "anon_update_goals" ON goals FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_goals" ON goals;
CREATE POLICY "anon_delete_goals" ON goals FOR DELETE
  TO anon, authenticated USING (true);

-- Schedule Events table
CREATE TABLE IF NOT EXISTS schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day integer NOT NULL CHECK (day >= 0 AND day <= 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  custom_color text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_schedule_events" ON schedule_events;
CREATE POLICY "anon_select_schedule_events" ON schedule_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_schedule_events" ON schedule_events;
CREATE POLICY "anon_insert_schedule_events" ON schedule_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_schedule_events" ON schedule_events;
CREATE POLICY "anon_update_schedule_events" ON schedule_events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_schedule_events" ON schedule_events;
CREATE POLICY "anon_delete_schedule_events" ON schedule_events FOR DELETE
  TO anon, authenticated USING (true);

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  front text NOT NULL,
  back text NOT NULL,
  next_review text NOT NULL,
  interval integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_flashcards" ON flashcards;
CREATE POLICY "anon_select_flashcards" ON flashcards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_flashcards" ON flashcards;
CREATE POLICY "anon_insert_flashcards" ON flashcards FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_flashcards" ON flashcards;
CREATE POLICY "anon_update_flashcards" ON flashcards FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_flashcards" ON flashcards;
CREATE POLICY "anon_delete_flashcards" ON flashcards FOR DELETE
  TO anon, authenticated USING (true);

-- Urgent Tasks table
CREATE TABLE IF NOT EXISTS urgent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE urgent_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_urgent_tasks" ON urgent_tasks;
CREATE POLICY "anon_select_urgent_tasks" ON urgent_tasks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_urgent_tasks" ON urgent_tasks;
CREATE POLICY "anon_insert_urgent_tasks" ON urgent_tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_urgent_tasks" ON urgent_tasks;
CREATE POLICY "anon_update_urgent_tasks" ON urgent_tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_urgent_tasks" ON urgent_tasks;
CREATE POLICY "anon_delete_urgent_tasks" ON urgent_tasks FOR DELETE
  TO anon, authenticated USING (true);
