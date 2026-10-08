// Consultas de ventas y su detalle.
const db = require('../db');

const sql = {
  abiertaPorTurno: db.prepare("SELECT * FROM ventas WHERE turno_id = ? AND estado = 'abierta'"),
  porId: db.prepare('SELECT * FROM ventas WHERE id = ?'),
  crear: db.prepare('INSERT INTO ventas (turno_id) VALUES (?)'),
  detalles: db.prepare(`
    SELECT d.*, p.tipo, p.afectacion_igv
    FROM detalle_venta d JOIN productos p ON p.id = d.producto_id
    WHERE d.venta_id = ? ORDER BY d.id`),
  detallePorId: db.prepare('SELECT * FROM detalle_venta WHERE id = ?'),
  lineaExistente: db.prepare(
    'SELECT * FROM detalle_venta WHERE venta_id = ? AND producto_id = ? AND precio_unitario = ?'),
  agregarDetalle: db.prepare(`
    INSERT INTO detalle_venta (venta_id, producto_id, descripcion, cantidad, precio_unitario, subtotal)
    VALUES (@venta_id, @producto_id, @descripcion, @cantidad, @precio_unitario, @subtotal)`),
  actualizarDetalle: db.prepare('UPDATE detalle_venta SET cantidad = ?, subtotal = ? WHERE id = ?'),
  quitarDetalle: db.prepare('DELETE FROM detalle_venta WHERE id = ?'),
  eliminarAbierta: db.prepare("DELETE FROM ventas WHERE id = ? AND estado = 'abierta'"),
  marcarPagada: db.prepare(`
    UPDATE ventas SET estado = 'pagada', total = ?, cliente_id = ?, pagada_en = datetime('now', 'localtime')
    WHERE id = ? AND estado = 'abierta'`),
  marcarAnulada: db.prepare(`
    UPDATE ventas SET estado = 'anulada', anulada_en = datetime('now', 'localtime')
    WHERE id = ? AND estado = 'pagada'`),
  resumenTurno: db.prepare(`
    SELECT COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total
    FROM ventas WHERE turno_id = ? AND estado = 'pagada'`),
  resumenDia: db.prepare(`
    SELECT COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total
    FROM ventas WHERE estado = 'pagada' AND date(pagada_en) = ?`),
  anuladasDia: db.prepare(
    "SELECT COUNT(*) AS n FROM ventas WHERE estado = 'anulada' AND date(pagada_en) = ?"),
  delDia: db.prepare(`
    SELECT v.*, c.serie, c.numero, c.tipo AS tipo_comprobante, c.estado AS estado_comprobante,
           u.nombre AS cajero, cl.nombre AS cliente
    FROM ventas v
    JOIN turnos t ON t.id = v.turno_id
    JOIN usuarios u ON u.id = t.usuario_id
    LEFT JOIN comprobantes c ON c.venta_id = v.id AND c.tipo IN ('boleta', 'factura')
    LEFT JOIN clientes cl ON cl.id = v.cliente_id
    WHERE v.estado IN ('pagada', 'anulada') AND date(v.pagada_en) = ?
    ORDER BY v.pagada_en DESC, v.id DESC`),
  masVendidos: db.prepare(`
    SELECT p.id, p.nombre, p.tipo, SUM(d.cantidad) AS cantidad, SUM(d.subtotal) AS total
    FROM detalle_venta d
    JOIN ventas v ON v.id = d.venta_id
    JOIN productos p ON p.id = d.producto_id
    WHERE v.estado = 'pagada' AND date(v.pagada_en) = ?
    GROUP BY p.id ORDER BY total DESC LIMIT 10`),
};

module.exports = {
  abiertaPorTurno: (turnoId) => sql.abiertaPorTurno.get(turnoId),
  porId: (id) => sql.porId.get(id),
  crear: (turnoId) => Number(sql.crear.run(turnoId).lastInsertRowid),
  detalles: (ventaId) => sql.detalles.all(ventaId),
  detallePorId: (id) => sql.detallePorId.get(id),
  lineaExistente: (ventaId, productoId, precio) => sql.lineaExistente.get(ventaId, productoId, precio),
  agregarDetalle: (d) => sql.agregarDetalle.run(d),
  actualizarDetalle: (id, cantidad, subtotal) => sql.actualizarDetalle.run(cantidad, subtotal, id),
  quitarDetalle: (id) => sql.quitarDetalle.run(id),
  eliminarAbierta: (id) => sql.eliminarAbierta.run(id),
  marcarPagada: (id, total, clienteId) => sql.marcarPagada.run(total, clienteId, id),
  marcarAnulada: (id) => sql.marcarAnulada.run(id),
  resumenTurno: (turnoId) => sql.resumenTurno.get(turnoId),
  resumenDia: (fecha) => sql.resumenDia.get(fecha),
  anuladasDia: (fecha) => sql.anuladasDia.get(fecha).n,
  delDia: (fecha) => sql.delDia.all(fecha),
  masVendidos: (fecha) => sql.masVendidos.all(fecha),
};
