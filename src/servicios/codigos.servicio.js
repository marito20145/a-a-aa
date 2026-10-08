// Interpreta lo que llega del lector o del teclado en la caja.
//   7751234567890    -> código de barras (producto por unidad)
//   3*7751234567890  -> 3 unidades de ese producto
//   101              -> PLU de 1 a 5 dígitos (producto por peso, o por unidad sin código)
//   2 + 12 dígitos   -> etiqueta de balanza etiquetadora: 20 PPPPP GGGGG C (PLU y peso en gramos)
const productosRepo = require('../repositorios/productos.repo');
const { ErrorNegocio } = require('../utils/errores');

const normalizarPlu = (texto) => String(parseInt(texto, 10));

function interpretar(texto) {
  const limpio = String(texto || '').trim();
  if (!limpio) throw new ErrorNegocio('Escanea un código o escribe un PLU.');

  let multiplicador = 1;
  let codigo = limpio;
  const m = limpio.match(/^(\d{1,3})\s*[*xX]\s*(\S+)$/);
  if (m) {
    multiplicador = parseInt(m[1], 10);
    codigo = m[2];
    if (multiplicador < 1) throw new ErrorNegocio('La cantidad debe ser al menos 1.');
  }

  if (/^\d{1,5}$/.test(codigo)) return { tipo: 'plu', codigo, plu: normalizarPlu(codigo), multiplicador };
  if (/^2\d{12}$/.test(codigo)) {
    return {
      tipo: 'etiqueta', codigo, multiplicador: 1,
      plu: normalizarPlu(codigo.slice(2, 7)),
      gramos: parseInt(codigo.slice(7, 12), 10),
    };
  }
  return { tipo: 'barras', codigo, multiplicador };
}

// Busca un producto por código de barras o PLU (para inventario y caja).
function buscarProducto(texto) {
  const codigo = String(texto || '').trim();
  if (!codigo) return undefined;
  if (/^\d{1,5}$/.test(codigo)) return productosRepo.porPlu(normalizarPlu(codigo));
  return productosRepo.porCodigoBarras(codigo);
}

module.exports = { interpretar, buscarProducto, normalizarPlu };
