// Usuarios, contraseñas e inicio de sesión.
const crypto = require('crypto');
const repo = require('../repositorios/usuarios.repo');
const { ErrorNegocio } = require('../utils/errores');

function hashClave(clave) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(clave, sal, 64).toString('hex');
  return `${sal}:${hash}`;
}

function claveCorrecta(clave, guardada) {
  const [sal, hash] = guardada.split(':');
  const calculado = crypto.scryptSync(clave, sal, 64);
  const original = Buffer.from(hash, 'hex');
  return original.length === calculado.length && crypto.timingSafeEqual(original, calculado);
}

function validarClave(clave) {
  if (typeof clave !== 'string' || clave.length < 6) {
    throw new ErrorNegocio('La contraseña debe tener al menos 6 caracteres.');
  }
}

function hayUsuarios() {
  return repo.contar() > 0;
}

function crear({ nombre, usuario, clave, rol }) {
  nombre = String(nombre || '').trim();
  usuario = String(usuario || '').trim().toLowerCase();
  if (!nombre) throw new ErrorNegocio('Escribe el nombre de la persona.');
  if (!/^[a-z0-9._-]{3,20}$/.test(usuario)) {
    throw new ErrorNegocio('El usuario debe tener de 3 a 20 letras o números, sin espacios.');
  }
  if (!['cajero', 'admin'].includes(rol)) throw new ErrorNegocio('Elige un rol válido.');
  validarClave(clave);
  if (repo.porUsuario(usuario)) throw new ErrorNegocio(`El usuario "${usuario}" ya existe.`);
  return repo.crear({ nombre, usuario, clave_hash: hashClave(clave), rol });
}

function autenticar(usuario, clave) {
  const u = repo.porUsuario(String(usuario || '').trim().toLowerCase());
  if (!u || !u.activo || !claveCorrecta(String(clave || ''), u.clave_hash)) {
    throw new ErrorNegocio('Usuario o contraseña incorrectos.');
  }
  return { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol };
}

function cambiarActivo(id, activo, idActual) {
  const u = repo.porId(id);
  if (!u) throw new ErrorNegocio('No existe ese usuario.');
  if (!activo && id === idActual) throw new ErrorNegocio('No puedes desactivar tu propio usuario.');
  if (!activo && u.rol === 'admin' && repo.contarAdminsActivos() <= 1) {
    throw new ErrorNegocio('Debe quedar al menos un administrador activo.');
  }
  repo.cambiarActivo(id, activo);
}

function cambiarClave(id, clave) {
  if (!repo.porId(id)) throw new ErrorNegocio('No existe ese usuario.');
  validarClave(clave);
  repo.cambiarClave(id, hashClave(clave));
}

module.exports = { hayUsuarios, crear, autenticar, listar: repo.listar, cambiarActivo, cambiarClave };
