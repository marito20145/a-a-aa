// Copias de seguridad de la base de datos.
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../../config');

const dos = (n) => String(n).padStart(2, '0');

function marcaDeTiempo() {
  const d = new Date();
  return `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}${dos(d.getSeconds())}`;
}

// Crea una copia completa con VACUUM INTO (síncrono). Devuelve { archivo, advertencia }.
function crear(etiqueta = 'manual') {
  const carpeta = config.rutaRespaldos;
  fs.mkdirSync(carpeta, { recursive: true });
  const nombre = `pos-${marcaDeTiempo()}-${etiqueta}.db`;
  const archivo = path.join(carpeta, nombre);
  db.exec(`VACUUM INTO '${archivo.replace(/'/g, "''")}'`);

  let advertencia = null;
  if (config.respaldos.copiaExterna) {
    try {
      fs.mkdirSync(config.respaldos.copiaExterna, { recursive: true });
      fs.copyFileSync(archivo, path.join(config.respaldos.copiaExterna, nombre));
    } catch (e) {
      advertencia = `El respaldo se guardó en la PC, pero no en la copia externa: ${e.message}`;
    }
  }

  // Conserva solo los más recientes
  const copias = fs.readdirSync(carpeta).filter((f) => /^pos-.*\.db$/.test(f)).sort();
  for (const viejo of copias.slice(0, Math.max(0, copias.length - config.respaldos.conservar))) {
    fs.unlinkSync(path.join(carpeta, viejo));
  }
  return { archivo, advertencia };
}

module.exports = { crear };
