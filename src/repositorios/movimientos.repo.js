// Consultas del kardex (movimientos de stock).
// Al insertar un movimiento, el trigger de la base de datos actualiza el stock del producto.
const db = require('../db');

const sql = {
  crear: db.prepare(`
    INSERT INTO movimientos_stock (producto_id, tipo, cantidad, venta_id, usuario_id, nota)
    VALUES (@producto_id, @tipo, @cantidad, @venta_id, @usuario_id, @nota)`),
  porProducto: db.prepare(`
    SELECT m.*, u.nombre AS usuario
    FROM movimientos_stock m LEFT JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.producto_id = ? ORDER BY m.id DESC LIMIT 300`),
  contarPorProducto: db.prepare('SELECT COUNT(*) AS n FROM movimientos_stock WHERE producto_id = ?'),
};

module.exports = {
  crear: (m) => sql.crear.run(m),
  porProducto: (productoId) => sql.porProducto.all(productoId),
  contarPorProducto: (productoId) => sql.contarPorProducto.get(productoId).n,
};
