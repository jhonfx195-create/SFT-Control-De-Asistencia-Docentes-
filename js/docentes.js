// ===== GESTIÓN DE DOCENTES — Frontend =====

// Colores para avatares
const coloresAvatar = [
  'linear-gradient(135deg,#3b82f6,#8b5cf6)',
  'linear-gradient(135deg,#f97316,#eab308)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#22c55e,#14b8a6)',
  'linear-gradient(135deg,#ef4444,#f97316)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#14b8a6,#22c55e)',
];

function getIniciales(nombre) {
  return nombre.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function getColorAvatar(id) {
  return coloresAvatar[id % coloresAvatar.length];
}

// ===== CARGAR LISTA DE DOCENTES =====
let paginaActual = 1;
let facultadFiltro = 'todas';
let busquedaFiltro = '';

async function cargarDocentes(pagina = 1) {
  paginaActual = pagina;
  try {
    const params = new URLSearchParams({
      pagina,
      limite: 10,
      facultad: facultadFiltro,
      busqueda: busquedaFiltro
    });

    const resp = await fetch('/api/docentes?' + params);
    if (!resp.ok) {
      const err = await resp.json();
      alert(err.error || 'Error al cargar docentes');
      return;
    }

    const data = await resp.json();
    renderTablaDocentes(data);
    renderPaginacion(data);
    renderStatsDocentes(data);
    renderFiltroFacultades(data.facultades);
  } catch (err) {
    console.error('Error cargando docentes:', err);
  }
}

// ===== RENDERIZAR TABLA =====
function renderTablaDocentes(data) {
  const tbody = document.getElementById('docentesTbody');
  if (!tbody) return;

  if (data.docentes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">
      <i class="fas fa-users-slash" style="font-size:32px;margin-bottom:10px;display:block;"></i>
      No se encontraron docentes</td></tr>`;
    return;
  }

  tbody.innerHTML = data.docentes.map(d => {
    const iniciales = getIniciales(d.nombre);
    const color = getColorAvatar(d.id);
    const fotoHtml = d.foto_url
      ? `<img src="${d.foto_url}" alt="${d.nombre}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
      : `<div class="user-avatar" style="background:${color};">${iniciales}</div>`;

    return `<tr>
      <td>${fotoHtml}</td>
      <td><strong>${d.nombre}</strong></td>
      <td>${d.facultad || '—'}</td>
      <td>${d.carrera || '—'}</td>
      <td>${d.email}</td>
      <td><span class="badge ${d.estado === 'activo' ? 'badge-green' : 'badge-red'}">${d.estado.toUpperCase()}</span></td>
      <td>
        <div class="action-icons">
          <button title="Editar" onclick="abrirModalEditar(${d.id})"><i class="fas fa-pen"></i></button>
          <button title="Eliminar" onclick="eliminarDocente(${d.id}, '${d.nombre}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ===== RENDERIZAR PAGINACIÓN =====
function renderPaginacion(data) {
  const footer = document.getElementById('docentesFooter');
  if (!footer) return;

  const { total, pagina, totalPaginas } = data;
  const desde = (pagina - 1) * 10 + 1;
  const hasta = Math.min(pagina * 10, total);

  let paginasHtml = '';
  if (pagina > 1) paginasHtml += `<button onclick="cargarDocentes(${pagina - 1})"><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= Math.min(totalPaginas, 5); i++) {
    paginasHtml += `<button class="${i === pagina ? 'active' : ''}" onclick="cargarDocentes(${i})">${i}</button>`;
  }
  if (pagina < totalPaginas) paginasHtml += `<button onclick="cargarDocentes(${pagina + 1})"><i class="fas fa-chevron-right"></i></button>`;

  footer.innerHTML = `
    <span>Mostrando ${desde} a ${hasta} de ${total} docentes</span>
    <div class="pagination">${paginasHtml}</div>`;
}

// ===== RENDERIZAR STATS =====
function renderStatsDocentes(data) {
  const el = document.getElementById('docentesStats');
  if (!el) return;

  // Contar activos e inactivos del set total
  const activos = data.docentes.filter(d => d.estado === 'activo').length;

  el.innerHTML = `
    <div class="stat-card">
      <div><div class="stat-label">Total Docentes</div><div class="stat-value">${data.total}</div></div>
      <i class="fas fa-users" style="font-size:28px;color:var(--accent-blue);opacity:0.5;"></i>
    </div>
    <div class="stat-card">
      <div><div class="stat-label">Activos</div><div class="stat-value">${activos}</div></div>
      <i class="fas fa-circle-check" style="font-size:28px;color:var(--accent-green);opacity:0.5;"></i>
    </div>`;
}

// ===== RENDERIZAR FILTRO FACULTADES =====
function renderFiltroFacultades(facultades) {
  const select = document.getElementById('filtroFacultad');
  if (!select || select.options.length > 1) return; // ya cargado

  facultades.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    select.appendChild(opt);
  });
}

