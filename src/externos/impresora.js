// Impresora térmica de tickets (y cajón de dinero conectado a ella).
// En modo simulado, cada ticket se guarda como archivo de texto en la carpeta tickets/.
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const cfg = config.impresora;

async function imprimir(lineas, { abrirCajon = false } = {}) {
  if (cfg.simulada) {
    fs.mkdirSync(config.rutaTickets, { recursive: true });
    const archivo = path.join(config.rutaTickets, `ticket-${Date.now()}.txt`);
    fs.writeFileSync(archivo, lineas.join('\n'), 'utf8');
    console.log(`Ticket simulado guardado en ${archivo}${abrirCajon ? ' (se abriría el cajón)' : ''}`);
    return;
  }

  // Requiere: npm install node-thermal-printer
  // La "interfaz" depende de la conexión (red, USB compartida, etc.): se ajusta al tener la impresora.
  const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
  const impresora = new ThermalPrinter({
    type: cfg.tipo === 'star' ? PrinterTypes.STAR : PrinterTypes.EPSON,
    interface: cfg.interfaz,
    width: cfg.ancho,
  });
  for (const linea of lineas) impresora.println(linea);
  impresora.cut();
  if (abrirCajon && cfg.abrirCajon) impresora.openCashDrawer();
  await impresora.execute();
}

module.exports = { imprimir };
