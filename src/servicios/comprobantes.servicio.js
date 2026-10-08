// Comprobantes (boleta/factura), cálculo de IGV y armado del ticket.
const config = require('../../config');
const comprobantesRepo = require('../repositorios/comprobantes.repo');
const ventasRepo = require('../repositorios/ventas.repo');
const pagosRepo = require('../repositorios/pagos.repo');
const clientesRepo = require('../repositorios/clientes.repo');
const turnosRepo = require('../repositorios/turnos.repo');
const dinero = require('../utils/dinero');
const { ErrorNegocio } = require('../utils/errores');

const codigo = (serie, numero) => `${serie}-${String(numero).padStart(8, '0')}`;
const NOMBRES = { boleta: 'BOLETA DE VENTA', factura: 'FACTURA', nota_credito: 'NOTA DE CRÉDITO' };
const MEDIOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia' };

// Asigna el siguiente número de la serie. Se llama dentro de la transacción del cobro.
function emitir(ventaId, tipo) {
  const s = comprobantesRepo.seriePorTipo(tipo);
  if (!s) throw new ErrorNegocio(`No hay una serie configurada para ${tipo}.`);
  const numero = comprobantesRepo.siguienteNumero(s.serie);
  const id = comprobantesRepo.crear({ venta_id: ventaId, tipo, serie: s.serie, numero });
  return { id, tipo, serie: s.serie, numero, codigo: codigo(s.serie, numero) };
}

// Los precios incluyen IGV. Separa la base imponible y el IGV de lo gravado.
function impuestos(lineas) {
  const suma = { gravado: 0, exonerado: 0, inafecto: 0 };
  for (const l of lineas) suma[l.afectacion_igv] += l.subtotal;
  const base = Math.round(suma.gravado / (1 + config.igv));
  return {
    gravada: base,
    igv: suma.gravado - base,
    exonerada: suma.exonerado,
    inafecta: suma.inafecto,
    total: suma.gravado + suma.exonerado + suma.inafecto,
  };
}

// Devuelve el ticket como lista de líneas de texto (sirve para imprimir y para verlo en pantalla).
function ticket(ventaId) {
  const venta = ventasRepo.porId(ventaId);
  if (!venta || venta.estado === 'abierta') throw new ErrorNegocio('No existe esa venta.');
  const lineas = ventasRepo.detalles(ventaId);
  const pagos = pagosRepo.porVenta(ventaId);
  const comp = comprobantesRepo.porVenta(ventaId);
  const cliente = venta.cliente_id ? clientesRepo.porId(venta.cliente_id) : null;
  const turno = turnosRepo.porId(venta.turno_id);
  const imp = impuestos(lineas);

  const W = config.impresora.ancho;
  const sep = '-'.repeat(W);
  const centrar = (t) => ' '.repeat(Math.max(0, Math.floor((W - t.length) / 2))) + t;
  const fila = (izq, der) => {
    const espacio = W - der.length - 1;
    const izquierda = izq.length > espacio ? izq.slice(0, espacio) : izq;
    return izquierda + ' '.repeat(W - izquierda.length - der.length) + der;
  };
  const n = config.negocio;

  const t = [centrar(n.nombre.toUpperCase())];
  if (n.ruc) t.push(centrar(`RUC ${n.ruc}`));
  if (n.direccion) t.push(centrar(n.direccion.slice(0, W)));
  if (n.telefono) t.push(centrar(`Tel. ${n.telefono}`));
  t.push(sep);
  if (comp) t.push(`${NOMBRES[comp.tipo]} ${codigo(comp.serie, comp.numero)}`);
  t.push(`Fecha: ${venta.pagada_en}`);
  if (turno) t.push(`Cajero: ${turno.cajero}`);
  if (cliente) t.push(`Cliente: ${cliente.nombre}`.slice(0, W), `${cliente.tipo_documento}: ${cliente.numero_documento}`);
  if (venta.estado === 'anulada') t.push('*** VENTA ANULADA ***');
  t.push(sep);

  for (const l of lineas) {
    t.push(l.descripcion.slice(0, W));
    t.push(fila(`  ${dinero.fmtCantidad(l.tipo, l.cantidad)} x ${dinero.fmtPrecio(l.tipo, l.precio_unitario)}`, dinero.soles(l.subtotal)));
  }
  t.push(sep);
  if (imp.gravada) t.push(fila('Op. gravada', dinero.soles(imp.gravada)), fila(`IGV ${Math.round(config.igv * 100)}%`, dinero.soles(imp.igv)));
  if (imp.exonerada) t.push(fila('Op. exonerada', dinero.soles(imp.exonerada)));
  if (imp.inafecta) t.push(fila('Op. inafecta', dinero.soles(imp.inafecta)));
  t.push(fila('TOTAL', dinero.soles(imp.total)));
  t.push(sep);
  for (const p of pagos) {
    t.push(fila(MEDIOS[p.medio], dinero.soles(p.monto + p.vuelto)));
    if (p.vuelto) t.push(fila('Vuelto', dinero.soles(p.vuelto)));
  }
  t.push(sep);
  if (!config.facturacion.activa) t.push('Comprobante no enviado a SUNAT (prueba)');
  t.push(centrar('Gracias por su compra'));
  return t;
}

function listar(estado) {
  const valido = ['pendiente', 'enviado', 'rechazado', 'anulado'].includes(estado) ? estado : '';
  return comprobantesRepo.listar(valido).map((c) => ({ ...c, codigo: codigo(c.serie, c.numero) }));
}

module.exports = { emitir, impuestos, ticket, listar, codigo, MEDIOS, contarPorEstado: comprobantesRepo.contarPorEstado };
