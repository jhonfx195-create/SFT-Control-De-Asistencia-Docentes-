// ===== LOGIN =====
const loginOverlay = document.getElementById('loginOverlay');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const togglePw = document.getElementById('togglePw');
const roleAdmin = document.getElementById('roleAdmin');
const roleDocente = document.getElementById('roleDocente');

roleAdmin.addEventListener('click', () => {
  roleAdmin.classList.add('active');
  roleDocente.classList.remove('active');
});
roleDocente.addEventListener('click', () => {
  roleDocente.classList.add('active');
  roleAdmin.classList.remove('active');
});

togglePw.addEventListener('click', () => {
  const inp = document.getElementById('loginPassword');
  const icon = togglePw.querySelector('i');
  if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
});

btnLogin.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rol = document.querySelector('.role-btn.active')?.dataset.role;

  if (!email || !password) {
    alert('Por favor ingrese correo y contraseña');
    return;
  }

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rol })
    });
    const data = await resp.json();

    if (!resp.ok) {
      alert(data.error || 'Error al iniciar sesión');
      return;
    }

    // Login exitoso — actualizar UI con datos del usuario
    loginOverlay.classList.add('hidden');
    const u = data.usuario;
    document.querySelector('.header-user .name').textContent = u.nombre;
    document.querySelector('.header-user .role').textContent = u.rol === 'admin' ? 'Super Administrador' : 'Docente';
    document.querySelector('.header-user .avatar').textContent = u.nombre.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    console.log('✅ Sesión iniciada:', u.nombre, '(' + u.rol + ')');
  } catch (err) {
    alert('Error de conexión con el servidor');
    console.error(err);
  }
});

btnLogout.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) { /* ignorar */ }
  loginOverlay.classList.remove('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
});

// ===== NAVIGATION =====
const navItems = document.querySelectorAll('#sidebarNav .nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.page;
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + target).classList.add('active');
    // Lazy load pages
    if (target === 'asistencia') cargarPanelDocente();
    if (target === 'docentes') { cargarDocentes(); initBusquedaDocentes(); }
    if (target === 'horarios') cargarHorarios();
    if (target === 'notificaciones') loadNotificaciones();
    if (target === 'reportes') loadReportes();
    if (target === 'justificaciones') cargarJustificaciones();
  });
});




// ===== NOTIFICACIONES PAGE =====
function loadNotificaciones() {
  const el = document.getElementById('notificacionesContent');
  if (el.dataset.loaded) return;
  el.dataset.loaded = '1';
  el.innerHTML = `
    <div class="page-header">
      <div><h1>Notifications Center</h1><p>Manage and respond to academic attendance alerts.</p></div>
      <div style="display:flex;border:1px solid var(--border-color);border-radius:var(--radius-full);overflow:hidden;">
        <button class="btn btn-primary" style="border-radius:var(--radius-full);">All</button>
        <button class="btn btn-outline" style="border:none;">Unread</button>
        <button class="btn btn-outline" style="border:none;">System</button>
      </div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
      <div class="stat-card"><div><div class="stat-icon blue"><i class="fas fa-user-check"></i></div><div class="stat-label" style="margin-top:12px;">Attendance Rate</div><div class="stat-value">94.2%</div><div class="stat-change up">↗ +2.4% vs last week</div></div></div>
      <div class="stat-card" style="border-color:var(--accent-yellow);"><div><div class="stat-icon yellow"><i class="fas fa-triangle-exclamation"></i></div><div class="stat-label" style="margin-top:12px;">Urgent Absences</div><div class="stat-value">08</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Teachers with >20m delay</div></div></div>
      <div class="stat-card"><div><div class="stat-icon blue"><i class="fas fa-clock"></i></div><div class="stat-label" style="margin-top:12px;">Reports Due</div><div class="stat-value">14:00</div><div style="font-size:12px;color:var(--accent-blue);margin-top:4px;">Daily sync in 45 mins</div></div></div>
    </div>
    <div class="table-container" style="padding:0;">
      <div class="table-header"><h3>Recent Alerts</h3><a href="#" style="color:var(--accent-blue);">Mark all as read</a></div>
      <div style="padding:0;">
        ${notifItem('fas fa-bell','red','Critical Delay: Ing. Carlos Meza','Room 302 - Engineering Faculty. Absence exceeds <strong style="color:var(--accent-yellow);">22 minutes</strong> from the scheduled start (08:00 AM).','2m ago',['URGENT|red','ATTENDANCE|gray'])}
        ${notifItem('fas fa-user-check','blue','Attendance Verified: Dra. Maria Veloz','Registered arrival at 08:04 AM for "Academic Writing" in Auditorium 1.','15m ago',['PRESENT|green'])}
        ${notifItem('fas fa-info-circle','yellow','System Maintenance Notice','Database synchronization scheduled for tonight at 23:00. Reports generation may be delayed.','1h ago',['SYSTEM|green'])}
        ${notifItem('fas fa-user-xmark','red','Unjustified Absence: Lcdo. Juan Toro','Class "Physical Education" failed to start at 07:00 AM. No justification uploaded.','2h ago',['ABSENT|red','REVIEW PENDING|gray'])}
      </div>
      <div style="text-align:center;padding:16px;"><button class="btn btn-outline">Load Older Notifications</button></div>
    </div>
  `;
}

