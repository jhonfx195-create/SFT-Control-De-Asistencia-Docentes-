const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requiereAdmin, requiereLogin } = require('../middleware/auth');
const router = express.Router();

// Configurar multer para fotos de perfil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'perfiles');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'perfil_' + Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    const tipos = /jpeg|jpg|png|gif|webp/;
    const ext = tipos.test(path.extname(file.originalname).toLowerCase());
    const mime = tipos.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  }
});

module.exports = function (db) {

  // ===== GET /api/docentes — Listar todos los docentes =====
  router.get('/', requiereLogin, (req, res) => {
    try {
      const { facultad, busqueda, pagina = 1, limite = 10 } = req.query;
      let sql = `SELECT id, nombre, email, rol, facultad, carrera, foto_url, estado, creado_en 
                 FROM usuarios WHERE rol = 'docente'`;
      const params = [];

      if (facultad && facultad !== 'todas') {
        sql += ' AND facultad = ?';
        params.push(facultad);
      }

      if (busqueda) {
        sql += ' AND (nombre LIKE ? OR email LIKE ?)';
        params.push('%' + busqueda + '%', '%' + busqueda + '%');
      }

      // Contar total
      const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
      const total = db.prepare(countSql).get(...params).total;

      // Paginación
      const offset = (parseInt(pagina) - 1) * parseInt(limite);
      sql += ' ORDER BY nombre ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limite), offset);

      const docentes = db.prepare(sql).all(...params);

      // Obtener lista de facultades para el filtro
      const facultades = db.prepare(
        "SELECT DISTINCT facultad FROM usuarios WHERE rol = 'docente' AND facultad IS NOT NULL ORDER BY facultad"
      ).all().map(f => f.facultad);

      res.json({
        docentes,
        total,
        pagina: parseInt(pagina),
        totalPaginas: Math.ceil(total / parseInt(limite)),
        facultades
      });
    } catch (err) {
      console.error('Error al listar docentes:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== GET /api/docentes/:id — Obtener un docente =====
  router.get('/:id', requiereLogin, (req, res) => {
    try {
      const docente = db.prepare(
        `SELECT id, nombre, email, rol, facultad, carrera, foto_url, estado, creado_en
         FROM usuarios WHERE id = ? AND rol = 'docente'`
      ).get(req.params.id);

      if (!docente) {
        return res.status(404).json({ error: 'Docente no encontrado' });
      }

      res.json({ docente });
    } catch (err) {
      console.error('Error al obtener docente:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== POST /api/docentes — Crear docente (Admin) =====
  router.post('/', requiereAdmin, upload.single('foto'), (req, res) => {
    try {
      const { nombre, email, password, facultad, carrera } = req.body;

      if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
      }

      // Verificar email duplicado
      const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
      if (existe) {
        return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const fotoUrl = req.file ? '/uploads/perfiles/' + req.file.filename : null;

      const result = db.prepare(`
        INSERT INTO usuarios (nombre, email, password_hash, rol, facultad, carrera, foto_url, estado)
        VALUES (?, ?, ?, 'docente', ?, ?, ?, 'activo')
      `).run(nombre, email, passwordHash, facultad || null, carrera || null, fotoUrl);

      const nuevoDocente = db.prepare(
        'SELECT id, nombre, email, facultad, carrera, foto_url, estado, creado_en FROM usuarios WHERE id = ?'
      ).get(result.lastInsertRowid);

      res.status(201).json({ mensaje: 'Docente creado exitosamente', docente: nuevoDocente });
    } catch (err) {
      console.error('Error al crear docente:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== PUT /api/docentes/:id — Editar docente (Admin) =====
  router.put('/:id', requiereAdmin, upload.single('foto'), (req, res) => {
    try {
      const { nombre, email, facultad, carrera, estado, password } = req.body;
      const id = req.params.id;

      const docente = db.prepare("SELECT * FROM usuarios WHERE id = ? AND rol = 'docente'").get(id);
      if (!docente) {
        return res.status(404).json({ error: 'Docente no encontrado' });
      }

      // Verificar email duplicado si cambió
      if (email && email !== docente.email) {
        const existe = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(email, id);
        if (existe) {
          return res.status(400).json({ error: 'Ya existe otro usuario con ese correo' });
        }
      }

      // Si se sube nueva foto, eliminar la anterior
      let fotoUrl = docente.foto_url;
      if (req.file) {
        if (docente.foto_url) {
          const oldPath = path.join(__dirname, '..', docente.foto_url);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        fotoUrl = '/uploads/perfiles/' + req.file.filename;
      }

      // Construir actualización
      let updateFields = 'nombre = ?, email = ?, facultad = ?, carrera = ?, foto_url = ?, estado = ?';
      let params = [
        nombre || docente.nombre,
        email || docente.email,
        facultad !== undefined ? facultad : docente.facultad,
        carrera !== undefined ? carrera : docente.carrera,
        fotoUrl,
        estado || docente.estado,
        id
      ];

      // Si se envía nueva contraseña
      if (password) {
        updateFields = 'nombre = ?, email = ?, facultad = ?, carrera = ?, foto_url = ?, estado = ?, password_hash = ?';
        params = [
          nombre || docente.nombre,
          email || docente.email,
          facultad !== undefined ? facultad : docente.facultad,
          carrera !== undefined ? carrera : docente.carrera,
          fotoUrl,
          estado || docente.estado,
          bcrypt.hashSync(password, 10),
          id
        ];
      }

      db.prepare(`UPDATE usuarios SET ${updateFields} WHERE id = ?`).run(...params);

      const actualizado = db.prepare(
        'SELECT id, nombre, email, facultad, carrera, foto_url, estado, creado_en FROM usuarios WHERE id = ?'
      ).get(id);

      res.json({ mensaje: 'Docente actualizado exitosamente', docente: actualizado });
    } catch (err) {
      console.error('Error al editar docente:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== DELETE /api/docentes/:id — Eliminar docente (Admin) =====
  router.delete('/:id', requiereAdmin, (req, res) => {
    try {
      const id = req.params.id;
      const docente = db.prepare("SELECT * FROM usuarios WHERE id = ? AND rol = 'docente'").get(id);

      if (!docente) {
        return res.status(404).json({ error: 'Docente no encontrado' });
      }

      // Eliminar foto si existe
      if (docente.foto_url) {
        const fotoPath = path.join(__dirname, '..', docente.foto_url);
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
      }

      db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);

      res.json({ mensaje: 'Docente eliminado exitosamente' });
    } catch (err) {
      console.error('Error al eliminar docente:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== GET /api/docentes/:id/estadisticas — Stats de un docente =====
  router.get('/:id/estadisticas', requiereLogin, (req, res) => {
    try {
      const id = req.params.id;
      const total = db.prepare('SELECT COUNT(*) as c FROM asistencias WHERE docente_id = ?').get(id).c;
      const presentes = db.prepare("SELECT COUNT(*) as c FROM asistencias WHERE docente_id = ? AND estado = 'presente'").get(id).c;
      const atrasos = db.prepare("SELECT COUNT(*) as c FROM asistencias WHERE docente_id = ? AND estado = 'atraso'").get(id).c;
      const ausentes = db.prepare("SELECT COUNT(*) as c FROM asistencias WHERE docente_id = ? AND estado = 'ausente'").get(id).c;

      const porcentaje = total > 0 ? Math.round(((presentes + atrasos) / total) * 100) : 0;

      res.json({ total, presentes, atrasos, ausentes, porcentaje });
    } catch (err) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
};
