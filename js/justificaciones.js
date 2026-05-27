// ===== GESTIÓN DE JUSTIFICACIONES — Frontend =====

let filtroEstadoJustif = '';

// ===== CARGAR PÁGINA DE JUSTIFICACIONES =====
async function cargarJustificaciones() {
  const container = document.getElementById('justificacionesContent');
  if (!container) return;

  try {
    const params = new URLSearchParams();
    if (filtroEstadoJustif) params.append('estado', filtroEstadoJustif);

    const resp = await fetch('/api/justificaciones?' + params);
    const data = await resp.json();

    if (!resp.ok) {
      container.innerHTML = '<p style="color:var(--accent-red);padding:40px;text-align:center;">Error al cargar justificaciones</p>';
      return;
    }

    const s = data.stats;
    const coloresAvatar = [
      'linear-gradient(135deg,#3b82f6,#8b5cf6)',
      'linear-gradient(135deg,#f97316,#eab308)',
      'linear-gradient(135deg,#ec4899,#8b5cf6)',
      'linear-gradient(135deg,#22c55e,#14b8a6)',
    ];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Justificaciones</h1>
          <p>Gestionar justificaciones de ausencias docentes.</p>
        </div>
        <button class="btn btn-primary" onclick="abrirModalJustificacion()"><i class="fas fa-plus"></i> Nueva Justificación</button>
      </div>

      <!-- Stats -->
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px;">
        <div class="stat-card" style="cursor:pointer;" onclick="filtrarJustificaciones('pendiente')">
          <div>
            <div class="stat-label">Pendientes</div>
            <div class="stat-value" style="color:var(--accent-yellow);">${s.pendientes}</div>
          </div>
          <i class="fas fa-clock" style="font-size:24px;color:var(--accent-yellow);opacity:0.5;"></i>
        </div>
        <div class="stat-card" style="cursor:pointer;" onclick="filtrarJustificaciones('aprobada')">
          <div>
            <div class="stat-label">Aprobadas</div>
            <div class="stat-value" style="color:var(--accent-green);">${s.aprobadas}</div>
          </div>
          <i class="fas fa-circle-check" style="font-size:24px;color:var(--accent-green);opacity:0.5;"></i>
        </div>
        <div class="stat-card" style="cursor:pointer;" onclick="filtrarJustificaciones('rechazada')">
          <div>
            <div class="stat-label">Rechazadas</div>
            <div class="stat-value" style="color:var(--accent-red);">${s.rechazadas}</div>
          </div>
          <i class="fas fa-circle-xmark" style="font-size:24px;color:var(--accent-red);opacity:0.5;"></i>
        </div>
      </div>

      <!-- Filtro rápido -->
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button class="btn ${!filtroEstadoJustif ? 'btn-primary' : 'btn-outline'}" onclick="filtrarJustificaciones('')" style="font-size:12px;">Todas</button>
        <button class="btn ${filtroEstadoJustif === 'pendiente' ? 'btn-primary' : 'btn-outline'}" onclick="filtrarJustificaciones('pendiente')" style="font-size:12px;">🕐 Pendientes</button>
        <button class="btn ${filtroEstadoJustif === 'aprobada' ? 'btn-primary' : 'btn-outline'}" onclick="filtrarJustificaciones('aprobada')" style="font-size:12px;">✅ Aprobadas</button>
        <button class="btn ${filtroEstadoJustif === 'rechazada' ? 'btn-primary' : 'btn-outline'}" onclick="filtrarJustificaciones('rechazada')" style="font-size:12px;">❌ Rechazadas</button>
      </div>

      <!-- Tabla -->
      <div class="table-container">
        <table>
          <thead><tr>
            <th>Docente</th>
            <th>Fecha Ausencia</th>
            <th>Motivo</th>
            <th>Documento</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            ${data.justificaciones.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fas fa-file-circle-check" style="font-size:24px;display:block;margin-bottom:8px;"></i>No hay justificaciones</td></tr>' :
              data.justificaciones.map((j, i) => {
                const iniciales = j.docente_nombre.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').substring(0, 2).toUpperCase();
                const color = coloresAvatar[i % coloresAvatar.length];
                const badgeClass = j.estado_aprobacion === 'aprobada' ? 'badge-green' : j.estado_aprobacion === 'rechazada' ? 'badge-red' : 'badge-yellow';
                const fechaFmt = j.ausencia_fecha ? formatearFechaJustif(j.ausencia_fecha) : formatearFechaJustif(j.creado_en);

                return `<tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="user-avatar" style="background:${color};">${iniciales}</div>
                      <strong>${j.docente_nombre}</strong>
                    </div>
                  </td>
                  <td>${fechaFmt}</td>
                  <td style="max-width:200px;">${j.motivo}</td>
                  <td>${j.documento_url ? `<a href="${j.documento_url}" target="_blank" class="badge badge-blue" style="text-decoration:none;"><i class="fas fa-file"></i> Ver</a>` : '<span class="badge badge-gray">N/A</span>'}</td>
                  <td><span class="badge ${badgeClass}">${j.estado_aprobacion.toUpperCase()}</span></td>
                  <td>
                    <div class="action-icons">
                      ${j.estado_aprobacion === 'pendiente' ? `
                        <button title="Aprobar" onclick="cambiarEstadoJustif(${j.id},'aprobada')" style="color:var(--accent-green);"><i class="fas fa-check"></i></button>
                        <button title="Rechazar" onclick="cambiarEstadoJustif(${j.id},'rechazada')" style="color:var(--accent-red);"><i class="fas fa-times"></i></button>
                      ` : ''}
                      <button title="Eliminar" onclick="eliminarJustificacion(${j.id})"><i class="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('Error cargando justificaciones:', err);
    container.innerHTML = '<p style="color:var(--accent-red);padding:40px;text-align:center;">Error de conexión</p>';
  }
}

// ===== FILTRO RÁPIDO =====
function filtrarJustificaciones(estado) {
  filtroEstadoJustif = estado;
  cargarJustificaciones();
}

// ===== MODAL CREAR JUSTIFICACIÓN =====
async function abrirModalJustificacion() {
  const modal = document.getElementById('modalDocente');
  const titulo = document.getElementById('modalDocenteTitulo');
  const form = document.getElementById('formDocente');

  titulo.textContent = 'Nueva Justificación';

  // Obtener ausencias no justificadas del docente
  let ausenciasOpts = '<option value="">Sin vincular a asistencia</option>';
  try {
    const resp = await fetch('/api/asistencias/mis');
    if (resp.ok) {
      const { asistencias } = await resp.json();
      const ausencias = asistencias.filter(a => a.estado === 'ausente' || a.estado === 'atraso');
      ausenciasOpts += ausencias.map(a =>
        `<option value="${a.id}">${formatearFechaJustif(a.fecha)} — ${a.materia || 'Sin materia'} (${a.estado})</option>`
      ).join('');
    }
  } catch (e) { /* admin no tiene /mis */ }

  const formGrid = form.querySelector('.form-grid');
  formGrid.innerHTML = `
    <div class="form-group" style="grid-column:1/-1;">
      <label>Vincular a Ausencia</label>
      <select id="jAsistencia">${ausenciasOpts}</select>
    </div>
    <div class="form-group" style="grid-column:1/-1;">
      <label>Motivo de la Justificación *</label>
      <textarea id="jMotivo" required placeholder="Describa el motivo de su ausencia..." 
        style="width:100%;padding:10px 14px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);font-size:14px;min-height:80px;resize:vertical;font-family:inherit;"></textarea>
    </div>
    <div class="form-group" style="grid-column:1/-1;">
      <label>Documento de Respaldo</label>
      <input type="file" id="jDocumento" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx">
    </div>
  `;

  form.dataset.modo = 'crear-justificacion';
  form.dataset.id = '';
  form.onsubmit = guardarJustificacion;

  modal.classList.add('visible');
}

// ===== GUARDAR JUSTIFICACIÓN =====
async function guardarJustificacion(event) {
  event.preventDefault();

  const motivo = document.getElementById('jMotivo').value.trim();
  if (!motivo) { alert('El motivo es obligatorio'); return; }

  const formData = new FormData();
  formData.append('motivo', motivo);

  const asistenciaId = document.getElementById('jAsistencia').value;
  if (asistenciaId) formData.append('asistencia_id', asistenciaId);

  const docInput = document.getElementById('jDocumento');
  if (docInput.files[0]) formData.append('documento', docInput.files[0]);

  try {
    const resp = await fetch('/api/justificaciones', { method: 'POST', body: formData });
    const data = await resp.json();

    if (!resp.ok) { alert(data.error); return; }

    cerrarModalDocente();
    cargarJustificaciones();
    alert(data.mensaje);
  } catch (err) {
    alert('Error de conexión');
  }
}

// ===== APROBAR / RECHAZAR =====
async function cambiarEstadoJustif(id, nuevoEstado) {
  const accion = nuevoEstado === 'aprobada' ? 'aprobar' : 'rechazar';
  if (!confirm(`¿Está seguro de ${accion} esta justificación?`)) return;

  try {
    const resp = await fetch('/api/justificaciones/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado_aprobacion: nuevoEstado })
    });
    const data = await resp.json();

    if (!resp.ok) { alert(data.error); return; }
    cargarJustificaciones();
    alert(data.mensaje);
  } catch (err) {
    alert('Error de conexión');
  }
}

// ===== ELIMINAR =====
async function eliminarJustificacion(id) {
  if (!confirm('¿Eliminar esta justificación?\n\nEsta acción no se puede deshacer.')) return;

  try {
    const resp = await fetch('/api/justificaciones/' + id, { method: 'DELETE' });
    const data = await resp.json();
    if (!resp.ok) { alert(data.error); return; }
    cargarJustificaciones();
    alert(data.mensaje);
  } catch (err) {
    alert('Error de conexión');
  }
}

// ===== UTILIDAD =====
function formatearFechaJustif(fechaStr) {
  if (!fechaStr) return '—';
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const d = new Date(fechaStr);
  if (isNaN(d)) {
    // Fallback para formato YYYY-MM-DD
    const [y, m, day] = fechaStr.split('-');
    return `${parseInt(day)} ${meses[parseInt(m) - 1]}, ${y}`;
  }
  return `${d.getDate()} ${meses[d.getMonth()]}, ${d.getFullYear()}`;
}
