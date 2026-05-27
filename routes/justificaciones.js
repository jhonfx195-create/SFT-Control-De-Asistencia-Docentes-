const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requiereLogin, requiereAdmin, requiereDocente } = require('../middleware/auth');
const router = express.Router();

// Configurar multer para documentos de justificación
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'justificaciones');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'justif_' + Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const tipos = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const ext = tipos.test(path.extname(file.originalname).toLowerCase());
    if (ext) return cb(null, true);
    cb(new Error('Solo se permiten imágenes y documentos (jpg, png, pdf, doc)'));
  }
});

module.exports = function (db) {

  // ===== GET /api/justificaciones — Listar justificaciones =====
  router.get('/', requiereLogin, (req, res) => {
    try {
      const { estado, docente_id, pagina = 1, limite = 15 } = req.query;
      const usuario = req.session.usuario;

      let sql = `
        SELECT j.*, u.nombre as docente_nombre, u.foto_url,
               a.fecha as ausencia_fecha, a.estado as ausencia_estado
        FROM justificaciones j
        JOIN usuarios u ON j.docente_id = u.id
        LEFT JOIN asistencias a ON j.asistencia_id = a.id
        WHERE 1=1
      `;
      const params = [];

      // Si es docente, solo ve las suyas
      if (usuario.rol === 'docente') {
        sql += ' AND j.docente_id = ?';
        params.push(usuario.id);
      }

      if (estado) { sql += ' AND j.estado_aprobacion = ?'; params.push(estado); }
      if (docente_id && usuario.rol === 'admin') { sql += ' AND j.docente_id = ?'; params.push(docente_id); }

      // Contar total
      const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
      const total = db.prepare(countSql).get(...params).total;

      // Paginación
      const offset = (parseInt(pagina) - 1) * parseInt(limite);
      sql += ' ORDER BY j.creado_en DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limite), offset);

      const justificaciones = db.prepare(sql).all(...params);

      // Stats
      const statsBase = usuario.rol === 'docente' ? ' WHERE docente_id = ?' : '';
      const statsParams = usuario.rol === 'docente' ? [usuario.id] : [];

      const stats = {
        pendientes: db.prepare(`SELECT COUNT(*) as c FROM justificaciones WHERE estado_aprobacion = 'pendiente'${usuario.rol === 'docente' ? ' AND docente_id = ?' : ''}`).get(...statsParams).c,
        aprobadas: db.prepare(`SELECT COUNT(*) as c FROM justificaciones WHERE estado_aprobacion = 'aprobada'${usuario.rol === 'docente' ? ' AND docente_id = ?' : ''}`).get(...statsParams).c,
        rechazadas: db.prepare(`SELECT COUNT(*) as c FROM justificaciones WHERE estado_aprobacion = 'rechazada'${usuario.rol === 'docente' ? ' AND docente_id = ?' : ''}`).get(...statsParams).c,
      };

      res.json({
        justificaciones,
        total,
        pagina: parseInt(pagina),
        totalPaginas: Math.ceil(total / parseInt(limite)),
        stats
      });
    } catch (err) {
      console.error('Error al listar justificaciones:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== POST /api/justificaciones — Docente sube justificación =====
  router.post('/', requiereDocente, upload.single('documento'), (req, res) => {
    try {
      const { motivo, asistencia_id } = req.body;
      const docenteId = req.session.usuario.id;

      if (!motivo) {
        return res.status(400).json({ error: 'El motivo de la justificación es obligatorio' });
      }

      const documentoUrl = req.file ? '/uploads/justificaciones/' + req.file.filename : null;

      // Verificar que la asistencia existe y pertenece al docente
      if (asistencia_id) {
        const asistencia = db.prepare('SELECT * FROM asistencias WHERE id = ? AND docente_id = ?').get(asistencia_id, docenteId);
        if (!asistencia) {
          return res.status(404).json({ error: 'Registro de asistencia no encontrado' });
        }
      }

      const result = db.prepare(`
        INSERT INTO justificaciones (asistencia_id, docente_id, motivo, documento_url, estado_aprobacion)
        VALUES (?, ?, ?, ?, 'pendiente')
      `).run(asistencia_id || null, docenteId, motivo, documentoUrl);

      // Si se vincula a una asistencia, actualizar estado
      if (asistencia_id) {
        db.prepare("UPDATE asistencias SET estado = 'justificado' WHERE id = ?").run(asistencia_id);
      }

      const nueva = db.prepare('SELECT * FROM justificaciones WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({ mensaje: 'Justificación enviada exitosamente', justificacion: nueva });
    } catch (err) {
      console.error('Error al crear justificación:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== PUT /api/justificaciones/:id — Admin aprueba/rechaza =====
  router.put('/:id', requiereAdmin, (req, res) => {
    try {
      const { estado_aprobacion } = req.body;
      const id = req.params.id;

      if (!['aprobada', 'rechazada'].includes(estado_aprobacion)) {
        return res.status(400).json({ error: 'Estado debe ser "aprobada" o "rechazada"' });
      }

      const justif = db.prepare('SELECT * FROM justificaciones WHERE id = ?').get(id);
      if (!justif) {
        return res.status(404).json({ error: 'Justificación no encontrada' });
      }

      db.prepare('UPDATE justificaciones SET estado_aprobacion = ? WHERE id = ?').run(estado_aprobacion, id);

      // Si se rechaza y tiene asistencia vinculada, revertir estado
      if (estado_aprobacion === 'rechazada' && justif.asistencia_id) {
        db.prepare("UPDATE asistencias SET estado = 'ausente' WHERE id = ?").run(justif.asistencia_id);
      }

      res.json({ mensaje: `Justificación ${estado_aprobacion} exitosamente` });
    } catch (err) {
      console.error('Error al actualizar justificación:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== DELETE /api/justificaciones/:id — Eliminar justificación =====
  router.delete('/:id', requiereLogin, (req, res) => {
    try {
      const id = req.params.id;
      const usuario = req.session.usuario;

      const justif = db.prepare('SELECT * FROM justificaciones WHERE id = ?').get(id);
      if (!justif) {
        return res.status(404).json({ error: 'Justificación no encontrada' });
      }

      // Solo admin o el propio docente pueden eliminar (si aún está pendiente)
      if (usuario.rol !== 'admin' && (justif.docente_id !== usuario.id || justif.estado_aprobacion !== 'pendiente')) {
        return res.status(403).json({ error: 'No tiene permisos para eliminar esta justificación' });
      }

      // Eliminar documento si existe
      if (justif.documento_url) {
        const docPath = path.join(__dirname, '..', justif.documento_url);
        if (fs.existsSync(docPath)) fs.unlinkSync(docPath);
      }

      db.prepare('DELETE FROM justificaciones WHERE id = ?').run(id);
      res.json({ mensaje: 'Justificación eliminada exitosamente' });
    } catch (err) {
      console.error('Error al eliminar justificación:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
};
