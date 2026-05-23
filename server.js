const express = require('express');
const session = require('express-session');
const path = require('path');
const { inicializarDB, cargarDatosDemo } = require('./db/init');

// ===== Inicializar Base de Datos =====
const db = inicializarDB();
cargarDatosDemo(db);

// ===== Crear App Express =====
const app = express();
const PORT = 3000;

// ===== Middlewares Globales =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones
app.use(session({
  secret: 'uleam-asistencia-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4, // 4 horas
    httpOnly: true
  }
}));

// ===== Archivos Estáticos =====
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== Rutas de la API =====
const authRoutes = require('./routes/auth')(db);
const docentesRoutes = require('./routes/docentes')(db);
const perfilRoutes = require('./routes/perfil')(db);
const asistenciasRoutes = require('./routes/asistencias')(db);

app.use('/api/auth', authRoutes);
app.use('/api/docentes', docentesRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/asistencias', asistenciasRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== Iniciar Servidor =====
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🎓 Sistema de Asistencia ULEAM            ║');
  console.log(`║   🌐 Servidor corriendo en: http://localhost:${PORT}  ║`);
  console.log('║   📦 Base de datos: SQLite (database.db)     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});

// Cerrar BD al terminar
process.on('SIGINT', () => {
  db.close();
  console.log('\n🔒 Base de datos cerrada. Servidor detenido.');
  process.exit(0);
});
