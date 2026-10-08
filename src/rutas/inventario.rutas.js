// Ingreso de mercadería, ajustes y kardex (solo administrador).
const express = require('express');
const inventario = require('../servicios/inventario.servicio');
const productos = require('../servicios/productos.servicio');
const dinero = require('../utils/dinero');
const { requiereAdmin } = require('../middleware/sesion');

const router = express.Router();
router.use(requiereAdmin);

router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim();
  res.render('inventario', { productos: productos.listar(q), q });
});

router.post('/movimiento', (req, res) => {
  const p = inventario.registrarDesdeFormulario(req.body, req.session.usuario.id);
  req.session.mensaje = `Movimiento registrado. Stock de ${p.nombre}: ${dinero.fmtCantidad(p.tipo, p.stock)}.`;
  res.redirect('/inventario');
});

router.get('/:id', (req, res) => {
  res.render('kardex', inventario.kardex(Number(req.params.id)));
});

module.exports = router;
