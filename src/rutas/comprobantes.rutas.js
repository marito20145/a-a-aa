// Listado de comprobantes y tickets.
const express = require('express');
const comprobantes = require('../servicios/comprobantes.servicio');
const impresora = require('../externos/impresora');
const { requiereLogin, requiereAdmin } = require('../middleware/sesion');

const router = express.Router();

router.get('/', requiereAdmin, (req, res) => {
  const estado = req.query.estado || '';
  res.render('comprobantes', { comprobantes: comprobantes.listar(estado), estado });
});

router.get('/ticket/:ventaId', requiereLogin, (req, res) => {
  const ventaId = Number(req.params.ventaId);
  res.render('ticket', { ventaId, lineasTicket: comprobantes.ticket(ventaId) });
});

router.post('/reimprimir/:ventaId', requiereLogin, (req, res) => {
  const ventaId = Number(req.params.ventaId);
  impresora.imprimir(comprobantes.ticket(ventaId))
    .catch((e) => console.error(`No se pudo reimprimir el ticket ${ventaId}: ${e.message}`));
  req.session.mensaje = 'Ticket enviado a la impresora.';
  res.redirect(`/comprobantes/ticket/${ventaId}`);
});

module.exports = router;
