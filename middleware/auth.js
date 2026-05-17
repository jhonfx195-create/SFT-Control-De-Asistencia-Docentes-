// Middleware: Verificar que el usuario tiene sesión activa
function requiereLogin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No ha iniciado sesión' });
  }
  next();
}

// Middleware: Verificar que el usuario es administrador
function requiereAdmin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No ha iniciado sesión' });
  }
  if (req.session.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
}

// Middleware: Verificar que el usuario es docente
function requiereDocente(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No ha iniciado sesión' });
  }
  if (req.session.usuario.rol !== 'docente') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de docente.' });
  }
  next();
}

module.exports = { requiereLogin, requiereAdmin, requiereDocente };
