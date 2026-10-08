// Inicio de sesión, configuración inicial y administración de usuarios.
const express = require('express');
const usuarios = require('../servicios/usuarios.servicio');
const { requiereAdmin } = require('../middleware/sesion');
const { ErrorNegocio } = require('../utils/errores');

const router = express.Router();

router.get('/configuracion-inicial', (req, res) => {
  if (usuarios.hayUsuarios()) return res.redirect('/login');
  res.render('configuracion-inicial');
});

router.post('/configuracion-inicial', (req, res) => {
  if (usuarios.hayUsuarios()) return res.redirect('/login');
  if (req.body.clave !== req.body.clave2) throw new ErrorNegocio('Las contraseñas no coinciden.');
  usuarios.crear({ ...req.body, rol: 'admin' });
  req.session.usuario = usuarios.autenticar(req.body.usuario, req.body.clave);
  req.session.mensaje = 'Administrador creado. Empieza registrando tus productos.';
  res.redirect('/productos');
});

router.get('/login', (req, res) => {
  if (req.session.usuario) return res.redirect('/caja');
  res.render('login');
});

router.post('/login', (req, res) => {
  req.session.usuario = usuarios.autenticar(req.body.usuario, req.body.clave);
  res.redirect('/caja');
});

router.post('/salir', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

router.get('/usuarios', requiereAdmin, (req, res) => {
  res.render('usuarios', { usuarios: usuarios.listar() });
});

router.post('/usuarios', requiereAdmin, (req, res) => {
  usuarios.crear(req.body);
  req.session.mensaje = `Usuario ${req.body.usuario} creado.`;
  res.redirect('/usuarios');
});

router.post('/usuarios/:id/activo', requiereAdmin, (req, res) => {
  usuarios.cambiarActivo(Number(req.params.id), req.body.activo === '1', req.session.usuario.id);
  req.session.mensaje = 'Usuario actualizado.';
  res.redirect('/usuarios');
});

router.post('/usuarios/:id/clave', requiereAdmin, (req, res) => {
  usuarios.cambiarClave(Number(req.params.id), req.body.clave);
  req.session.mensaje = 'Contraseña cambiada.';
  res.redirect('/usuarios');
});

module.exports = router;
