// Fotos opcionales del negocio y de los productos, encontradas por el nombre del archivo.
//   public/img/negocio/logo.png, public/img/negocio/fachada.jpg
//   public/img/productos/<código de barras o PLU>.jpg
// Si no hay foto, las pantallas usan las ilustraciones de public/img/ilustraciones/.
const fs = require('fs');
const path = require('path');

const CARPETA = path.join(__dirname, '..', '..', 'public', 'img');
const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.webp'];
const REVISAR_CADA_MS = 30000; // una foto nueva aparece sin reiniciar el sistema

let cache = { momento: 0, negocio: new Map(), productos: new Map() };

function leer(subcarpeta) {
  const fotos = new Map();
  try {
    for (const archivo of fs.readdirSync(path.join(CARPETA, subcarpeta))) {
      const ext = path.extname(archivo).toLowerCase();
      const nombre = path.basename(archivo, path.extname(archivo));
      if (EXTENSIONES.includes(ext) && !fotos.has(nombre)) {
        fotos.set(nombre, `/img/${subcarpeta}/${encodeURIComponent(archivo)}`);
      }
    }
  } catch {
    // La carpeta no existe: no hay fotos.
  }
  return fotos;
}

function vigente() {
  if (Date.now() - cache.momento > REVISAR_CADA_MS) {
    cache = { momento: Date.now(), negocio: leer('negocio'), productos: leer('productos') };
  }
  return cache;
}

// 'logo' o 'fachada'
const fotoNegocio = (nombre) => vigente().negocio.get(nombre) || null;

function fotoProducto(p) {
  const fotos = vigente().productos;
  return (p.codigo_barras && fotos.get(String(p.codigo_barras)))
    || (p.plu && fotos.get(String(p.plu)))
    || null;
}

// Ilustración según el nombre del producto; si no coincide, una genérica por tipo.
const ILUSTRACIONES = [
  [/tomate/, 'tomate'],
  [/\bpapas?\b/, 'papa'],
  [/cebolla/, 'cebolla'],
  [/lim[oó]n/, 'limon'],
  [/pl[aá]tano|banano/, 'platano'],
  [/\bpan\b|panes|bizcocho|tolete/, 'pan'],
  [/pollo|gallina/, 'pollo'],
];

function ilustracionProducto(p) {
  const nombre = String(p.nombre || p.descripcion || '').toLowerCase();
  const encontrada = ILUSTRACIONES.find(([patron]) => patron.test(nombre));
  const archivo = encontrada ? encontrada[1] : (p.tipo === 'peso' ? 'peso' : 'unidad');
  return `/img/ilustraciones/plu-${archivo}.svg`;
}

// Foto si existe; si no, la ilustración.
const imagenProducto = (p) => fotoProducto(p) || ilustracionProducto(p);

module.exports = { fotoNegocio, fotoProducto, ilustracionProducto, imagenProducto };
