const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'database.db');
const db = new Database(DB_PATH);

try {
  let sql = `
    SELECT h.*, u.nombre as docente_nombre, u.facultad
    FROM horarios h
    JOIN usuarios u ON h.docente_id = u.id
    WHERE 1=1
  `;
  sql += " ORDER BY CASE h.dia_semana WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 ELSE 7 END, h.hora_inicio ASC";
  
  const horarios = db.prepare(sql).all();
  console.log("Horarios:", horarios.length);
  
  const docentes = db.prepare(
    "SELECT id, nombre FROM usuarios WHERE rol = 'docente' AND estado = 'activo' ORDER BY nombre"
  ).all();
  console.log("Docentes:", docentes.length);
} catch (e) {
  console.error("ERROR:", e);
} finally {
  db.close();
}
