// ===== GESTIÓN DE HORARIOS — Frontend =====

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const COLORES_DIA = {
  'Lunes': 'blue', 'Martes': 'green', 'Miércoles': 'red',
  'Jueves': 'yellow', 'Viernes': 'blue', 'Sábado': 'green'
};

let filtroDocenteHorario = '';
let filtroDiaHorario = '';

// ===== CARGAR PÁGINA DE HORARIOS =====
async function cargarHorarios() {
  const container = document.getElementById('horariosContent');
  if (!container) return;

  try {
    const params = new URLSearchParams();
    if (filtroDocenteHorario) params.append('docente_id', filtroDocenteHorario);
    if (filtroDiaHorario) params.append('dia_semana', filtroDiaHorario);

    const resp = await fetch('/api/horarios?' + params);
    const data = await resp.json();

    if (!resp.ok) {
      container.innerHTML = '<p style="color:var(--accent-red);padding:40px;text-align:center;">Error al cargar horarios</p>';
      return;
    }

    // Agrupar horarios por día
    const porDia = {};
    DIAS_SEMANA.forEach(d => porDia[d] = []);
    data.horarios.forEach(h => {
      if (porDia[h.dia_semana]) porDia[h.dia_semana].push(h);
    });

    // Selector de docentes
    const docenteOpts = data.docentes.map(d =>
      `<option value="${d.id}" ${d.id == filtroDocenteHorario ? 'selected' : ''}>${d.nombre}</option>`
    ).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Gestión de Horarios</h1>
          <p>Asigna y visualiza los horarios de clase del personal docente.</p>
        </div>
        <button class="btn btn-primary" onclick="abrirModalHorario()"><i class="fas fa-plus"></i> Asignar Horario</button>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div class="filter-group" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:10px 16px;flex:1;">
          <label><i class="fas fa-user"></i> Docente</label>
          <select id="filtroDocenteH" onchange="filtroDocenteHorario=this.value;cargarHorarios()">
            <option value="">Todos los Docentes</option>
            ${docenteOpts}
          </select>
        </div>
        <div class="filter-group" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:10px 16px;">
          <label><i class="fas fa-calendar-day"></i> Día</label>
          <select id="filtroDiaH" onchange="filtroDiaHorario=this.value;cargarHorarios()">
            <option value="">Todos los Días</option>
            ${DIAS_SEMANA.map(d => `<option value="${d}" ${d === filtroDiaHorario ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Vista semanal -->
      <div class="card" style="overflow-x:auto;">
        <h3 style="margin-bottom:16px;">Vista Semanal</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              ${DIAS_SEMANA.map(d => `
                <th style="padding:12px;text-align:center;min-width:160px;">
                  <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">${d}</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${DIAS_SEMANA.map(d => `
                <td style="padding:6px;vertical-align:top;border-right:1px solid var(--border-color);">
                  ${porDia[d].length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Sin clases</div>' :
                    porDia[d].map(h => {
                      const color = COLORES_DIA[d] || 'blue';
                      return `<div style="background:rgba(${color === 'blue' ? '59,130,246' : color === 'green' ? '34,197,94' : color === 'red' ? '239,68,68' : '234,179,8'},0.1);border-left:3px solid var(--accent-${color});border-radius:var(--radius-sm);padding:10px;margin-bottom:8px;font-size:12px;">
                        <strong style="color:var(--accent-${color});">${h.materia}</strong>
                        <div style="color:var(--text-secondary);margin-top:3px;">${h.hora_inicio} - ${h.hora_fin}</div>
                        <div style="color:var(--text-muted);margin-top:2px;">📍 ${h.aula || 'Sin aula'}</div>
                        <div style="color:var(--text-muted);margin-top:2px;">👤 ${h.docente_nombre || ''}</div>
                        <div style="display:flex;gap:4px;margin-top:6px;">
                          <button class="btn btn-outline" style="padding:3px 8px;font-size:10px;" onclick="editarHorario(${h.id})"><i class="fas fa-pen"></i></button>
                          <button class="btn btn-outline" style="padding:3px 8px;font-size:10px;color:var(--accent-red);" onclick="eliminarHorario(${h.id},'${h.materia}')"><i class="fas fa-trash"></i></button>
                        </div>
                      </div>`;
                    }).join('')}
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tabla de horarios -->
      <div class="table-container" style="margin-top:24px;">
        <div class="table-header"><h3>Listado Completo (${data.horarios.length} horarios)</h3></div>
        <table>
          <thead><tr><th>Docente</th><th>Materia</th><th>Día</th><th>Hora</th><th>Aula</th><th>Acciones</th></tr></thead>
          <tbody>
            ${data.horarios.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No hay horarios registrados</td></tr>' :
              data.horarios.map(h => `
                <tr>
                  <td><strong>${h.docente_nombre}</strong></td>
                  <td>${h.materia}</td>
                  <td><span class="badge badge-${COLORES_DIA[h.dia_semana] || 'gray'}">${h.dia_semana}</span></td>
                  <td>${h.hora_inicio} - ${h.hora_fin}</td>
                  <td>${h.aula || '—'}</td>
                  <td>
                    <div class="action-icons">
                      <button title="Editar" onclick="editarHorario(${h.id})"><i class="fas fa-pen"></i></button>
                      <button title="Eliminar" onclick="eliminarHorario(${h.id},'${h.materia}')"><i class="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('Error cargando horarios:', err);
    container.innerHTML = '<p style="color:var(--accent-red);padding:40px;text-align:center;">Error de conexión</p>';
  }
}

// ===== MODAL CREAR/EDITAR HORARIO =====
async function abrirModalHorario(horarioId) {
  // Obtener docentes para el select
  const resp = await fetch('/api/horarios');
  const { docentes } = await resp.json();

  const isEdit = !!horarioId;
  let horario = {};

  if (isEdit) {
    const allH = await fetch('/api/horarios').then(r => r.json());
    horario = allH.horarios.find(h => h.id === horarioId) || {};
  }

  const modal = document.getElementById('modalDocente'); // reutilizamos modal
  const titulo = document.getElementById('modalDocenteTitulo');
  const form = document.getElementById('formDocente');

  titulo.textContent = isEdit ? 'Editar Horario' : 'Asignar Nuevo Horario';

  // Reemplazar contenido del form
  const formGrid = form.querySelector('.form-grid');
  formGrid.innerHTML = `
    <div class="form-group">
      <label>Docente *</label>
      <select id="hDocente" required>
        <option value="">Seleccionar docente...</option>
        ${docentes.map(d => `<option value="${d.id}" ${d.id === horario.docente_id ? 'selected' : ''}>${d.nombre}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Materia *</label>
      <input type="text" id="hMateria" required placeholder="Ej: Ingeniería de Software" value="${horario.materia || ''}">
    </div>
    <div class="form-group">
      <label>Día de la Semana *</label>
      <select id="hDia" required>
        ${DIAS_SEMANA.map(d => `<option value="${d}" ${d === horario.dia_semana ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Aula</label>
      <input type="text" id="hAula" placeholder="Ej: Lab 4 - Main" value="${horario.aula || ''}">
    </div>
    <div class="form-group">
      <label>Hora Inicio *</label>
      <input type="time" id="hInicio" required value="${horario.hora_inicio || '07:00'}">
    </div>
    <div class="form-group">
      <label>Hora Fin *</label>
      <input type="time" id="hFin" required value="${horario.hora_fin || '09:00'}">
    </div>
  `;

  form.dataset.modo = isEdit ? 'editar-horario' : 'crear-horario';
  form.dataset.id = horarioId || '';
  form.onsubmit = guardarHorario;

  modal.classList.add('visible');
}

async function guardarHorario(event) {
  event.preventDefault();
  const form = document.getElementById('formDocente');
  const modo = form.dataset.modo;
  const id = form.dataset.id;

  const body = {
    docente_id: document.getElementById('hDocente').value,
    materia: document.getElementById('hMateria').value.trim(),
    dia_semana: document.getElementById('hDia').value,
    hora_inicio: document.getElementById('hInicio').value,
    hora_fin: document.getElementById('hFin').value,
    aula: document.getElementById('hAula').value.trim()
  };

  if (!body.docente_id || !body.materia) {
    alert('Docente y materia son obligatorios');
    return;
  }

  try {
    const url = modo === 'crear-horario' ? '/api/horarios' : '/api/horarios/' + id;
    const method = modo === 'crear-horario' ? 'POST' : 'PUT';

    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();

    if (!resp.ok) { alert(data.error); return; }

    cerrarModalDocente();
    cargarHorarios();
    alert(data.mensaje);
  } catch (err) {
    alert('Error de conexión');
  }
}

function editarHorario(id) {
  abrirModalHorario(id);
}

async function eliminarHorario(id, materia) {
  if (!confirm(`¿Eliminar el horario de "${materia}"?\n\nEsta acción no se puede deshacer.`)) return;

  try {
    const resp = await fetch('/api/horarios/' + id, { method: 'DELETE' });
    const data = await resp.json();
    if (!resp.ok) { alert(data.error); return; }
    cargarHorarios();
    alert(data.mensaje);
  } catch (err) {
    alert('Error de conexión');
  }
}
