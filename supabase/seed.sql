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

-- Sample roster (adjust to your real classes)
insert into public.CLASS_students (grade, class_name, seat_no, name, seat_index, score) values
  ('1', '年1班', '1', '王小明', 1, 0),
  ('1', '年1班', '2', '李小華', 2, 0),
  ('1', '年1班', '3', '張大同', 3, 0),
  ('1', '年1班', '4', '陳美美', 4, 0),
  ('1', '年1班', '5', '林志偉', 5, 0)
on conflict do nothing;
