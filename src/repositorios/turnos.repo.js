// Consultas de turnos de caja.
const db = require('../db');

const sql = {
  abierto: db.prepare(`
    SELECT t.*, u.nombre AS cajero FROM turnos t JOIN usuarios u ON u.id = t.usuario_id
    WHERE t.cerrado_en IS NULL`),
  porId: db.prepare(`
    SELECT t.*, u.nombre AS cajero FROM turnos t JOIN usuarios u ON u.id = t.usuario_id
    WHERE t.id = ?`),
  crear: db.prepare('INSERT INTO turnos (usuario_id, efectivo_inicial) VALUES (?, ?)'),
  cerrar: db.prepare(`
    UPDATE turnos SET cerrado_en = datetime('now', 'localtime'), efectivo_contado = ?
    WHERE id = ? AND cerrado_en IS NULL`),
  delDia: db.prepare(`
    SELECT t.*, u.nombre AS cajero FROM turnos t JOIN usuarios u ON u.id = t.usuario_id
    WHERE date(t.abierto_en) = ? ORDER BY t.id DESC`),
};

module.exports = {
  abierto: () => sql.abierto.get(),
  porId: (id) => sql.porId.get(id),
  crear: (usuarioId, efectivoInicial) => Number(sql.crear.run(usuarioId, efectivoInicial).lastInsertRowid),
  cerrar: (id, efectivoContado) => sql.cerrar.run(efectivoContado, id),
  delDia: (fecha) => sql.delDia.all(fecha),
};
