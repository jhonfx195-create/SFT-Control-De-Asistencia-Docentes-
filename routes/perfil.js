const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requiereLogin } = require('../middleware/auth');
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
    cb(null, 'perfil_' + req.session.usuario.id + '_' + Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const tipos = /jpeg|jpg|png|gif|webp/;
    const ext = tipos.test(path.extname(file.originalname).toLowerCase());
    const mime = tipos.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  }
});

module.exports = function (db) {

  // ===== GET /api/perfil — Ver perfil propio =====
  router.get('/', requiereLogin, (req, res) => {
    try {
      const usuario = db.prepare(
        'SELECT id, nombre, email, rol, facultad, carrera, foto_url, estado, creado_en FROM usuarios WHERE id = ?'
      ).get(req.session.usuario.id);

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ usuario });
    } catch (err) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== PUT /api/perfil — Editar perfil propio =====
  router.put('/', requiereLogin, (req, res) => {
    try {
      const id = req.session.usuario.id;
      const { nombre, carrera, password_actual, password_nueva } = req.body;

      const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Si quiere cambiar contraseña, verificar la actual
      if (password_nueva) {
        if (!password_actual) {
          return res.status(400).json({ error: 'Debe ingresar su contraseña actual para cambiarla' });
        }
        if (!bcrypt.compareSync(password_actual, usuario.password_hash)) {
          return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        }
      }

      // El docente puede editar: nombre, carrera, contraseña
      // No puede cambiar: email, facultad, rol, estado (eso lo hace el admin)
      const nuevoNombre = nombre || usuario.nombre;
      const nuevaCarrera = carrera !== undefined ? carrera : usuario.carrera;

      if (password_nueva) {
        const hash = bcrypt.hashSync(password_nueva, 10);
        db.prepare('UPDATE usuarios SET nombre = ?, carrera = ?, password_hash = ? WHERE id = ?')
          .run(nuevoNombre, nuevaCarrera, hash, id);
      } else {
        db.prepare('UPDATE usuarios SET nombre = ?, carrera = ? WHERE id = ?')
          .run(nuevoNombre, nuevaCarrera, id);
      }

      // Actualizar sesión
      const actualizado = db.prepare(
        'SELECT id, nombre, email, rol, facultad, carrera, foto_url, estado FROM usuarios WHERE id = ?'
      ).get(id);
      req.session.usuario = actualizado;

      res.json({ mensaje: 'Perfil actualizado exitosamente', usuario: actualizado });
    } catch (err) {
      console.error('Error al editar perfil:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ===== POST /api/perfil/foto — Subir foto de perfil =====
  router.post('/foto', requiereLogin, upload.single('foto'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ninguna imagen' });
      }

      const id = req.session.usuario.id;
      const usuario = db.prepare('SELECT foto_url FROM usuarios WHERE id = ?').get(id);

      // Eliminar foto anterior si existe
      if (usuario && usuario.foto_url) {
        const oldPath = path.join(__dirname, '..', usuario.foto_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const fotoUrl = '/uploads/perfiles/' + req.file.filename;
      db.prepare('UPDATE usuarios SET foto_url = ? WHERE id = ?').run(fotoUrl, id);

      // Actualizar sesión
      req.session.usuario.foto_url = fotoUrl;

      res.json({ mensaje: 'Foto actualizada exitosamente', foto_url: fotoUrl });
    } catch (err) {
      console.error('Error al subir foto:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
};
