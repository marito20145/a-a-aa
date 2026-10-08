// La caja: carrito, cobro y anulación. Todo síncrono y en transacciones.
const db = require('../db');
const ventasRepo = require('../repositorios/ventas.repo');
const productosRepo = require('../repositorios/productos.repo');
const pagosRepo = require('../repositorios/pagos.repo');
const comprobantesRepo = require('../repositorios/comprobantes.repo');
const codigos = require('./codigos.servicio');
const inventario = require('./inventario.servicio');
const comprobantes = require('./comprobantes.servicio');
const clientes = require('./clientes.servicio');
const balanza = require('../externos/balanza');
const dinero = require('../utils/dinero');
const { ErrorNegocio } = require('../utils/errores');

const MEDIOS = ['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'];

function carrito(turnoId) {
  const venta = ventasRepo.abiertaPorTurno(turnoId);
  const lineas = venta ? ventasRepo.detalles(venta.id) : [];
  const total = lineas.reduce((suma, l) => suma + l.subtotal, 0);
  return { venta, lineas, total };
}

function buscar(lectura) {
  if (lectura.tipo === 'barras') return { producto: productosRepo.porCodigoBarras(lectura.codigo) };
  if (lectura.tipo === 'plu') return { producto: productosRepo.porPlu(lectura.plu) };
  // Etiqueta de balanza: primero se prueba como código normal, luego como PLU + peso.
  const exacto = productosRepo.porCodigoBarras(lectura.codigo);
  if (exacto) return { producto: exacto };
  return { producto: productosRepo.porPlu(lectura.plu), gramos: lectura.gramos };
}

const agregar = db.transaction((turnoId, texto) => {
  const lectura = codigos.interpretar(texto);
  const { producto, gramos: gramosEtiqueta } = buscar(lectura);
  if (!producto) throw new ErrorNegocio(`No hay ningún producto con el código ${lectura.codigo}.`);
  if (!producto.activo) throw new ErrorNegocio(`${producto.nombre} está desactivado.`);

  const abierta = ventasRepo.abiertaPorTurno(turnoId);
  const ventaId = abierta ? abierta.id : ventasRepo.crear(turnoId);

  if (producto.tipo === 'peso') {
    let gramos = gramosEtiqueta;
    if (gramos === undefined) {
      const peso = balanza.pesoActual();
      if (!peso.estable || peso.gramos <= 0) {
        throw new ErrorNegocio('Coloca el producto en la balanza y espera a que el peso se estabilice.');
      }
      gramos = peso.gramos;
    }
    if (gramos <= 0) throw new ErrorNegocio('La etiqueta no tiene un peso válido.');
    ventasRepo.agregarDetalle({
      venta_id: ventaId, producto_id: producto.id, descripcion: producto.nombre,
      cantidad: gramos, precio_unitario: producto.precio,
      subtotal: dinero.subtotal('peso', producto.precio, gramos),
    });
  } else {
    const existente = ventasRepo.lineaExistente(ventaId, producto.id, producto.precio);
    if (existente) {
      const cantidad = existente.cantidad + lectura.multiplicador;
      ventasRepo.actualizarDetalle(existente.id, cantidad, dinero.subtotal('unidad', producto.precio, cantidad));
    } else {
      ventasRepo.agregarDetalle({
        venta_id: ventaId, producto_id: producto.id, descripcion: producto.nombre,
        cantidad: lectura.multiplicador, precio_unitario: producto.precio,
        subtotal: dinero.subtotal('unidad', producto.precio, lectura.multiplicador),
      });
    }
  }
  return producto;
});

const quitar = db.transaction((turnoId, detalleId) => {
  const venta = ventasRepo.abiertaPorTurno(turnoId);
  const detalle = ventasRepo.detallePorId(detalleId);
  if (!venta || !detalle || detalle.venta_id !== venta.id) {
    throw new ErrorNegocio('Esa línea ya no está en la venta.');
  }
  ventasRepo.quitarDetalle(detalleId);
  if (ventasRepo.detalles(venta.id).length === 0) ventasRepo.eliminarAbierta(venta.id);
});

function cancelar(turnoId) {
  const venta = ventasRepo.abiertaPorTurno(turnoId);
  if (venta) ventasRepo.eliminarAbierta(venta.id); // el detalle se borra en cascada
}

// Cobra la venta abierta: pagos, stock, comprobante. Si algo falla, no se guarda nada.
const cobrar = db.transaction((turnoId, usuarioId, form) => {
  const { venta, lineas, total } = carrito(turnoId);
  if (!venta || lineas.length === 0) throw new ErrorNegocio('No hay productos para cobrar.');

  const montos = {};
  for (const medio of MEDIOS) montos[medio] = dinero.aCentimos(form[medio], `El monto en ${medio}`);
  const noEfectivo = MEDIOS.filter((m) => m !== 'efectivo').reduce((s, m) => s + montos[m], 0);
  if (noEfectivo > total) {
    throw new ErrorNegocio('Tarjeta, Yape, Plin y transferencia no pueden sumar más que el total: el vuelto solo se da en efectivo.');
  }
  const recibido = montos.efectivo + noEfectivo;
  if (recibido < total) throw new ErrorNegocio(`Falta ${dinero.soles(total - recibido)} para completar el pago.`);
  const vuelto = recibido - total;

  const tipoComprobante = form.comprobante === 'factura' ? 'factura' : 'boleta';
  const clienteId = clientes.resolverParaVenta({
    comprobante: tipoComprobante, documento: form.documento,
    nombre: form.cliente_nombre, direccion: form.cliente_direccion, total,
  });

  ventasRepo.marcarPagada(venta.id, total, clienteId);

  const referencia = String(form.referencia || '').trim() || null;
  for (const medio of MEDIOS) {
    const esEfectivo = medio === 'efectivo';
    const monto = esEfectivo ? montos.efectivo - vuelto : montos[medio];
    if (monto > 0) {
      pagosRepo.crear({
        venta_id: venta.id, medio, monto,
        vuelto: esEfectivo ? vuelto : 0,
        referencia: esEfectivo ? null : referencia,
      });
    }
  }

  for (const l of lineas) inventario.registrarSalida(l.producto_id, l.cantidad, venta.id, usuarioId);

  const comprobante = comprobantes.emitir(venta.id, tipoComprobante);

  const ids = [...new Set(lineas.map((l) => l.producto_id))];
  const stockBajo = ids.map((id) => productosRepo.porId(id)).filter((p) => p.stock <= p.stock_minimo);

  return { ventaId: venta.id, total, vuelto, comprobante, stockBajo };
});

// Anula una venta pagada: devuelve el stock y anula el comprobante si aún no se envió a SUNAT.
const anular = db.transaction((ventaId, usuarioId) => {
  const venta = ventasRepo.porId(ventaId);
  if (!venta || venta.estado !== 'pagada') throw new ErrorNegocio('Solo se pueden anular ventas pagadas.');
  const comp = comprobantesRepo.porVenta(ventaId);
  if (comp && comp.estado === 'enviado') {
    throw new ErrorNegocio('El comprobante ya se envió a SUNAT: para anularlo se necesita una nota de crédito.');
  }
  if (comp) comprobantesRepo.cambiarEstado(comp.id, 'anulado');
  ventasRepo.marcarAnulada(ventaId);
  for (const l of ventasRepo.detalles(ventaId)) {
    inventario.registrarMovimiento({
      productoId: l.producto_id, tipo: 'anulacion', cantidad: l.cantidad, ventaId, usuarioId, nota: 'Venta anulada',
    });
  }
});

module.exports = { carrito, agregar, quitar, cancelar, cobrar, anular };
