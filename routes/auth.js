const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

module.exports = function (db) {

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    const { email, password, rol } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    // Buscar usuario por email
    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar contraseña
    const passwordValido = bcrypt.compareSync(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar que el rol seleccionado coincida
    if (rol && usuario.rol !== rol) {
      return res.status(401).json({ error: `Este usuario no tiene el rol de ${rol}` });
    }

    // Verificar estado activo
    if (usuario.estado !== 'activo') {
      return res.status(403).json({ error: 'Su cuenta está inactiva. Contacte al administrador.' });
    }

    // Crear sesión (sin enviar el hash de contraseña)
    req.session.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      facultad: usuario.facultad,
      carrera: usuario.carrera,
      foto_url: usuario.foto_url,
      estado: usuario.estado
    };

    res.json({
      mensaje: 'Inicio de sesión exitoso',
      usuario: req.session.usuario
    });
  });

  // POST /api/auth/logout
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.json({ mensaje: 'Sesión cerrada correctamente' });
    });
  });

  // GET /api/auth/me - Obtener usuario actual
  router.get('/me', (req, res) => {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ error: 'No hay sesión activa' });
    }

    // Traer datos frescos de la BD
    const usuario = db.prepare(
      'SELECT id, nombre, email, rol, facultad, carrera, foto_url, estado, creado_en FROM usuarios WHERE id = ?'
    ).get(req.session.usuario.id);

    if (!usuario) {
      req.session.destroy();
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar sesión con datos frescos
    req.session.usuario = usuario;
    res.json({ usuario });
  });

  return router;
};