// ===== BUSCAR =====
function initBusquedaDocentes() {
  const input = document.getElementById('busquedaDocentes');
  if (!input) return;

  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      busquedaFiltro = input.value.trim();
      cargarDocentes(1);
    }, 400);
  });

  const select = document.getElementById('filtroFacultad');
  if (select) {
    select.addEventListener('change', () => {
      facultadFiltro = select.value;
      cargarDocentes(1);
    });
  }
}

// ===== MODAL: AÑADIR DOCENTE =====
function abrirModalCrear() {
  const modal = document.getElementById('modalDocente');
  const form = document.getElementById('formDocente');
  const titulo = document.getElementById('modalDocenteTitulo');

  titulo.textContent = 'Añadir Nuevo Docente';
  form.reset();
  form.dataset.modo = 'crear';
  form.dataset.id = '';
  document.getElementById('campoPassword').style.display = 'block';
  document.getElementById('inputPassword').required = true;

  modal.classList.add('visible');
}

// ===== MODAL: EDITAR DOCENTE =====
async function abrirModalEditar(id) {
  try {
    const resp = await fetch('/api/docentes/' + id);
    if (!resp.ok) { alert('Error al cargar docente'); return; }
    const { docente } = await resp.json();

    const modal = document.getElementById('modalDocente');
    const form = document.getElementById('formDocente');
    const titulo = document.getElementById('modalDocenteTitulo');

    titulo.textContent = 'Editar Docente';
    form.dataset.modo = 'editar';
    form.dataset.id = id;

    document.getElementById('inputNombre').value = docente.nombre;
    document.getElementById('inputEmail').value = docente.email;
    document.getElementById('inputFacultad').value = docente.facultad || '';
    document.getElementById('inputCarrera').value = docente.carrera || '';
    document.getElementById('inputEstado').value = docente.estado;
    document.getElementById('campoPassword').style.display = 'none';
    document.getElementById('inputPassword').required = false;

    modal.classList.add('visible');
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
}

// ===== CERRAR MODAL =====
function cerrarModalDocente() {
  document.getElementById('modalDocente').classList.remove('visible');
}

// ===== GUARDAR DOCENTE (crear o editar) =====
async function guardarDocente(event) {
  event.preventDefault();
  const form = document.getElementById('formDocente');
  const modo = form.dataset.modo;
  const id = form.dataset.id;

  const formData = new FormData();
  formData.append('nombre', document.getElementById('inputNombre').value.trim());
  formData.append('email', document.getElementById('inputEmail').value.trim());
  formData.append('facultad', document.getElementById('inputFacultad').value.trim());
  formData.append('carrera', document.getElementById('inputCarrera').value.trim());

  const fotoInput = document.getElementById('inputFoto');
  if (fotoInput.files[0]) {
    formData.append('foto', fotoInput.files[0]);
  }

  if (modo === 'crear') {
    const pw = document.getElementById('inputPassword').value;
    if (!pw) { alert('La contraseña es obligatoria'); return; }
    formData.append('password', pw);
  } else {
    formData.append('estado', document.getElementById('inputEstado').value);
  }

  try {
    const url = modo === 'crear' ? '/api/docentes' : '/api/docentes/' + id;
    const method = modo === 'crear' ? 'POST' : 'PUT';

    const resp = await fetch(url, { method, body: formData });
    const data = await resp.json();

    if (!resp.ok) {
      alert(data.error || 'Error al guardar');
      return;
    }

    cerrarModalDocente();
    cargarDocentes(paginaActual);
    alert(data.mensaje);
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
}

// ===== ELIMINAR DOCENTE =====
async function eliminarDocente(id, nombre) {
  if (!confirm(`¿Está seguro de eliminar al docente "${nombre}"?\n\nEsta acción no se puede deshacer.`)) return;

  try {
    const resp = await fetch('/api/docentes/' + id, { method: 'DELETE' });
    const data = await resp.json();

    if (!resp.ok) {
      alert(data.error || 'Error al eliminar');
      return;
    }

    cargarDocentes(paginaActual);
    alert(data.mensaje);
  } catch (err) {
    alert('Error de conexión');
  }
}
