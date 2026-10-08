// Stock y kardex. El stock solo cambia registrando un movimiento.
const movimientosRepo = require('../repositorios/movimientos.repo');
const productosRepo = require('../repositorios/productos.repo');
const codigos = require('./codigos.servicio');
const dinero = require('../utils/dinero');
const { ErrorNegocio } = require('../utils/errores');

function registrarMovimiento({ productoId, tipo, cantidad, ventaId = null, usuarioId = null, nota = null }) {
  if (!Number.isInteger(cantidad) || cantidad === 0) {
    throw new ErrorNegocio('La cantidad del movimiento no es válida.');
  }
  movimientosRepo.crear({
    producto_id: productoId, tipo, cantidad, venta_id: ventaId, usuario_id: usuarioId, nota,
  });
}

function registrarSalida(productoId, cantidad, ventaId, usuarioId) {
  registrarMovimiento({ productoId, tipo: 'venta', cantidad: -cantidad, ventaId, usuarioId });
}

// Ingreso de mercadería o ajuste desde la pantalla de inventario.
function registrarDesdeFormulario(datos, usuarioId) {
  const producto = codigos.buscarProducto(datos.codigo);
  if (!producto) throw new ErrorNegocio('No hay ningún producto con ese código de barras o PLU.');

  const tipo = datos.tipo === 'ajuste' ? 'ajuste' : 'compra';
  const valor = producto.tipo === 'peso'
    ? dinero.aGramos(datos.cantidad, 'La cantidad')
    : dinero.aEntero(datos.cantidad, 'La cantidad');
  if (valor <= 0) throw new ErrorNegocio('Ingresa una cantidad mayor que cero.');

  const nota = String(datos.nota || '').trim() || null;
  if (tipo === 'ajuste' && !nota) {
    throw new ErrorNegocio('Escribe el motivo del ajuste, por ejemplo: merma o conteo físico.');
  }
  const signo = tipo === 'ajuste' && datos.sentido === 'restar' ? -1 : 1;
  registrarMovimiento({ productoId: producto.id, tipo, cantidad: signo * valor, usuarioId, nota });
  return productosRepo.porId(producto.id);
}

function kardex(productoId) {
  const producto = productosRepo.porId(productoId);
  if (!producto) throw new ErrorNegocio('No existe ese producto.');
  return { producto, movimientos: movimientosRepo.porProducto(productoId) };
}

module.exports = { registrarMovimiento, registrarSalida, registrarDesdeFormulario, kardex };
