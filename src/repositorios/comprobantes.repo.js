// Consultas de comprobantes y sus series.
const db = require('../db');

const sql = {
  seriePorTipo: db.prepare('SELECT serie FROM series WHERE tipo = ? ORDER BY serie LIMIT 1'),
  siguienteNumero: db.prepare(
    'UPDATE series SET ultimo_numero = ultimo_numero + 1 WHERE serie = ? RETURNING ultimo_numero'),
  crear: db.prepare(`
    INSERT INTO comprobantes (venta_id, tipo, serie, numero)
    VALUES (@venta_id, @tipo, @serie, @numero)`),
  porVenta: db.prepare("SELECT * FROM comprobantes WHERE venta_id = ? AND tipo IN ('boleta', 'factura')"),
  cambiarEstado: db.prepare('UPDATE comprobantes SET estado = ? WHERE id = ?'),
  listar: db.prepare(`
    SELECT c.*, v.total, v.pagada_en, cl.nombre AS cliente
    FROM comprobantes c
    JOIN ventas v ON v.id = c.venta_id
    LEFT JOIN clientes cl ON cl.id = v.cliente_id
    WHERE @estado = '' OR c.estado = @estado
    ORDER BY c.id DESC LIMIT 300`),
  pendientes: db.prepare("SELECT * FROM comprobantes WHERE estado = 'pendiente' ORDER BY id LIMIT ?"),
  marcarEnviado: db.prepare(`
    UPDATE comprobantes SET estado = 'enviado', respuesta = ?, intentos = intentos + 1,
      enviado_en = datetime('now', 'localtime')
    WHERE id = ?`),
  marcarRechazado: db.prepare(
    "UPDATE comprobantes SET estado = 'rechazado', respuesta = ?, intentos = intentos + 1 WHERE id = ?"),
  registrarFallo: db.prepare('UPDATE comprobantes SET respuesta = ?, intentos = intentos + 1 WHERE id = ?'),
  contarPorEstado: db.prepare('SELECT estado, COUNT(*) AS n FROM comprobantes GROUP BY estado'),
};

module.exports = {
  seriePorTipo: (tipo) => sql.seriePorTipo.get(tipo),
  siguienteNumero: (serie) => sql.siguienteNumero.get(serie).ultimo_numero,
  crear: (c) => Number(sql.crear.run(c).lastInsertRowid),
  porVenta: (ventaId) => sql.porVenta.get(ventaId),
  cambiarEstado: (id, estado) => sql.cambiarEstado.run(estado, id),
  listar: (estado = '') => sql.listar.all({ estado }),
  pendientes: (limite) => sql.pendientes.all(limite),
  marcarEnviado: (id, respuesta) => sql.marcarEnviado.run(respuesta, id),
  marcarRechazado: (id, respuesta) => sql.marcarRechazado.run(respuesta, id),
  registrarFallo: (id, respuesta) => sql.registrarFallo.run(respuesta, id),
  contarPorEstado: () => sql.contarPorEstado.all(),
};
