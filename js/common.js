// Shared helpers for the class attendance system (Supabase backend)

// ---------- Supabase client ----------
const { createClient } = supabase;
window.sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// ---------- Auth helpers ----------
function accountToEmail(acc) {
  return acc.includes('@') ? acc : acc + '@school.local';
}

async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function getTeacher() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await sb.from('CLASS_teachers').select('*').eq('id', session.user.id).single();
  return data;
}

async function verifyLogin() {
  const acc = document.getElementById('accountInput').value.trim();
  const pwd = document.getElementById('passwordInput').value.trim();
  if (!acc || !pwd) return alert('請完整輸入帳號與密碼！');

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 驗證中...';

  const { error } = await sb.auth.signInWithPassword({ email: accountToEmail(acc), password: pwd });

  loginBtn.disabled = false;
  loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> 登入系統';

  if (error) {
    alert('登入失敗：\n' + error.message);
    document.getElementById('passwordInput').value = '';
    return;
  }
  sessionStorage.setItem('userAccount', acc);
  await initPage();
}

async function logout() {
  await sb.auth.signOut();
  sessionStorage.clear();
  location.reload();
}

// ---------- Page init ----------
async function initPage() {
  const session = await getSession();
  if (!session) return false;

  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'none';
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';

  const teacher = await getTeacher();
  const name = teacher ? (teacher.name || teacher.username) : session.user.email;
  const teacherDisplay = document.getElementById('teacherNameDisplay');
  if (teacherDisplay) {
    teacherDisplay.innerHTML = `<i class="fa-solid fa-user-tie"></i> ${name}`;
    teacherDisplay.style.display = 'inline-block';
  }
  sessionStorage.setItem('teacherName', name);

  await fetchClassListIntoSelect();
  return true;
}

// ---------- Helpers for school_students ----------
function parseClassName(fullClassName) {
  // "5年1班" -> { grade: 5, classNum: 1 }
  const m = String(fullClassName).match(/^(\d+)年(\d+)班$/);
  if (!m) return null;
  return { grade: Number(m[1]), classNum: Number(m[2]) };
}

function classDisplayName(grade, classNum) {
  return `${grade}年${classNum}班`;
}

// ---------- Data helpers ----------
async function fetchClassList() {
  const { data, error } = await sb.from('school_students').select('grade, class');
  if (error) throw error;
  const set = new Set((data || []).map(r => classDisplayName(r.grade, r.class)));
  return Array.from(set).filter(Boolean).sort();
}

async function fetchClassListIntoSelect() {
  const select = document.getElementById('classSelect');
  if (!select) return;
  select.innerHTML = '<option value="">載入中...</option>';
  try {
    const classes = await fetchClassList();
    select.innerHTML = '<option value="">-- 班別 --</option>';
    classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.innerText = c;
      select.appendChild(opt);
    });
  } catch (e) {
    alert('載入班別失敗：' + e.message);
  }
}

function todayRangeISO() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function getMembersByClass(fullClassName) {
  const parsed = parseClassName(fullClassName);
  if (!parsed) throw new Error('班級格式錯誤：' + fullClassName);

  const { data: students, error: sErr } = await sb.from('school_students')
    .select('*')
    .eq('grade', parsed.grade)
    .eq('class', parsed.classNum);
  if (sErr) throw sErr;

  const ids = (students || []).map(s => s.id);
  let stateMap = {};
  if (ids.length > 0) {
    const { data: states } = await sb.from('CLASS_student_state').select('*').in('student_id', ids);
    (states || []).forEach(st => { stateMap[st.student_id] = st; });
  }

  const { start, end } = todayRangeISO();
  const { data: att } = await sb.from('CLASS_attendance').select('*')
    .eq('full_class_name', fullClassName)
    .gte('recorded_at', start).lt('recorded_at', end);

  const attMap = {};
  (att || []).forEach(r => {
    attMap[`${r.grade}_${r.class_name}_${r.seat_no}_${r.name}`] = r.status;
  });

  return (students || []).map((s, idx) => {
    const st = stateMap[s.id] || {};
    const gradeStr = String(s.grade);
    const className = `年${s.class}班`;
    const seatNo = String(s.seat_no);
    const name = s.name;
    const key = `${gradeStr}_${className}_${seatNo}_${name}`;
    const seatIndex = st.seat_index || s.seat_no || (idx + 1);
    const currentScore = (typeof st.score === 'number') ? st.score : 0;
    return {
      grade: gradeStr,
      className: className,
      seatNo: seatNo,
      name: name,
      seatIndex: seatIndex,
      currentScore: currentScore,
      fullClassName: fullClassName,
      status: attMap[key] || '出席',
      hasTodayRecord: !!attMap[key],
      _id: s.id
    };
  });
}

async function submitBatchAttendance(members) {
  const rows = members.map(m => ({
    grade: m.grade,
    class_name: m.className,
    seat_no: m.seatNo,
    name: m.name,
    status: m.status,
    full_class_name: m.fullClassName
  }));
  const { error } = await sb.from('CLASS_attendance').insert(rows);
  if (error) throw error;
  return { success: true, count: rows.length };
}

async function submitBatchPoints(members) {
  let updatedCount = 0;
  const logRows = [];
  for (const m of members) {
    if (m.points !== 0) {
      const newScore = m.currentScore + m.points;
      const { error } = await sb.from('CLASS_student_state').upsert({
        student_id: m._id,
        score: newScore,
        seat_index: m.seatIndex
      }, { onConflict: 'student_id' });
      if (error) throw error;
      logRows.push({
        grade: m.grade,
        class_name: m.className,
        seat_no: m.seatNo,
        name: m.name,
        points: m.points,
        reason: m.reason || '未填寫',
        full_class_name: m.fullClassName
      });
      updatedCount++;
    }
  }
  if (logRows.length > 0) {
    const { error } = await sb.from('CLASS_points_log').insert(logRows);
    if (error) throw error;
  }
  return { success: true, count: updatedCount };
}

async function updateSeatMap(fullClassName, seatList) {
  // Need current score for each student to preserve; fetch state
  const parsed = parseClassName(fullClassName);
  const { data: students } = await sb.from('school_students')
    .select('id, seat_no, name').eq('grade', parsed.grade).eq('class', parsed.classNum);
  const idByNameSeat = {};
  (students || []).forEach(s => { idByNameSeat[`${s.seat_no}_${s.name}`] = s.id; });

  // fetch existing state for scores
  const ids = Object.values(idByNameSeat);
  let scoreMap = {};
  if (ids.length > 0) {
    const { data: states } = await sb.from('CLASS_student_state').select('*').in('student_id', ids);
    (states || []).forEach(st => { scoreMap[st.student_id] = st.score; });
  }

  for (const item of seatList) {
    const sid = idByNameSeat[`${item.seatNo}_${item.name}`];
    if (!sid) continue;
    const { error } = await sb.from('CLASS_student_state').upsert({
      student_id: sid,
      seat_index: item.seatIndex,
      score: (typeof scoreMap[sid] === 'number') ? scoreMap[sid] : 0
    }, { onConflict: 'student_id' });
    if (error) throw error;
  }
  return { success: true };
}

// ---------- Navigation ----------
function navigateToPage(pageName) {
  const map = { Attendance: 'index.html', Points: 'points.html', Picker: 'picker.html', SeatMap: 'seatmap.html' };
  location.href = map[pageName] || 'index.html';
}

// ---------- Auto init on load ----------
window.addEventListener('DOMContentLoaded', async () => {
  await initPage();
});
