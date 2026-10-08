// Sesión, permisos y mensajes en pantalla.
const usuarios = require('../servicios/usuarios.servicio');

// Pasa a las vistas el usuario y los mensajes pendientes (se muestran una sola vez).
function cargarDatosVista(req, res, next) {
  const s = req.session;
  res.locals.usuario = s.usuario || null;
  res.locals.mensaje = s.mensaje || null;
  res.locals.aviso = s.aviso || null;
  res.locals.error = s.error || null;
  delete s.mensaje;
  delete s.aviso;
  delete s.error;
  res.locals.rutaActual = req.path;
  next();
}

// Si todavía no hay usuarios, lleva a crear el administrador.
function exigirConfiguracionInicial(req, res, next) {
  if (req.path !== '/configuracion-inicial' && !usuarios.hayUsuarios()) {
    return res.redirect('/configuracion-inicial');
  }
  next();
}

function requiereLogin(req, res, next) {
  if (!req.session.usuario) return res.redirect('/login');
  next();
}

function requiereAdmin(req, res, next) {
  if (!req.session.usuario) return res.redirect('/login');
  if (req.session.usuario.rol !== 'admin') {
    req.session.error = 'Esa sección es solo para el administrador.';
    return res.redirect('/caja');
  }
  next();
}

module.exports = { cargarDatosVista, exigirConfiguracionInicial, requiereLogin, requiereAdmin };
