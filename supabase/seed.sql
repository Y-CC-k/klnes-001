-- Seed data. Run AFTER creating the teacher user in Supabase Auth.
-- 1) Supabase Dashboard -> Authentication -> Users -> Add user
--    Email: teacher01@school.local   Password: pass123   (auto-confirm)
-- 2) Run this script.

-- Teacher profile
insert into public.CLASS_teachers (id, username, name)
select id, 'teacher01', 'teacher01'
from auth.users
where email = 'teacher01@school.local'
on conflict (id) do nothing;

-- Note: student roster is read from the existing public.school_students table.
-- No sample roster is seeded here. Scores/seat positions are stored in
-- public.CLASS_student_state and created on demand.
