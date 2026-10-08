// Pantalla de caja: escanear, quitar, cancelar y cobrar.
const express = require('express');
const caja = require('../servicios/caja.servicio');
const turnos = require('../servicios/turnos.servicio');
const productos = require('../servicios/productos.servicio');
const comprobantes = require('../servicios/comprobantes.servicio');
const balanza = require('../externos/balanza');
const impresora = require('../externos/impresora');
const { requiereLogin } = require('../middleware/sesion');
const dinero = require('../utils/dinero');
const imagenes = require('../utils/imagenes');
const config = require('../../config');

const router = express.Router();
router.use(requiereLogin);

// Para vender hace falta un turno abierto por el mismo usuario.
router.use((req, res, next) => {
  const turno = turnos.abierto();
  if (!turno || turno.usuario_id !== req.session.usuario.id) {
    req.session.error = turno
      ? `El turno de ${turno.cajero} sigue abierto. Debe cerrarse antes de que vendas tú.`
      : 'Abre tu turno para empezar a vender.';
    return res.redirect('/turno');
  }
  req.turno = turno;
  next();
});

router.get('/', (req, res) => {
  const { lineas, total } = caja.carrito(req.turno.id);
  // La miniatura de cada línea se busca por el código o PLU del producto.
  const conCodigos = lineas.map((l) => {
    const p = productos.obtener(l.producto_id);
    return { ...l, codigo_barras: p.codigo_barras, plu: p.plu };
  });
  // Botones rápidos: productos activos con PLU (frutas, verduras, pan, pollo...).
  const rapidos = productos.listar().filter((p) => p.activo && p.plu).slice(0, 12);
  res.render('caja', {
    turno: req.turno, lineas: conCodigos, total, rapidos, ultimaVenta: req.session.ultimaVenta || null,
  });
});

// Buscador por nombre (F4 en la caja): productos activos en JSON.
router.get('/buscar', (req, res) => {
  const q = String(req.query.q || '').trim();
  const encontrados = q ? productos.listar(q).filter((p) => p.activo && (p.codigo_barras || p.plu)).slice(0, 20) : [];
  res.json(encontrados.map((p) => ({
    nombre: p.nombre,
    codigo: p.codigo_barras || p.plu,
    precio: dinero.fmtPrecio(p.tipo, p.precio),
    stock: dinero.fmtCantidad(p.tipo, p.stock),
    imagen: imagenes.imagenProducto(p),
  })));
});

router.post('/agregar', (req, res) => {
  if (config.balanza.simulada && String(req.body.peso_simulado || '').trim()) {
    balanza.simular(dinero.aGramos(req.body.peso_simulado));
  }
  caja.agregar(req.turno.id, req.body.codigo);
  res.redirect('/caja');
});

router.post('/quitar/:id', (req, res) => {
  caja.quitar(req.turno.id, Number(req.params.id));
  res.redirect('/caja');
});

router.post('/cancelar', (req, res) => {
  caja.cancelar(req.turno.id);
  req.session.mensaje = 'Venta cancelada.';
  res.redirect('/caja');
});

router.get('/cobrar', (req, res) => {
  const { lineas, total } = caja.carrito(req.turno.id);
  if (lineas.length === 0) {
    req.session.error = 'No hay productos para cobrar.';
    return res.redirect('/caja');
  }
  res.render('cobro', { lineas, total, montoDocumento: config.montoBoletaConDocumento });
});

router.post('/cobrar', (req, res) => {
  const r = caja.cobrar(req.turno.id, req.session.usuario.id, req.body);
  req.session.ultimaVenta = r.ventaId;
  req.session.mensaje = `Venta registrada: ${r.comprobante.codigo} por ${dinero.soles(r.total)}.`
    + (r.vuelto > 0 ? ` Vuelto: ${dinero.soles(r.vuelto)}.` : '');
  if (r.stockBajo.length) {
    req.session.aviso = `Stock bajo: ${r.stockBajo.map((p) => p.nombre).join(', ')}.`;
  }
  // La impresión va en segundo plano: si la impresora falla, la venta ya quedó guardada.
  impresora.imprimir(comprobantes.ticket(r.ventaId), { abrirCajon: true })
    .catch((e) => console.error(`No se pudo imprimir el ticket de la venta ${r.ventaId}: ${e.message}`));
  res.redirect('/caja');
});

module.exports = router;
