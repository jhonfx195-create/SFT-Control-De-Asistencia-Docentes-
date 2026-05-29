// ===== LOGIN =====
const loginOverlay = document.getElementById('loginOverlay');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const togglePw = document.getElementById('togglePw');
const roleAdmin = document.getElementById('roleAdmin');
const roleDocente = document.getElementById('roleDocente');

// Guardar info del usuario logueado en la variable compartida
usuarioActual = null;

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
  const errorDiv = document.getElementById('loginError');
  const errorMsg = document.getElementById('loginErrorMsg');

  // Ocultar error previo
  errorDiv.style.display = 'none';

  if (!email || !password) {
    mostrarErrorLogin('Por favor ingrese correo y contraseña');
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
      mostrarErrorLogin(data.error || 'Error al iniciar sesión');
      return;
    }

    usuarioActual = data.usuario;
    if (typeof setUsuarioActual === 'function') {
      setUsuarioActual(usuarioActual);
    }
    errorDiv.style.display = 'none';
    loginOverlay.classList.add('hidden');
    document.querySelector('.header-user .name').textContent = usuarioActual.nombre;
    document.querySelector('.header-user .role').textContent = usuarioActual.rol === 'admin' ? 'Super Administrador' : 'Docente';
    document.querySelector('.header-user .avatar').textContent = usuarioActual.nombre.split(' ').filter(w=>w.length>1).map(w => w[0]).join('').substring(0, 2).toUpperCase();

    aplicarVisibilidadRol(usuarioActual.rol);
    cargarDashboard();
    mostrarToast('success', 'Sesión Iniciada', 'Bienvenido/a, ' + usuarioActual.nombre);
    console.log('✅ Sesión iniciada:', usuarioActual.nombre, '(' + usuarioActual.rol + ')');
  } catch (err) {
    mostrarErrorLogin('Error de conexión con el servidor');
    console.error(err);
  }
});

function mostrarErrorLogin(msg) {
  const errorDiv = document.getElementById('loginError');
  const errorMsg = document.getElementById('loginErrorMsg');
  errorMsg.textContent = msg;
  errorDiv.style.display = 'flex';
  // Re-trigger animation
  errorDiv.style.animation = 'none';
  errorDiv.offsetHeight; // force reflow
  errorDiv.style.animation = '';
}

