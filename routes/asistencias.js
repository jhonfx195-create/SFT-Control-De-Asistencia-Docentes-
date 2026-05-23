const express = require('express');
const { requiereLogin, requiereAdmin, requiereDocente } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {

  // ===== POST /api/asistencias/marcar — Docente marca su asistencia =====
  router.post('/marcar', requiereDocente, (req, res) => {
    try {
      const docenteId = req.session.usuario.id;
      const ahora = new Date();
      const fechaHoy = ahora.toISOString().split('T')[0];
      const horaActual = ahora.toTimeString().substring(0, 5); // HH:MM

      // Buscar si hay un horario para hoy
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaHoy = diasSemana[ahora.getDay()];

      const horario = db.prepare(`
        SELECT * FROM horarios WHERE docente_id = ? AND dia_semana = ?
        ORDER BY hora_inicio ASC LIMIT 1
      `).get(docenteId, diaHoy);

      // Verificar si ya marcó asistencia hoy para este horario
      const yaMarco = db.prepare(`
        SELECT id FROM asistencias WHERE docente_id = ? AND fecha = ? ${horario ? 'AND horario_id = ?' : ''}
      `).get(...(horario ? [docenteId, fechaHoy, horario.id] : [docenteId, fechaHoy]));

      if (yaMarco) {
        return res.status(400).json({ error: 'Ya ha marcado su asistencia para este horario hoy' });
      }

      // Determinar estado automáticamente
      let estado = 'presente';
      let horaProgramada = null;

      if (horario) {
        horaProgramada = horario.hora_inicio;
        // Comparar horas: si llega más de 10 minutos tarde → atraso
        const [hProg, mProg] = horario.hora_inicio.split(':').map(Number);
        const [hActual, mActual] = horaActual.split(':').map(Number);
        const minutosProg = hProg * 60 + mProg;
        const minutosActual = hActual * 60 + mActual;
        const diferencia = minutosActual - minutosProg;

        if (diferencia > 10) {
          estado = 'atraso';
        }
      }

      // Registrar asistencia
      const result = db.prepare(`
        INSERT INTO asistencias (docente_id, horario_id, fecha, hora_programada, hora_entrada, estado)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(docenteId, horario ? horario.id : null, fechaHoy, horaProgramada, horaActual, estado);

      const asistencia = db.prepare('SELECT * FROM asistencias WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        mensaje: `Asistencia registrada como: ${estado.toUpperCase()}`,
        asistencia,
        materia: horario ? horario.materia : null,
        aula: horario ? horario.aula : null
      });
    } catch (err) {
      console.error('Error al marcar asistencia:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== GET /api/asistencias/mis — Historial del docente logueado =====
  router.get('/mis', requiereDocente, (req, res) => {
    try {
      const docenteId = req.session.usuario.id;
      const { limite = 20 } = req.query;

      const asistencias = db.prepare(`
        SELECT a.*, h.materia, h.aula
        FROM asistencias a
        LEFT JOIN horarios h ON a.horario_id = h.id
        WHERE a.docente_id = ?
        ORDER BY a.fecha DESC, a.hora_entrada DESC
        LIMIT ?
      `).all(docenteId, parseInt(limite));

      // Estadísticas personales
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN estado = 'atraso' THEN 1 ELSE 0 END) as atrasos,
          SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
          SUM(CASE WHEN estado = 'justificado' THEN 1 ELSE 0 END) as justificados
        FROM asistencias WHERE docente_id = ?
      `).get(docenteId);

      const puntualidad = stats.total > 0
        ? Math.round((stats.presentes / stats.total) * 100)
        : 0;

      res.json({ asistencias, stats: { ...stats, puntualidad } });
    } catch (err) {
      console.error('Error al obtener historial:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== GET /api/asistencias/hoy — Info del turno de hoy para el docente =====
  router.get('/hoy', requiereDocente, (req, res) => {
    try {
      const docenteId = req.session.usuario.id;
      const ahora = new Date();
      const fechaHoy = ahora.toISOString().split('T')[0];
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaHoy = diasSemana[ahora.getDay()];

      // Horarios de hoy
      const horariosHoy = db.prepare(`
        SELECT * FROM horarios WHERE docente_id = ? AND dia_semana = ?
        ORDER BY hora_inicio ASC
      `).all(docenteId, diaHoy);

      // Asistencias ya marcadas hoy
      const asistenciasHoy = db.prepare(`
        SELECT * FROM asistencias WHERE docente_id = ? AND fecha = ?
      `).all(docenteId, fechaHoy);

      // Próximo horario (el más cercano que no haya marcado)
      const horariosIdsMarcados = asistenciasHoy.map(a => a.horario_id);
      const proximoHorario = horariosHoy.find(h => !horariosIdsMarcados.includes(h.id)) || null;

      res.json({
        dia: diaHoy,
        fecha: fechaHoy,
        horariosHoy,
        asistenciasHoy,
        proximoHorario,
        yaMarcado: proximoHorario === null && horariosHoy.length > 0
      });
    } catch (err) {
      console.error('Error al obtener info de hoy:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== GET /api/asistencias — Admin: listar todas las asistencias =====
  router.get('/', requiereLogin, (req, res) => {
    try {
      const { fecha, docente_id, estado, limite = 20, pagina = 1 } = req.query;
      let sql = `
        SELECT a.*, u.nombre as docente_nombre, u.foto_url, u.facultad,
               h.materia, h.aula
        FROM asistencias a
        JOIN usuarios u ON a.docente_id = u.id
        LEFT JOIN horarios h ON a.horario_id = h.id
        WHERE 1=1
      `;
      const params = [];

      if (fecha) { sql += ' AND a.fecha = ?'; params.push(fecha); }
      if (docente_id) { sql += ' AND a.docente_id = ?'; params.push(docente_id); }
      if (estado) { sql += ' AND a.estado = ?'; params.push(estado); }

      // Contar total
      const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
      const total = db.prepare(countSql).get(...params).total;

      // Paginación
      const offset = (parseInt(pagina) - 1) * parseInt(limite);
      sql += ' ORDER BY a.fecha DESC, a.hora_entrada DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limite), offset);

      const asistencias = db.prepare(sql).all(...params);

      // Stats generales (para admin)
      const statsHoy = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN estado = 'atraso' THEN 1 ELSE 0 END) as atrasos,
          SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes
        FROM asistencias WHERE fecha = date('now')
      `).get();

      res.json({
        asistencias,
        total,
        pagina: parseInt(pagina),
        totalPaginas: Math.ceil(total / parseInt(limite)),
        statsHoy
      });
    } catch (err) {
      console.error('Error al listar asistencias:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
};