function notifItem(icon, color, title, desc, time, badges) {
  const bdg = badges.map(b => { const [t,c] = b.split('|'); return `<span class="badge badge-${c}">${t}</span>`; }).join(' ');
  return `<div style="display:flex;gap:16px;padding:20px;border-bottom:1px solid var(--border-color);align-items:flex-start;">
    <div style="width:44px;height:44px;border-radius:50%;background:rgba(${color==='red'?'239,68,68':color==='blue'?'59,130,246':'234,179,8'},0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="${icon}" style="color:var(--accent-${color});"></i></div>
    <div style="flex:1;"><strong>${title}</strong><p style="font-size:13px;color:var(--text-secondary);margin:4px 0 8px;">${desc}</p><div style="display:flex;gap:6px;">${bdg}</div></div>
    <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">${time}</span>
  </div>`;
}

// ===== REPORTES PAGE =====
function loadReportes() {
  const el = document.getElementById('reportesContent');
  if (el.dataset.loaded) return;
  el.dataset.loaded = '1';
  el.innerHTML = `
    <div class="page-header"><div><h1>Reportes y Analítica</h1></div></div>
    <div class="card" style="margin-bottom:24px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;align-items:end;">
        <div><label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">Rango de Fechas</label><div style="background:var(--bg-input);padding:10px 14px;border-radius:var(--radius-md);display:flex;align-items:center;gap:8px;"><i class="fas fa-calendar" style="color:var(--text-muted);"></i> Oct 01 - Oct 31, 2023</div></div>
        <div><label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">Facultad</label><select style="width:100%;background:var(--bg-input);color:var(--text-primary);padding:10px 14px;border-radius:var(--radius-md);border:1px solid var(--border-color);"><option>Todas las Facultades</option></select></div>
        <div><label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">Nombre del Docente</label><div style="background:var(--bg-input);padding:10px 14px;border-radius:var(--radius-md);display:flex;align-items:center;gap:8px;"><i class="fas fa-search" style="color:var(--text-muted);"></i><input style="background:transparent;color:var(--text-primary);border:none;outline:none;width:100%;" placeholder="Buscar por nombre..."></div></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button class="btn btn-outline"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
        <button class="btn btn-primary"><i class="fas fa-file-excel"></i> Exportar Excel</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px;margin-bottom:24px;">
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;"><div><h3>Índice de Puntualidad por Facultad</h3><p style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Porcentaje de llegadas a tiempo por departamento</p></div><i class="fas fa-chart-bar" style="font-size:24px;color:var(--accent-blue);"></i></div>
        ${barItem('Ciencias de la Computación',94,'blue')}
        ${barItem('Administración de Empresas',82,'yellow')}
        ${barItem('Ingeniería Mecánica',88,'blue')}
        ${barItem('Ciencias Sociales',91,'blue')}
        ${barItem('Facultad de Medicina',79,'yellow')}
      </div>
      <div>
        <div class="card" style="margin-bottom:16px;text-align:center;">
          <h3 style="text-align:left;">Asistencia General</h3>
          <div style="width:160px;height:160px;border-radius:50%;background:conic-gradient(var(--accent-blue) 0% 75%, var(--accent-yellow) 75% 90%, var(--accent-red) 90% 100%);margin:24px auto;display:flex;align-items:center;justify-content:center;position:relative;">
            <div style="width:110px;height:110px;background:var(--bg-card);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;"><strong style="font-size:28px;">88%</strong><small style="color:var(--text-secondary);font-size:11px;">Promedio Global</small></div>
          </div>
          <div style="text-align:left;display:flex;flex-direction:column;gap:8px;margin-top:16px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent-blue);margin-right:8px;"></span>Presente</span><strong>75%</strong></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent-yellow);margin-right:8px;"></span>Justificado</span><strong>15%</strong></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent-red);margin-right:8px;"></span>Ausente</span><strong>10%</strong></div>
          </div>
        </div>
        <div class="card" style="background:linear-gradient(135deg,rgba(34,197,94,0.1),rgba(34,197,94,0.05));border-color:rgba(34,197,94,0.3);">
          <div style="display:flex;justify-content:space-between;"><div><div style="font-size:11px;color:var(--accent-green);text-transform:uppercase;font-weight:700;letter-spacing:1px;">Crecimiento Mensual</div><div style="font-size:32px;font-weight:800;margin-top:4px;">+4.2%</div><p style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Mejora de consistencia desde Sept</p></div><i class="fas fa-chart-line" style="font-size:28px;color:var(--accent-green);opacity:0.5;"></i></div>
        </div>
      </div>
    </div>
  `;
}

function barItem(name, pct, color) {
  return `<div style="margin-bottom:16px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span>${name}</span><strong>${pct}%</strong></div><div style="height:8px;background:var(--bg-input);border-radius:4px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--accent-${color});border-radius:4px;"></div></div></div>`;
}