// ===== TOAST NOTIFICATIONS =====
function mostrarToast(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById('toastContainer');
  const iconos = { success: 'fas fa-check-circle', error: 'fas fa-times-circle', warning: 'fas fa-exclamation-triangle', info: 'fas fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = 'toast ' + tipo;
  toast.innerHTML = `
    <div class="toast-icon"><i class="${iconos[tipo] || iconos.info}"></i></div>
    <div class="toast-body"><strong>${titulo}</strong><span>${mensaje}</span></div>
    <button class="toast-close" onclick="this.parentElement.classList.add('removing');setTimeout(()=>this.parentElement.remove(),300)"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, duracion);
}

btnLogout.addEventListener('click', async () => {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
  usuarioActual = null;
  if (typeof setUsuarioActual === 'function') {
    setUsuarioActual(null);
  }
  loginOverlay.classList.remove('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  // Reset dashboard loaded flag
  const dc = document.getElementById('dashboardContent');
  if (dc) dc.removeAttribute('data-loaded');
});

// ===== VISIBILIDAD POR ROL =====
function aplicarVisibilidadRol(rol) {
  const navItems = document.querySelectorAll('#sidebarNav .nav-item');
  const paginasAdmin = ['dashboard', 'docentes', 'horarios', 'justificaciones', 'notificaciones', 'reportes'];
  const paginasDocente = ['dashboard', 'asistencia', 'horarios', 'justificaciones'];

  const visibles = rol === 'admin' ? paginasAdmin : paginasDocente;

  navItems.forEach(item => {
    const page = item.dataset.page;
    if (visibles.includes(page)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });

  // Activar dashboard como default
  navItems.forEach(n => n.classList.remove('active'));
  document.querySelector('[data-page="dashboard"]').classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-dashboard').classList.add('active');
}

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
    if (target === 'dashboard') cargarDashboard();
    if (target === 'asistencia') cargarPanelDocente();
    if (target === 'docentes') { cargarDocentes(); initBusquedaDocentes(); }
    if (target === 'horarios') cargarHorarios();
    if (target === 'justificaciones') cargarJustificaciones();
    if (target === 'notificaciones') loadNotificaciones();
    if (target === 'reportes') loadReportes();
  });
});

// ===== DASHBOARD DINÁMICO =====
async function cargarDashboard() {
  const container = document.getElementById('dashboardContent');
  if (!container) return;

  try {
    const resp = await fetch('/api/dashboard');
    const d = await resp.json();
    if (!resp.ok) throw new Error(d.error);

    const hoy = d.hoy;
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const fechaObj = new Date(d.fecha + 'T12:00:00');
    const fechaFmt = `${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]}, ${fechaObj.getFullYear()}`;

    // Calcular porcentajes globales
    const g = d.global;
    const pctPresente = g.total > 0 ? Math.round((g.presentes/g.total)*100) : 0;
    const pctAtraso = g.total > 0 ? Math.round((g.atrasos/g.total)*100) : 0;
    const pctAusente = g.total > 0 ? Math.round((g.ausentes/g.total)*100) : 0;
    const pctJustif = g.total > 0 ? Math.round((g.justificados/g.total)*100) : 0;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Panel de Control</h1>
          <p>Seguimiento de presencia docente para el ${fechaFmt}</p>
        </div>
        <div class="header-btns">
          <span class="badge badge-green" style="padding:8px 14px;font-size:12px;"><i class="fas fa-circle" style="font-size:6px;vertical-align:middle;margin-right:4px;"></i> EN VIVO</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div>
            <div class="stat-icon blue"><i class="fas fa-user-check"></i></div>
            <div class="stat-label" style="margin-top:12px;">Asistencia de Hoy</div>
            <div class="stat-value">${hoy.porcentaje}%</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:var(--text-muted);">${hoy.presentes + hoy.atrasos} / ${hoy.total || d.totalDocentes}</div>
          </div>
        </div>
        <div class="stat-card">
          <div>
            <div class="stat-icon yellow"><i class="fas fa-clock"></i></div>
            <div class="stat-label" style="margin-top:12px;">Atrasos Detectados</div>
            <div class="stat-value">${hoy.atrasos || 0}</div>
          </div>
        </div>
        <div class="stat-card">
          <div>
            <div class="stat-icon red"><i class="fas fa-file-circle-exclamation"></i></div>
            <div class="stat-label" style="margin-top:12px;">Justificaciones Pendientes</div>
            <div class="stat-value">${d.justifPendientes}</div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
          <h3>Registros de Asistencia Recientes</h3>
        </div>
        <table>
          <thead><tr><th>Docente</th><th>Facultad</th><th>Fecha</th><th>Programado</th><th>Entrada Real</th><th>Estado</th></tr></thead>
          <tbody>
            ${d.recientes.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No hay registros de asistencia</td></tr>' :
              d.recientes.map(r => {
                const iniciales = r.docente_nombre.split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').substring(0,2).toUpperCase();
                const colores = ['linear-gradient(135deg,#3b82f6,#8b5cf6)','linear-gradient(135deg,#f97316,#eab308)','linear-gradient(135deg,#ec4899,#8b5cf6)','linear-gradient(135deg,#22c55e,#14b8a6)'];
                const color = colores[r.docente_id % colores.length];
                const badgeClass = r.estado === 'presente' ? 'badge-green' : r.estado === 'atraso' ? 'badge-yellow' : r.estado === 'justificado' ? 'badge-blue' : 'badge-red';
                const fArr = r.fecha.split('-');
                const fechaR = fArr[2] + ' ' + meses[parseInt(fArr[1])-1] + ', ' + fArr[0];
                return `<tr>
                  <td><div style="display:flex;align-items:center;gap:10px;"><div class="user-avatar" style="background:${color};">${iniciales}</div><strong>${r.docente_nombre}</strong></div></td>
                  <td>${r.facultad || '—'}</td>
                  <td>${fechaR}</td>
                  <td>${r.hora_programada || '—'}</td>
                  <td ${r.estado==='atraso'?'style="color:var(--accent-red);font-weight:600;"':''}>${r.hora_entrada || '--:--'}</td>
                  <td><span class="badge ${badgeClass}">${r.estado.toUpperCase()}</span></td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">
        <div class="card">
          <h3 style="margin-bottom:16px;">Resumen Global (30 días)</h3>
          <div style="width:140px;height:140px;border-radius:50%;background:conic-gradient(var(--accent-blue) 0% ${pctPresente}%, var(--accent-yellow) ${pctPresente}% ${pctPresente+pctAtraso}%, var(--accent-green) ${pctPresente+pctAtraso}% ${pctPresente+pctAtraso+pctJustif}%, var(--accent-red) ${pctPresente+pctAtraso+pctJustif}% 100%);margin:12px auto;display:flex;align-items:center;justify-content:center;">
            <div style="width:100px;height:100px;background:var(--bg-card);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;"><strong style="font-size:24px;">${g.porcentaje}%</strong><small style="color:var(--text-secondary);font-size:10px;">Puntualidad</small></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent-blue);margin-right:8px;"></span>Presente</span><strong>${pctPresente}%</strong></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent-yellow);margin-right:8px;"></span>Atraso</span><strong>${pctAtraso}%</strong></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent-red);margin-right:8px;"></span>Ausente</span><strong>${pctAusente}%</strong></div>
          </div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:16px;">Estado del Sistema</h3>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);"><span style="width:8px;height:8px;background:var(--accent-green);border-radius:50%;display:inline-block;"></span> EN VIVO</span>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Campus Principal — Manta, Ecuador</p>
          <div style="display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid var(--border-color);">
            <span style="font-size:13px;color:var(--text-secondary);">Docentes Activos</span>
            <span style="font-weight:700;">${d.totalDocentes}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid var(--border-color);">
            <span style="font-size:13px;color:var(--text-secondary);">Registros Hoy</span>
            <span style="font-weight:700;">${hoy.total || 0}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid var(--border-color);">
            <span style="font-size:13px;color:var(--text-secondary);">Justificaciones Pend.</span>
            <span style="font-weight:700;color:var(--accent-yellow);">${d.justifPendientes}</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error cargando dashboard:', err);
  }
}

