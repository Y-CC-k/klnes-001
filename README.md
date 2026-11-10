# 班級點名系統 (Class Attendance System)

Originally a Google Apps Script + Google Sheets app, ported to a static web app
hosted on GitHub Pages with Supabase (Postgres + Auth) as the backend.

This folder is self-contained. Move its contents to a repo root for GitHub Pages,
or publish the subfolder via GitHub Actions.

Features:
- 教師登入 (Supabase Auth)
- 點名 (Attendance) — cycle 出席/遲到/請假/缺席, submit/update today's record
- 加分 (Points) — +1/-1 points with reason presets, persisted to roster score + log
- 隨機抽籤 (Picker)
- 座位表 (SeatMap) — seat assignment + attendance submit

## Setup

### 1. Supabase

1. Create a project at https://supabase.com
2. SQL Editor → run `supabase/schema.sql`
3. Authentication → Users → Add user:
   - Email: `teacher01@school.local`
   - Password: `pass123`
   - Auto Confirm User: on
4. SQL Editor → run `supabase/seed.sql`
5. Project Settings → API → copy `Project URL` and `anon public` key.

### 2. Configure frontend

Edit `js/config.js`:

```js
window.SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
window.SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
```

### 3. Run locally

Any static server, e.g.:

```bash
python -m http.server 8000
# or
npx serve .
```

Open http://localhost:8000

### 4. Deploy to GitHub Pages

This folder is self-contained. For a dedicated repo, copy its contents to the
repo root:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then GitHub repo → Settings → Pages → Source: Deploy from branch `main` / root.

Your site: `https://<you>.github.io/<repo>/`

If you keep it inside another repo (e.g. `class-attendance/`), use a GitHub
Actions workflow to publish that subfolder, or move it to its own repository.

## Notes

- Account input accepts a username (e.g. `teacher01`) which maps to
  `teacher01@school.local`, or a full email.
- RLS is enabled; any authenticated teacher has full access to all classes,
  matching the original app's behavior.
- Student roster is read from the existing `public.school_students` table
  (grade, class, seat_no, name). Scores/seat positions are stored in
  `public.CLASS_student_state`.
- To add more teachers, create them in Supabase Auth and insert a row into
  `public.CLASS_teachers`.
