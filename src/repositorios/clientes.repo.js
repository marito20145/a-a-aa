// Consultas de clientes.
const db = require('../db');

const sql = {
  porId: db.prepare('SELECT * FROM clientes WHERE id = ?'),
  porDocumento: db.prepare('SELECT * FROM clientes WHERE tipo_documento = ? AND numero_documento = ?'),
  crear: db.prepare(`
    INSERT INTO clientes (tipo_documento, numero_documento, nombre, direccion)
    VALUES (@tipo_documento, @numero_documento, @nombre, @direccion)`),
  actualizar: db.prepare('UPDATE clientes SET nombre = @nombre, direccion = @direccion WHERE id = @id'),
  listar: db.prepare(`
    SELECT * FROM clientes
    WHERE @texto = '' OR nombre LIKE '%' || @texto || '%' OR numero_documento = @texto
    ORDER BY nombre LIMIT 300`),
};

module.exports = {
  porId: (id) => sql.porId.get(id),
  porDocumento: (tipo, numero) => sql.porDocumento.get(tipo, numero),
  crear: (c) => Number(sql.crear.run(c).lastInsertRowid),
  actualizar: (c) => sql.actualizar.run(c),
  listar: (texto = '') => sql.listar.all({ texto }),
};
