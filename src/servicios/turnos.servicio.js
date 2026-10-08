// Apertura, cierre y arqueo de caja.
const db = require('../db');
const turnosRepo = require('../repositorios/turnos.repo');
const ventasRepo = require('../repositorios/ventas.repo');
const pagosRepo = require('../repositorios/pagos.repo');
const respaldos = require('./respaldos.servicio');
const dinero = require('../utils/dinero');
const { ErrorNegocio } = require('../utils/errores');

function abierto() {
  return turnosRepo.abierto() || null;
}

function abrir(usuarioId, efectivoInicialTexto) {
  if (turnosRepo.abierto()) throw new ErrorNegocio('Ya hay un turno abierto. Ciérralo antes de abrir otro.');
  if (String(efectivoInicialTexto ?? '').trim() === '') throw new ErrorNegocio('Escribe con cuánto efectivo empieza el cajón (puede ser 0).');
  return turnosRepo.crear(usuarioId, dinero.aCentimos(efectivoInicialTexto, 'El efectivo inicial'));
}

function resumen(turno) {
  const ventas = ventasRepo.resumenTurno(turno.id);
  const porMedio = pagosRepo.porMedioTurno(turno.id);
  const efectivoVentas = porMedio.find((p) => p.medio === 'efectivo')?.total || 0;
  return {
    ventas: ventas.cantidad,
    totalVentas: ventas.total,
    porMedio,
    efectivoVentas,
    esperado: turno.efectivo_inicial + efectivoVentas,
  };
}

function cerrar(usuario, efectivoContadoTexto) {
  const turno = turnosRepo.abierto();
  if (!turno) throw new ErrorNegocio('No hay ningún turno abierto.');
  if (turno.usuario_id !== usuario.id && usuario.rol !== 'admin') {
    throw new ErrorNegocio('Solo quien abrió el turno o un administrador puede cerrarlo.');
  }
  if (String(efectivoContadoTexto ?? '').trim() === '') throw new ErrorNegocio('Cuenta el efectivo del cajón y escribe el monto.');
  const contado = dinero.aCentimos(efectivoContadoTexto, 'El efectivo contado');

  db.transaction(() => {
    const abierta = ventasRepo.abiertaPorTurno(turno.id);
    if (abierta) {
      if (ventasRepo.detalles(abierta.id).length > 0) {
        throw new ErrorNegocio('Hay una venta en curso. Cóbrala o cancélala antes de cerrar el turno.');
      }
      ventasRepo.eliminarAbierta(abierta.id);
    }
    turnosRepo.cerrar(turno.id, contado);
  })();

  let respaldo;
  try {
    respaldo = respaldos.crear(`turno-${turno.id}`);
  } catch (e) {
    respaldo = { error: e.message };
  }
  return { turnoId: turno.id, respaldo };
}

function arqueo(turnoId) {
  const turno = turnosRepo.porId(turnoId);
  if (!turno) throw new ErrorNegocio('No existe ese turno.');
  const r = resumen(turno);
  const diferencia = turno.efectivo_contado === null ? null : turno.efectivo_contado - r.esperado;
  return { turno, ...r, diferencia };
}

module.exports = { abierto, abrir, resumen, cerrar, arqueo };
