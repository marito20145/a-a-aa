// Registro y edición de productos (solo administrador).
const express = require('express');
const productos = require('../servicios/productos.servicio');
const { requiereAdmin } = require('../middleware/sesion');

const router = express.Router();
router.use(requiereAdmin);

router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim();
  res.render('productos', { productos: productos.listar(q), q });
});

router.get('/nuevo', (req, res) => {
  res.render('producto-form', { producto: null });
});

router.post('/', (req, res) => {
  productos.crear(req.body, req.session.usuario.id);
  req.session.mensaje = `Producto "${req.body.nombre}" registrado.`;
  res.redirect('/productos');
});

router.get('/:id/editar', (req, res) => {
  res.render('producto-form', { producto: productos.obtener(Number(req.params.id)) });
});

router.post('/:id', (req, res) => {
  productos.actualizar(Number(req.params.id), req.body);
  req.session.mensaje = 'Producto actualizado.';
  res.redirect('/productos');
});

router.post('/:id/activo', (req, res) => {
  productos.cambiarActivo(Number(req.params.id), req.body.activo === '1');
  res.redirect('/productos');
});

module.exports = router;
