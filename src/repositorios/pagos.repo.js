// Consultas de pagos.
const db = require('../db');

const sql = {
  crear: db.prepare(`
    INSERT INTO pagos (venta_id, medio, monto, vuelto, referencia)
    VALUES (@venta_id, @medio, @monto, @vuelto, @referencia)`),
  porVenta: db.prepare('SELECT * FROM pagos WHERE venta_id = ? ORDER BY id'),
  porMedioTurno: db.prepare(`
    SELECT p.medio, SUM(p.monto) AS total
    FROM pagos p JOIN ventas v ON v.id = p.venta_id
    WHERE v.turno_id = ? AND v.estado = 'pagada'
    GROUP BY p.medio ORDER BY total DESC`),
  porMedioDia: db.prepare(`
    SELECT p.medio, SUM(p.monto) AS total
    FROM pagos p JOIN ventas v ON v.id = p.venta_id
    WHERE v.estado = 'pagada' AND date(v.pagada_en) = ?
    GROUP BY p.medio ORDER BY total DESC`),
};

module.exports = {
  crear: (p) => sql.crear.run(p),
  porVenta: (ventaId) => sql.porVenta.all(ventaId),
  porMedioTurno: (turnoId) => sql.porMedioTurno.all(turnoId),
  porMedioDia: (fecha) => sql.porMedioDia.all(fecha),
};
