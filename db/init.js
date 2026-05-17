const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.db');

function inicializarDB() {
  const db = new Database(DB_PATH);

  // Habilitar foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ===== CREAR TABLAS =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('admin', 'docente')),
      facultad TEXT,
      carrera TEXT,
      foto_url TEXT,
      estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      docente_id INTEGER NOT NULL,
      materia TEXT NOT NULL,
      dia_semana TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      aula TEXT,
      FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS asistencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      docente_id INTEGER NOT NULL,
      horario_id INTEGER,
      fecha DATE NOT NULL,
      hora_programada TEXT,
      hora_entrada TEXT,
      estado TEXT DEFAULT 'ausente' CHECK(estado IN ('presente', 'atraso', 'ausente', 'justificado')),
      FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS justificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asistencia_id INTEGER,
      docente_id INTEGER NOT NULL,
      motivo TEXT NOT NULL,
      documento_url TEXT,
      estado_aprobacion TEXT DEFAULT 'pendiente' CHECK(estado_aprobacion IN ('pendiente', 'aprobada', 'rechazada')),
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asistencia_id) REFERENCES asistencias(id) ON DELETE SET NULL,
      FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
  `);

  return db;
}

function cargarDatosDemo(db) {
  // Verificar si ya hay datos
  const count = db.prepare('SELECT COUNT(*) as total FROM usuarios').get();
  if (count.total > 0) {
    console.log('📦 Base de datos ya tiene datos. Saltando carga demo.');
    return;
  }

  console.log('📦 Cargando datos de demostración...');

  const hashAdmin = bcrypt.hashSync('admin123', 10);
  const hashDocente = bcrypt.hashSync('docente123', 10);

  // ===== USUARIOS =====
  const insertUsuario = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, facultad, carrera, foto_url, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertarUsuarios = db.transaction(() => {
    // Admin
    insertUsuario.run('Dr. Admin ULEAM', 'admin@uleam.edu.ec', hashAdmin, 'admin', 'Administración', null, null, 'activo');

    // Docentes
    insertUsuario.run('Dra. Elena Rodriguez', 'elena.rodriguez@uleam.edu.ec', hashDocente, 'docente', 'Ciencias Informáticas', 'Ingeniería de Software', null, 'activo');
    insertUsuario.run('Prof. Marco Velez', 'marco.velez@uleam.edu.ec', hashDocente, 'docente', 'Ciencias Económicas', 'Administración de Empresas', null, 'activo');
    insertUsuario.run('Lic. Silvia Luna', 'silvia.luna@uleam.edu.ec', hashDocente, 'docente', 'Ciencias Sociales', 'Comunicación', null, 'activo');
    insertUsuario.run('Dr. Julian Casales', 'julian.casales@uleam.edu.ec', hashDocente, 'docente', 'Ciencias Informáticas', 'Ciencias de la Computación', null, 'activo');
    insertUsuario.run('Dr. Ricardo Cevallos', 'ricardo.cevallos@uleam.edu.ec', hashDocente, 'docente', 'Ciencias Informáticas', 'Ingeniería de Software', null, 'activo');
    insertUsuario.run('Mgs. María López', 'maria.lopez@uleam.edu.ec', hashDocente, 'docente', 'Ciencias Económicas', 'Comercio Exterior', null, 'activo');
    insertUsuario.run('Ing. Jorge Párraga', 'jorge.parraga@uleam.edu.ec', hashDocente, 'docente', 'Ingeniería Industrial', 'Mecánica', null, 'inactivo');
    insertUsuario.run('Dra. Ana Anchundia', 'ana.anchundia@uleam.edu.ec', hashDocente, 'docente', 'Hotelería y Turismo', 'Gastronomía', null, 'activo');
  });

  insertarUsuarios();

  // ===== HORARIOS =====
  const insertHorario = db.prepare(`
    INSERT INTO horarios (docente_id, materia, dia_semana, hora_inicio, hora_fin, aula)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertarHorarios = db.transaction(() => {
    // Elena Rodriguez (id: 2)
    insertHorario.run(2, 'Ingeniería de Software I', 'Lunes', '07:00', '09:00', 'Ed. A - R102');
    insertHorario.run(2, 'Ingeniería de Software I', 'Miércoles', '07:00', '09:00', 'Ed. A - R102');
    insertHorario.run(2, 'Estructuras de Datos', 'Martes', '09:00', '11:00', 'Lab 4 - Main');
    insertHorario.run(2, 'Estructuras de Datos', 'Jueves', '09:00', '11:00', 'Lab 4 - Main');

    // Marco Velez (id: 3)
    insertHorario.run(3, 'Desarrollo Web', 'Lunes', '09:30', '11:30', 'Lab IT-4');
    insertHorario.run(3, 'Desarrollo Web', 'Miércoles', '09:30', '11:30', 'Lab IT-4');
    insertHorario.run(3, 'Contabilidad Digital', 'Viernes', '08:00', '10:00', 'Ed. B - R201');

    // Silvia Luna (id: 4)
    insertHorario.run(4, 'Comunicación Corporativa', 'Martes', '11:00', '13:00', 'Ed. C - R305');
    insertHorario.run(4, 'Redacción Académica', 'Jueves', '11:00', '13:00', 'Auditorio 1');

    // Julian Casales (id: 5)
    insertHorario.run(5, 'Computación en la Nube', 'Lunes', '07:00', '09:00', 'Lab 2');
    insertHorario.run(5, 'Base de Datos Avanzada', 'Miércoles', '07:00', '09:00', 'Lab 3');
  });

  insertarHorarios();

  // ===== ASISTENCIAS (últimos días) =====
  const insertAsistencia = db.prepare(`
    INSERT INTO asistencias (docente_id, horario_id, fecha, hora_programada, hora_entrada, estado)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertarAsistencias = db.transaction(() => {
    // Elena - presente
    insertAsistencia.run(2, 1, '2023-11-15', '08:00', '07:54', 'presente');
    insertAsistencia.run(2, 3, '2023-11-14', '09:00', '08:58', 'presente');
    insertAsistencia.run(2, 2, '2023-11-13', '07:00', '07:02', 'presente');

    // Marco - atraso
    insertAsistencia.run(3, 5, '2023-11-15', '09:30', '09:48', 'atraso');
    insertAsistencia.run(3, 5, '2023-11-13', '09:30', '09:25', 'presente');

    // Silvia - ausente
    insertAsistencia.run(4, 8, '2023-11-15', '11:00', null, 'ausente');
    insertAsistencia.run(4, 9, '2023-11-14', '11:00', '11:05', 'presente');

    // Julian - presente
    insertAsistencia.run(5, 10, '2023-11-15', '07:00', '06:58', 'presente');
    insertAsistencia.run(5, 11, '2023-11-14', '07:00', '07:01', 'presente');
  });

  insertarAsistencias();

  // ===== JUSTIFICACIONES =====
  const insertJustificacion = db.prepare(`
    INSERT INTO justificaciones (asistencia_id, docente_id, motivo, documento_url, estado_aprobacion)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertarJustificaciones = db.transaction(() => {
    insertJustificacion.run(6, 4, 'Cita médica de emergencia', null, 'pendiente');
  });

  insertarJustificaciones();

  console.log('✅ Datos de demostración cargados correctamente.');
}

module.exports = { inicializarDB, cargarDatosDemo };
