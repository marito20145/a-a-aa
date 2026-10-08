// Conexión con el proveedor de facturación electrónica (OSE/PSE). Se completa en el paso 8,
// cuando el cliente elija proveedor: cada uno tiene su propia API y formato.
const config = require('../../config');

// Debe devolver { aceptado: true/false, mensaje: '...' }
async function enviar(comprobante) {
  if (!config.facturacion.activa) throw new Error('La facturación electrónica no está configurada.');
  throw new Error(`Falta implementar el envío al proveedor para ${comprobante.serie}-${comprobante.numero}.`);
}

module.exports = { enviar };
