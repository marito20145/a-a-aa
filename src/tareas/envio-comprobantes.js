// Tarea en segundo plano: envía al proveedor los comprobantes pendientes.
// La caja nunca espera a internet: las ventas se guardan como "pendiente" y se envían aquí.
const config = require('../../config');
const comprobantesRepo = require('../repositorios/comprobantes.repo');
const facturacion = require('../externos/facturacion');

let enviando = false;

async function enviarPendientes() {
  if (enviando) return;
  enviando = true;
  try {
    for (const c of comprobantesRepo.pendientes(20)) {
      try {
        const r = await facturacion.enviar(c);
        if (r.aceptado) comprobantesRepo.marcarEnviado(c.id, r.mensaje || 'Aceptado');
        else comprobantesRepo.marcarRechazado(c.id, r.mensaje || 'Rechazado');
      } catch (e) {
        comprobantesRepo.registrarFallo(c.id, e.message); // se reintenta en la siguiente vuelta
      }
    }
  } finally {
    enviando = false;
  }
}

function iniciar() {
  if (!config.facturacion.activa) return;
  setInterval(enviarPendientes, 60 * 1000);
  console.log('Envío de comprobantes activo (cada minuto).');
}

module.exports = { iniciar, enviarPendientes };
