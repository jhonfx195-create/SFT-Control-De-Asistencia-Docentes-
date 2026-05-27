const express = require('express');
const { requiereLogin, requiereAdmin } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {

  // ===== GET /api/horarios — Listar horarios (con filtros) =====
  router.get('/', requiereLogin, (req, res) => {
    try {
      const { docente_id, dia_semana } = req.query;
      let sql = `
        SELECT h.*, u.nombre as docente_nombre, u.facultad
        FROM horarios h
        JOIN usuarios u ON h.docente_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (docente_id) { sql += ' AND h.docente_id = ?'; params.push(docente_id); }
      if (dia_semana) { sql += ' AND h.dia_semana = ?'; params.push(dia_semana); }

      sql += " ORDER BY CASE h.dia_semana WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 ELSE 7 END, h.hora_inicio ASC";

      const horarios = db.prepare(sql).all(...params);

      // Listar docentes para el filtro
      const docentes = db.prepare(
        "SELECT id, nombre FROM usuarios WHERE rol = 'docente' AND estado = 'activo' ORDER BY nombre"
      ).all();

      res.json({ horarios, docentes });
    } catch (err) {
      console.error('Error al listar horarios:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== GET /api/horarios/docente/:id — Horarios de un docente específico =====
  router.get('/docente/:id', requiereLogin, (req, res) => {
    try {
      const horarios = db.prepare(`
        SELECT * FROM horarios WHERE docente_id = ?
        ORDER BY CASE dia_semana WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 ELSE 7 END, hora_inicio ASC
      `).all(req.params.id);

      res.json({ horarios });
    } catch (err) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== POST /api/horarios — Crear horario (Admin) =====
  router.post('/', requiereAdmin, (req, res) => {
    try {
      const { docente_id, materia, dia_semana, hora_inicio, hora_fin, aula } = req.body;

      if (!docente_id || !materia || !dia_semana || !hora_inicio || !hora_fin) {
        return res.status(400).json({ error: 'Docente, materia, día, hora inicio y hora fin son obligatorios' });
      }

      // Verificar conflicto de horario
      const conflicto = db.prepare(`
        SELECT * FROM horarios 
        WHERE docente_id = ? AND dia_semana = ?
        AND ((hora_inicio <= ? AND hora_fin > ?) OR (hora_inicio < ? AND hora_fin >= ?))
      `).get(docente_id, dia_semana, hora_inicio, hora_inicio, hora_fin, hora_fin);

      if (conflicto) {
        return res.status(400).json({ error: `Conflicto: el docente ya tiene "${conflicto.materia}" de ${conflicto.hora_inicio} a ${conflicto.hora_fin} el ${dia_semana}` });
      }

      const result = db.prepare(`
        INSERT INTO horarios (docente_id, materia, dia_semana, hora_inicio, hora_fin, aula)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(docente_id, materia, dia_semana, hora_inicio, hora_fin, aula || null);

      const nuevo = db.prepare('SELECT * FROM horarios WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({ mensaje: 'Horario creado exitosamente', horario: nuevo });
    } catch (err) {
      console.error('Error al crear horario:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== PUT /api/horarios/:id — Editar horario (Admin) =====
  router.put('/:id', requiereAdmin, (req, res) => {
    try {
      const { materia, dia_semana, hora_inicio, hora_fin, aula } = req.body;
      const id = req.params.id;

      const horario = db.prepare('SELECT * FROM horarios WHERE id = ?').get(id);
      if (!horario) {
        return res.status(404).json({ error: 'Horario no encontrado' });
      }

      db.prepare(`
        UPDATE horarios SET materia = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ?, aula = ?
        WHERE id = ?
      `).run(
        materia || horario.materia,
        dia_semana || horario.dia_semana,
        hora_inicio || horario.hora_inicio,
        hora_fin || horario.hora_fin,
        aula !== undefined ? aula : horario.aula,
        id
      );

      const actualizado = db.prepare('SELECT * FROM horarios WHERE id = ?').get(id);
      res.json({ mensaje: 'Horario actualizado exitosamente', horario: actualizado });
    } catch (err) {
      console.error('Error al editar horario:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== DELETE /api/horarios/:id — Eliminar horario (Admin) =====
  router.delete('/:id', requiereAdmin, (req, res) => {
    try {
      const horario = db.prepare('SELECT * FROM horarios WHERE id = ?').get(req.params.id);
      if (!horario) {
        return res.status(404).json({ error: 'Horario no encontrado' });
      }

      db.prepare('DELETE FROM horarios WHERE id = ?').run(req.params.id);
      res.json({ mensaje: 'Horario eliminado exitosamente' });
    } catch (err) {
      console.error('Error al eliminar horario:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== GET /api/horarios/mis — Horarios del docente logueado =====
  router.get('/mis', requiereLogin, (req, res) => {
    try {
      const id = req.session.usuario.id;
      const horarios = db.prepare(`
        SELECT * FROM horarios WHERE docente_id = ?
        ORDER BY CASE dia_semana WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 ELSE 7 END, hora_inicio ASC
      `).all(id);

      res.json({ horarios });
    } catch (err) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
};
