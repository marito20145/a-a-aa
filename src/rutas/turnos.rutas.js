// Apertura y cierre de turno.
const express = require('express');
const turnos = require('../servicios/turnos.servicio');
const { requiereLogin } = require('../middleware/sesion');
const { ErrorNegocio } = require('../utils/errores');

const router = express.Router();
router.use(requiereLogin);

router.get('/', (req, res) => {
  const turno = turnos.abierto();
  res.render('turno', {
    turno,
    resumen: turno ? turnos.resumen(turno) : null,
    propio: Boolean(turno && turno.usuario_id === req.session.usuario.id),
  });
});

router.post('/abrir', (req, res) => {
  turnos.abrir(req.session.usuario.id, req.body.efectivo_inicial);
  req.session.mensaje = 'Turno abierto.';
  res.redirect('/caja');
});

router.post('/cerrar', (req, res) => {
  const r = turnos.cerrar(req.session.usuario, req.body.efectivo_contado);
  if (r.respaldo.error) req.session.aviso = `El turno se cerró, pero no se pudo crear el respaldo: ${r.respaldo.error}`;
  else if (r.respaldo.advertencia) req.session.aviso = r.respaldo.advertencia;
  res.redirect(`/turno/${r.turnoId}/arqueo`);
});

router.get('/:id/arqueo', (req, res) => {
  const a = turnos.arqueo(Number(req.params.id));
  if (a.turno.usuario_id !== req.session.usuario.id && req.session.usuario.rol !== 'admin') {
    throw new ErrorNegocio('Solo puedes ver el arqueo de tus propios turnos.');
  }
  res.render('arqueo', a);
});

module.exports = router;
