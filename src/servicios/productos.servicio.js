// Alta y edición de productos.
const db = require('../db');
const repo = require('../repositorios/productos.repo');
const movimientosRepo = require('../repositorios/movimientos.repo');
const inventario = require('./inventario.servicio');
const { normalizarPlu } = require('./codigos.servicio');
const dinero = require('../utils/dinero');
const { ErrorNegocio } = require('../utils/errores');

const texto = (v) => String(v ?? '').trim();

function leerFormulario(datos) {
  const nombre = texto(datos.nombre);
  if (!nombre) throw new ErrorNegocio('Escribe el nombre del producto.');
  const tipo = datos.tipo === 'peso' ? 'peso' : 'unidad';

  const codigo_barras = texto(datos.codigo_barras) || null;
  let plu = texto(datos.plu) || null;
  if (codigo_barras && !/^[0-9A-Za-z-]{6,30}$/.test(codigo_barras)) {
    throw new ErrorNegocio('El código de barras debe tener al menos 6 números o letras.');
  }
  if (plu) {
    if (!/^\d{1,5}$/.test(plu)) throw new ErrorNegocio('El PLU debe tener de 1 a 5 números.');
    plu = normalizarPlu(plu);
  }
  if (!codigo_barras && !plu) throw new ErrorNegocio('Ingresa un código de barras o un PLU.');
  if (tipo === 'peso' && !plu) {
    throw new ErrorNegocio('Los productos por peso necesitan un PLU para venderse con la balanza.');
  }

  const precio = dinero.aCentimos(datos.precio, 'El precio');
  if (precio <= 0) throw new ErrorNegocio('Ingresa el precio del producto.');
  const stock_minimo = tipo === 'peso'
    ? dinero.aGramos(datos.stock_minimo, 'El stock mínimo')
    : dinero.aEntero(datos.stock_minimo, 'El stock mínimo');
  const afectacion_igv = ['gravado', 'exonerado', 'inafecto'].includes(datos.afectacion_igv)
    ? datos.afectacion_igv : 'gravado';

  return { codigo_barras, plu, nombre, tipo, precio, stock_minimo, afectacion_igv };
}

// Traduce los errores de códigos repetidos a un mensaje claro.
function guardar(fn) {
  try {
    return fn();
  } catch (e) {
    if (/UNIQUE.*codigo_barras/.test(e.message)) throw new ErrorNegocio('Ya existe un producto con ese código de barras.');
    if (/UNIQUE.*plu/.test(e.message)) throw new ErrorNegocio('Ya existe un producto con ese PLU.');
    throw e;
  }
}

const crear = db.transaction((datos, usuarioId) => {
  const p = leerFormulario(datos);
  const stockInicial = p.tipo === 'peso'
    ? dinero.aGramos(datos.stock_inicial, 'El stock inicial')
    : dinero.aEntero(datos.stock_inicial, 'El stock inicial');
  const id = guardar(() => repo.crear(p));
  if (stockInicial > 0) {
    inventario.registrarMovimiento({ productoId: id, tipo: 'ajuste', cantidad: stockInicial, usuarioId, nota: 'Stock inicial' });
  }
  return id;
});

function actualizar(id, datos) {
  const actual = repo.porId(id);
  if (!actual) throw new ErrorNegocio('No existe ese producto.');
  const p = leerFormulario(datos);
  if (p.tipo !== actual.tipo && movimientosRepo.contarPorProducto(id) > 0) {
    throw new ErrorNegocio('Este producto ya tiene movimientos de stock: no se puede cambiar entre unidad y peso. Crea un producto nuevo.');
  }
  guardar(() => repo.actualizar({ ...p, id }));
}

function obtener(id) {
  const p = repo.porId(id);
  if (!p) throw new ErrorNegocio('No existe ese producto.');
  return p;
}

module.exports = {
  crear, actualizar, obtener,
  listar: repo.listar,
  cambiarActivo: (id, activo) => repo.cambiarActivo(id, activo),
  stockBajo: repo.stockBajo,
};
