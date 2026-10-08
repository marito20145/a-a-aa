// Consultas de usuarios.
const db = require('../db');

const sql = {
  contar: db.prepare('SELECT COUNT(*) AS n FROM usuarios'),
  contarAdminsActivos: db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1"),
  porUsuario: db.prepare('SELECT * FROM usuarios WHERE usuario = ?'),
  porId: db.prepare('SELECT * FROM usuarios WHERE id = ?'),
  listar: db.prepare('SELECT id, nombre, usuario, rol, activo, creado_en FROM usuarios ORDER BY activo DESC, nombre'),
  crear: db.prepare(`
    INSERT INTO usuarios (nombre, usuario, clave_hash, rol)
    VALUES (@nombre, @usuario, @clave_hash, @rol)`),
  cambiarActivo: db.prepare('UPDATE usuarios SET activo = ? WHERE id = ?'),
  cambiarClave: db.prepare('UPDATE usuarios SET clave_hash = ? WHERE id = ?'),
};

module.exports = {
  contar: () => sql.contar.get().n,
  contarAdminsActivos: () => sql.contarAdminsActivos.get().n,
  porUsuario: (usuario) => sql.porUsuario.get(usuario),
  porId: (id) => sql.porId.get(id),
  listar: () => sql.listar.all(),
  crear: (u) => Number(sql.crear.run(u).lastInsertRowid),
  cambiarActivo: (id, activo) => sql.cambiarActivo.run(activo ? 1 : 0, id),
  cambiarClave: (id, hash) => sql.cambiarClave.run(hash, id),
};
