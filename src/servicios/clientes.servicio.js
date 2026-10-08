// Clientes: se registran al cobrar (boleta con documento o factura) y se pueden editar.
const repo = require('../repositorios/clientes.repo');
const config = require('../../config');
const dinero = require('../utils/dinero');
const { ErrorNegocio } = require('../utils/errores');

const texto = (v) => String(v ?? '').trim();

function tipoDocumento(numero) {
  if (/^\d{8}$/.test(numero)) return 'DNI';
  if (/^\d{11}$/.test(numero)) return 'RUC';
  throw new ErrorNegocio('El documento debe tener 8 dígitos (DNI) u 11 dígitos (RUC).');
}

// Devuelve el id del cliente para la venta, o null si la boleta va sin documento.
function resolverParaVenta({ comprobante, documento, nombre, direccion, total }) {
  const numero = texto(documento).replace(/\s/g, '');
  nombre = texto(nombre);
  direccion = texto(direccion) || null;

  if (comprobante === 'factura' && !/^\d{11}$/.test(numero)) {
    throw new ErrorNegocio('Para emitir factura ingresa el RUC del cliente (11 dígitos).');
  }
  if (!numero) {
    if (total >= config.montoBoletaConDocumento) {
      throw new ErrorNegocio(`Para boletas desde ${dinero.soles(config.montoBoletaConDocumento)} ingresa el DNI o RUC del cliente.`);
    }
    return null;
  }

  const tipo = tipoDocumento(numero);
  const existente = repo.porDocumento(tipo, numero);
  if (existente) {
    if (nombre && nombre !== existente.nombre) {
      repo.actualizar({ id: existente.id, nombre, direccion: direccion ?? existente.direccion });
    }
    return existente.id;
  }
  if (!nombre) throw new ErrorNegocio('Es un cliente nuevo: escribe su nombre o razón social.');
  return repo.crear({ tipo_documento: tipo, numero_documento: numero, nombre, direccion });
}

function obtener(id) {
  const c = repo.porId(id);
  if (!c) throw new ErrorNegocio('No existe ese cliente.');
  return c;
}

function actualizar(id, datos) {
  const actual = obtener(id);
  const nombre = texto(datos.nombre);
  if (!nombre) throw new ErrorNegocio('El nombre no puede quedar vacío.');
  repo.actualizar({ id: actual.id, nombre, direccion: texto(datos.direccion) || null });
}

module.exports = { resolverParaVenta, obtener, actualizar, listar: repo.listar };
