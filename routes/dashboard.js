const express = require('express');
const { requiereLogin } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {

  // ===== GET /api/dashboard — Métricas globales para el Panel de Control =====
  router.get('/', requiereLogin, (req, res) => {
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];

      // Total de docentes activos
      const totalDocentes = db.prepare(
        "SELECT COUNT(*) as c FROM usuarios WHERE rol = 'docente' AND estado = 'activo'"
      ).get().c;

      // Asistencias de hoy
      const statsHoy = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN estado = 'atraso' THEN 1 ELSE 0 END) as atrasos,
          SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes
        FROM asistencias WHERE fecha = ?
      `).get(fechaHoy);

      // Porcentaje de asistencia hoy
      const pctAsistencia = statsHoy.total > 0
        ? Math.round(((statsHoy.presentes + statsHoy.atrasos) / statsHoy.total) * 100 * 10) / 10
        : 0;

      // Justificaciones pendientes
      const justifPendientes = db.prepare(
        "SELECT COUNT(*) as c FROM justificaciones WHERE estado_aprobacion = 'pendiente'"
      ).get().c;

      // Asistencias recientes (últimas 10)
      const recientes = db.prepare(`
        SELECT a.*, u.nombre as docente_nombre, u.foto_url, u.facultad, u.carrera,
               h.materia, h.aula
        FROM asistencias a
        JOIN usuarios u ON a.docente_id = u.id
        LEFT JOIN horarios h ON a.horario_id = h.id
        ORDER BY a.fecha DESC, a.id DESC
        LIMIT 10
      `).all();

      // Estadísticas globales (últimos 30 días)
      const statsGlobal = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN estado = 'atraso' THEN 1 ELSE 0 END) as atrasos,
          SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
          SUM(CASE WHEN estado = 'justificado' THEN 1 ELSE 0 END) as justificados
        FROM asistencias WHERE fecha >= date('now', '-30 days')
      `).get();

      const pctGlobal = statsGlobal.total > 0
        ? Math.round((statsGlobal.presentes / statsGlobal.total) * 100)
        : 0;

      res.json({
        fecha: fechaHoy,
        totalDocentes,
        hoy: { ...statsHoy, porcentaje: pctAsistencia },
        justifPendientes,
        recientes,
        global: { ...statsGlobal, porcentaje: pctGlobal }
      });
    } catch (err) {
      console.error('Error en dashboard:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
};
