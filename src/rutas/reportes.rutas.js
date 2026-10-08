// Reportes del día, anulaciones y respaldo manual (solo administrador).
const express = require('express');
const reportes = require('../servicios/reportes.servicio');
const caja = require('../servicios/caja.servicio');
const respaldos = require('../servicios/respaldos.servicio');
const { requiereAdmin } = require('../middleware/sesion');

const router = express.Router();
router.use(requiereAdmin);

router.get('/', (req, res) => {
  res.render('reportes', reportes.delDia(req.query.fecha));
});

router.post('/anular/:ventaId', (req, res) => {
  caja.anular(Number(req.params.ventaId), req.session.usuario.id);
  req.session.mensaje = 'Venta anulada y stock devuelto.';
  res.redirect(`/reportes?fecha=${encodeURIComponent(req.body.fecha || '')}`);
});

router.post('/respaldo', (req, res) => {
  const r = respaldos.crear('manual');
  req.session.mensaje = `Respaldo creado: ${r.archivo}`;
  if (r.advertencia) req.session.aviso = r.advertencia;
  res.redirect('/reportes');
});

module.exports = router;