// ===== NOTIFICACIONES PAGE =====
function loadNotificaciones() {
  const el = document.getElementById('notificacionesContent');
  if (el.dataset.loaded) return;
  el.dataset.loaded = '1';
  el.innerHTML = `
    <div class="page-header">
      <div><h1>Centro de Notificaciones</h1><p>Gestionar alertas de asistencia académica.</p></div>
      <div style="display:flex;border:1px solid var(--border-color);border-radius:var(--radius-full);overflow:hidden;">
        <button class="btn btn-primary" style="border-radius:var(--radius-full);">Todas</button>
        <button class="btn btn-outline" style="border:none;">No Leídas</button>
        <button class="btn btn-outline" style="border:none;">Sistema</button>
      </div>
    </div>
    <div class="table-container" style="padding:0;">
      <div class="table-header"><h3>Alertas Recientes</h3><a href="#" style="color:var(--accent-blue);">Marcar como leídas</a></div>
      <div style="padding:0;">
        ${notifItem('fas fa-bell','red','Atraso Crítico: Ing. Carlos Meza','Sala 302 - Facultad de Ingeniería. La ausencia supera <strong style="color:var(--accent-yellow);">22 minutos</strong> del inicio programado (08:00 AM).','Hace 2m',['URGENTE|red','ASISTENCIA|gray'])}
        ${notifItem('fas fa-user-check','blue','Asistencia Verificada: Dra. Maria Veloz','Registro de llegada a las 08:04 AM para "Redacción Académica" en Auditorio 1.','Hace 15m',['PRESENTE|green'])}
        ${notifItem('fas fa-info-circle','yellow','Aviso de Mantenimiento','Sincronización de base de datos programada para esta noche a las 23:00. La generación de reportes puede retrasarse.','Hace 1h',['SISTEMA|green'])}
        ${notifItem('fas fa-user-xmark','red','Ausencia Injustificada: Lcdo. Juan Toro','La clase "Educación Física" no inició a las 07:00 AM. Sin justificación cargada.','Hace 2h',['AUSENTE|red','REVISIÓN|gray'])}
      </div>
      <div style="text-align:center;padding:16px;"><button class="btn btn-outline">Cargar Notificaciones Anteriores</button></div>
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
    <div class="page-header"><div><h1>Reportes y Analítica</h1><p>Análisis de asistencia por facultad y docente.</p></div></div>
    <div class="card" style="margin-bottom:24px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;align-items:end;">
        <div><label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">Rango de Fechas</label><div style="background:var(--bg-input);padding:10px 14px;border-radius:var(--radius-md);display:flex;align-items:center;gap:8px;"><i class="fas fa-calendar" style="color:var(--text-muted);"></i> Último Mes</div></div>
        <div><label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">Facultad</label><select style="width:100%;background:var(--bg-input);color:var(--text-primary);padding:10px 14px;border-radius:var(--radius-md);border:1px solid var(--border-color);"><option>Todas las Facultades</option></select></div>
        <div><label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">Docente</label><div style="background:var(--bg-input);padding:10px 14px;border-radius:var(--radius-md);display:flex;align-items:center;gap:8px;"><i class="fas fa-search" style="color:var(--text-muted);"></i><input style="background:transparent;color:var(--text-primary);border:none;outline:none;width:100%;" placeholder="Buscar por nombre..."></div></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button class="btn btn-outline"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
        <button class="btn btn-primary"><i class="fas fa-file-excel"></i> Exportar Excel</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px;">
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;"><div><h3>Índice de Puntualidad por Facultad</h3><p style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Porcentaje de llegadas a tiempo</p></div><i class="fas fa-chart-bar" style="font-size:24px;color:var(--accent-blue);"></i></div>
        ${barItem('Ciencias Informáticas',94,'blue')}
        ${barItem('Ciencias Económicas',82,'yellow')}
        ${barItem('Ingeniería Industrial',88,'blue')}
        ${barItem('Ciencias Sociales',91,'blue')}
        ${barItem('Hotelería y Turismo',79,'yellow')}
      </div>
      <div>
        <div class="card" style="background:linear-gradient(135deg,rgba(34,197,94,0.1),rgba(34,197,94,0.05));border-color:rgba(34,197,94,0.3);">
          <div style="display:flex;justify-content:space-between;"><div><div style="font-size:11px;color:var(--accent-green);text-transform:uppercase;font-weight:700;letter-spacing:1px;">Crecimiento Mensual</div><div style="font-size:32px;font-weight:800;margin-top:4px;">+4.2%</div><p style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Mejora de consistencia vs. mes anterior</p></div><i class="fas fa-chart-line" style="font-size:28px;color:var(--accent-green);opacity:0.5;"></i></div>
        </div>
      </div>
    </div>
  `;
}

function barItem(name, pct, color) {
  return `<div style="margin-bottom:16px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span>${name}</span><strong>${pct}%</strong></div><div style="height:8px;background:var(--bg-input);border-radius:4px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--accent-${color});border-radius:4px;"></div></div></div>`;
}
