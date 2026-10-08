// Balanza conectada por puerto serial (USB o RS-232).
// Es asíncrona porque la balanza envía datos cuando quiere. Este archivo la escucha en segundo
// plano y guarda la última lectura; el resto del sistema solo llama a pesoActual(), que es síncrono.
const config = require('../../config');

const cfg = config.balanza;
let lectura = { gramos: 0, estable: false, momento: 0 };

// Convierte lo que envía la balanza en gramos. Ejemplos: "ST,GS,+001.250kg", "1.250 kg", "1250 g".
// El formato exacto depende de la marca: ajusta esta función con el manual del modelo.
function interpretar(linea) {
  const texto = String(linea).trim();
  const m = texto.match(/(-?\d+(?:[.,]\d+)?)\s*(kg|g)?/i);
  if (!m) return null;
  const valor = parseFloat(m[1].replace(',', '.'));
  const unidad = (m[2] || 'kg').toLowerCase();
  const gramos = Math.round(unidad === 'g' ? valor : valor * 1000);
  const inestable = /\bUS\b|inestable|unstable/i.test(texto);
  return { gramos, estable: !inestable };
}

function iniciar() {
  if (cfg.simulada) {
    lectura = { gramos: cfg.pesoSimulado, estable: true, momento: Date.now() };
    console.log('Balanza en modo simulado.');
    return;
  }
  let serial;
  try {
    serial = require('serialport');
  } catch {
    console.error('Falta la librería de la balanza. Ejecuta: npm install serialport');
    return;
  }
  const puerto = new serial.SerialPort({ path: cfg.puerto, baudRate: cfg.baudios });
  const lector = puerto.pipe(new serial.ReadlineParser({ delimiter: '\n' }));
  lector.on('data', (linea) => {
    const r = interpretar(linea);
    if (r) lectura = { ...r, momento: Date.now() };
  });
  puerto.on('error', (e) => console.error(`Balanza (${cfg.puerto}): ${e.message}`));
  if (cfg.comando) {
    setInterval(() => puerto.write(cfg.comando), cfg.intervaloMs);
  }
  console.log(`Balanza escuchando en ${cfg.puerto}.`);
}

// Devuelve la última lectura. Si tiene más de 2 segundos, se considera no estable.
function pesoActual() {
  const vigente = cfg.simulada || Date.now() - lectura.momento < 2000;
  return { gramos: lectura.gramos, estable: lectura.estable && vigente };
}

// Solo en modo simulado: fija el peso que "marca" la balanza.
function simular(gramos) {
  if (cfg.simulada) lectura = { gramos, estable: true, momento: Date.now() };
}

module.exports = { iniciar, pesoActual, simular, interpretar };
