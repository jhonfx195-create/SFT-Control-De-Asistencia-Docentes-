// ===== PANEL DE ASISTENCIA — Frontend del Docente =====

let usuarioActual = null;

// Se llama tras login exitoso para guardar datos del usuario
function setUsuarioActual(usuario) {
  usuarioActual = usuario;
}

// ===== CARGAR PANEL DE ASISTENCIA DEL DOCENTE =====
async function cargarPanelDocente() {
  const container = document.getElementById('panelDocenteContent');
  if (!container) return;

  try {
    // Obtener datos en paralelo
    const [infoHoy, historial, perfil] = await Promise.all([
      fetch('/api/asistencias/hoy').then(r => r.json()),
      fetch('/api/asistencias/mis').then(r => r.json()),
      fetch('/api/perfil').then(r => r.json())
    ]);

    const u = perfil.usuario;
    const ahora = new Date();
    const horaStr = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    const fechaStr = ahora.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Próximo horario info
    const prox = infoHoy.proximoHorario;
    let turnoHtml = '';
    if (prox) {
      const minFalta = calcularMinutosFaltantes(prox.hora_inicio);
      turnoHtml = `
        <h2 style="font-size:24px;font-weight:700;color:var(--accent-blue);">Turno — ${infoHoy.dia}</h2>
        <p style="color:var(--text-secondary);margin-top:4px;">${prox.materia}</p>
        <p style="color:var(--accent-gold);font-size:13px;font-weight:600;text-transform:uppercase;margin-top:8px;">
          ${minFalta > 0 ? 'LA CLASE INICIA EN ' + minFalta + ' MINUTOS' : 'CLASE EN CURSO'}
        </p>`;
    } else if (infoHoy.yaMarcado) {
      turnoHtml = `
        <h2 style="font-size:24px;font-weight:700;color:var(--accent-green);">✓ Asistencia Completa</h2>
        <p style="color:var(--text-secondary);margin-top:4px;">Ya ha marcado todas sus clases de hoy</p>`;
    } else {
      turnoHtml = `
        <h2 style="font-size:24px;font-weight:700;">Sin Clases Hoy</h2>
        <p style="color:var(--text-secondary);margin-top:4px;">No tiene horarios programados para ${infoHoy.dia}</p>`;
    }

    // Botón de marcar
    const btnDisabled = !prox ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '';
    const btnTexto = infoHoy.yaMarcado ? 'ASISTENCIA COMPLETA' : (prox ? 'MARCAR ASISTENCIA' : 'SIN CLASES HOY');

    // Stats
    const s = historial.stats;
    const iniciales = u.nombre.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').substring(0, 2).toUpperCase();

    container.innerHTML = `
      <div class="page-header">
        <div><h1>Panel de Asistencia</h1></div>
        <div style="display:flex;align-items:center;gap:8px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-full);padding:8px 16px;">
          <span style="width:8px;height:8px;background:var(--accent-green);border-radius:50%;"></span>
          <span style="font-size:13px;">Dentro del Campus</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px;margin-bottom:24px;">
        <!-- Turno actual -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>${turnoHtml}</div>
            <div style="text-align:right;">
              <div style="font-size:32px;font-weight:800;" id="relojDocente">${horaStr}</div>
              <div style="font-size:13px;color:var(--text-secondary);text-transform:capitalize;">${fechaStr}</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:20px;align-items:center;">
            <button class="btn btn-primary" style="padding:14px 28px;font-size:15px;" id="btnMarcarAsistencia" ${btnDisabled} onclick="marcarAsistencia()">
              <i class="fas fa-user-check"></i> ${btnTexto}
            </button>
            ${prox ? `<div style="background:var(--bg-input);border-radius:var(--radius-md);padding:10px 14px;font-size:12px;">
              <span style="color:var(--accent-green);font-weight:600;">● Aula: ${prox.aula || 'N/A'}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Perfil lateral -->
        <div class="card" style="text-align:center;">
          <div style="width:80px;height:80px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:white;border:3px solid var(--accent-gold);${u.foto_url ? `background:url(${u.foto_url}) center/cover;` : 'background:linear-gradient(135deg,#3b82f6,#8b5cf6);'}">
            ${u.foto_url ? '' : iniciales}
          </div>
          <h3>${u.nombre}</h3>
          <p style="color:var(--text-secondary);font-size:13px;">${u.carrera || 'Docente'} — ${u.facultad || ''}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;">
            <div style="background:var(--bg-input);padding:12px;border-radius:var(--radius-md);">
              <div style="font-size:24px;font-weight:800;">${s.puntualidad}%</div>
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Puntualidad</div>
            </div>
            <div style="background:var(--bg-input);padding:12px;border-radius:var(--radius-md);">
              <div style="font-size:24px;font-weight:800;">${s.total}</div>
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Clases Total</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Horarios de hoy -->
      ${infoHoy.horariosHoy.length > 0 ? `
      <div class="card" style="margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <h3>Clases de Hoy — ${infoHoy.dia}</h3>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
          ${infoHoy.horariosHoy.map(h => {
            const marcado = infoHoy.asistenciasHoy.find(a => a.horario_id === h.id);
            const estadoColor = marcado ? (marcado.estado === 'presente' ? 'green' : marcado.estado === 'atraso' ? 'yellow' : 'red') : 'gray';
            const estadoTexto = marcado ? marcado.estado.toUpperCase() : 'PENDIENTE';
            return `<div style="background:var(--bg-input);border-radius:var(--radius-md);padding:14px;border-left:3px solid var(--accent-${estadoColor});">
              <strong>${h.materia}</strong>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${h.hora_inicio} - ${h.hora_fin}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">📍 ${h.aula || 'Sin aula'}</div>
              <span class="badge badge-${estadoColor}" style="margin-top:8px;">${estadoTexto}</span>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Historial -->
      <div class="table-container">
        <div class="table-header">
          <h3>Historial Semanal Personal</h3>
          <a href="#" style="color:var(--accent-blue);font-size:13px;"><i class="fas fa-download"></i> Descargar Reporte</a>
        </div>
        <table>
          <thead><tr>
            <th>Fecha</th><th>Curso</th><th>Hora Marcada</th><th>Ubicación</th><th>Estado</th>
          </tr></thead>
          <tbody>
            ${historial.asistencias.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">No hay registros de asistencia</td></tr>` :
              historial.asistencias.map(a => {
                const badgeClass = a.estado === 'presente' ? 'badge-green' : a.estado === 'atraso' ? 'badge-yellow' : a.estado === 'justificado' ? 'badge-blue' : 'badge-red';
                return `<tr>
                  <td>${formatearFecha(a.fecha)}</td>
                  <td>${a.materia || '—'}</td>
                  <td>${a.hora_entrada || '--:--'}</td>
                  <td>${a.aula || '—'}</td>
                  <td><span class="badge ${badgeClass}">${a.estado.toUpperCase()}</span></td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Actualizar reloj cada minuto
    setInterval(() => {
      const el = document.getElementById('relojDocente');
      if (el) el.textContent = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    }, 60000);

  } catch (err) {
    console.error('Error cargando panel docente:', err);
    container.innerHTML = '<p style="color:var(--accent-red);padding:40px;text-align:center;">Error al cargar el panel. ¿Está logueado como docente?</p>';
  }
}

// ===== MARCAR ASISTENCIA =====
async function marcarAsistencia() {
  const btn = document.getElementById('btnMarcarAsistencia');
  if (!btn || btn.disabled) return;

  if (!confirm('¿Confirma que desea marcar su asistencia ahora?')) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

  try {
    const resp = await fetch('/api/asistencias/marcar', { method: 'POST' });
    const data = await resp.json();

    if (!resp.ok) {
      alert(data.error || 'Error al marcar asistencia');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-check"></i> MARCAR ASISTENCIA';
      return;
    }

    alert(data.mensaje + (data.materia ? '\nMateria: ' + data.materia : ''));

    // Recargar panel completo
    cargarPanelDocente();
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-check"></i> MARCAR ASISTENCIA';
  }
}

// ===== UTILIDADES =====
function calcularMinutosFaltantes(horaInicio) {
  const ahora = new Date();
  const [h, m] = horaInicio.split(':').map(Number);
  const minutosTarget = h * 60 + m;
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  return minutosTarget - minutosAhora;
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '—';
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const [y, m, d] = fechaStr.split('-');
  return `${parseInt(d)} ${meses[parseInt(m) - 1]}, ${y}`;
}
