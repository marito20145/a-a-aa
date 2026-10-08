// Conversión y formato de dinero y peso.
// En la base de datos todo es entero: dinero en céntimos y peso en gramos.
const { ErrorNegocio } = require('./errores');

function soles(centimos) {
  const n = Math.round(Number(centimos) || 0);
  const signo = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const enteros = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${signo}S/ ${enteros}.${String(abs % 100).padStart(2, '0')}`;
}

function kg(gramos) {
  const n = Math.round(Number(gramos) || 0);
  const signo = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${signo}${Math.floor(abs / 1000)}.${String(abs % 1000).padStart(3, '0')} kg`;
}

// Lee un número escrito por el usuario ("4.50", "4,5") y lo multiplica por el factor.
function leerDecimal(texto, factor, nombre) {
  const t = String(texto ?? '').trim().replace(',', '.');
  if (t === '') return 0;
  if (!/^\d+(\.\d+)?$/.test(t)) throw new ErrorNegocio(`${nombre} no es un número válido: ${texto}`);
  return Math.round(Number(t) * factor);
}

const aCentimos = (texto, nombre = 'El monto') => leerDecimal(texto, 100, nombre);
const aGramos = (texto, nombre = 'El peso') => leerDecimal(texto, 1000, nombre);

function aEntero(texto, nombre = 'La cantidad') {
  const t = String(texto ?? '').trim();
  if (t === '') return 0;
  if (!/^\d+$/.test(t)) throw new ErrorNegocio(`${nombre} debe ser un número entero: ${texto}`);
  return parseInt(t, 10);
}

// Subtotal de una línea: por peso el precio es por kg y la cantidad en gramos.
function subtotal(tipo, precio, cantidad) {
  return tipo === 'peso' ? Math.round((precio * cantidad) / 1000) : precio * cantidad;
}

const fmtCantidad = (tipo, valor) => (tipo === 'peso' ? kg(valor) : `${valor} u`);
const fmtPrecio = (tipo, precio) => (tipo === 'peso' ? `${soles(precio)}/kg` : soles(precio));

// Para rellenar formularios: 450 -> "4.50", 1250 -> "1.250"
const aTextoSoles = (centimos) => (Number(centimos || 0) / 100).toFixed(2);
const aTextoKg = (gramos) => (Number(gramos || 0) / 1000).toFixed(3);

module.exports = {
  soles, kg, aCentimos, aGramos, aEntero, subtotal,
  fmtCantidad, fmtPrecio, aTextoSoles, aTextoKg,
};
