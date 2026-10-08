// Clientes (solo administrador). Se crean al cobrar; aquí se consultan y corrigen.
const express = require('express');
const clientes = require('../servicios/clientes.servicio');
const { requiereAdmin } = require('../middleware/sesion');

const router = express.Router();
router.use(requiereAdmin);

router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim();
  res.render('clientes', { clientes: clientes.listar(q), q });
});

router.get('/:id/editar', (req, res) => {
  res.render('cliente-form', { cliente: clientes.obtener(Number(req.params.id)) });
});

router.post('/:id', (req, res) => {
  clientes.actualizar(Number(req.params.id), req.body);
  req.session.mensaje = 'Cliente actualizado.';
  res.redirect('/clientes');
});

module.exports = router;
