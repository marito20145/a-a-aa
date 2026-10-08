// Consultas de productos. Solo SQL, sin reglas de negocio.
const db = require('../db');

const sql = {
  porId: db.prepare('SELECT * FROM productos WHERE id = ?'),
  porCodigoBarras: db.prepare('SELECT * FROM productos WHERE codigo_barras = ?'),
  porPlu: db.prepare('SELECT * FROM productos WHERE plu = ?'),
  listar: db.prepare(`
    SELECT * FROM productos
    WHERE @texto = '' OR nombre LIKE '%' || @texto || '%' OR codigo_barras = @texto OR plu = @texto
    ORDER BY activo DESC, nombre
    LIMIT 300`),
  crear: db.prepare(`
    INSERT INTO productos (codigo_barras, plu, nombre, tipo, precio, stock_minimo, afectacion_igv)
    VALUES (@codigo_barras, @plu, @nombre, @tipo, @precio, @stock_minimo, @afectacion_igv)`),
  actualizar: db.prepare(`
    UPDATE productos
    SET codigo_barras = @codigo_barras, plu = @plu, nombre = @nombre, tipo = @tipo,
        precio = @precio, stock_minimo = @stock_minimo, afectacion_igv = @afectacion_igv
    WHERE id = @id`),
  cambiarActivo: db.prepare('UPDATE productos SET activo = ? WHERE id = ?'),
  stockBajo: db.prepare('SELECT * FROM productos WHERE activo = 1 AND stock <= stock_minimo ORDER BY nombre'),
  contar: db.prepare('SELECT COUNT(*) AS n FROM productos'),
};

module.exports = {
  porId: (id) => sql.porId.get(id),
  porCodigoBarras: (codigo) => sql.porCodigoBarras.get(codigo),
  porPlu: (plu) => sql.porPlu.get(plu),
  listar: (texto = '') => sql.listar.all({ texto }),
  crear: (p) => Number(sql.crear.run(p).lastInsertRowid),
  actualizar: (p) => sql.actualizar.run(p),
  cambiarActivo: (id, activo) => sql.cambiarActivo.run(activo ? 1 : 0, id),
  stockBajo: () => sql.stockBajo.all(),
  contar: () => sql.contar.get().n,
};
