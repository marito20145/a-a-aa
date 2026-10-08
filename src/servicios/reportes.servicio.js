// Reportes del día.
const ventasRepo = require('../repositorios/ventas.repo');
const pagosRepo = require('../repositorios/pagos.repo');
const turnosRepo = require('../repositorios/turnos.repo');
const productosRepo = require('../repositorios/productos.repo');
const comprobantes = require('./comprobantes.servicio');

const dos = (n) => String(n).padStart(2, '0');

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

function delDia(fechaTexto) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaTexto || '') ? fechaTexto : hoy();
  return {
    fecha,
    resumen: ventasRepo.resumenDia(fecha),
    anuladas: ventasRepo.anuladasDia(fecha),
    porMedio: pagosRepo.porMedioDia(fecha),
    masVendidos: ventasRepo.masVendidos(fecha),
    ventas: ventasRepo.delDia(fecha).map((v) => ({
      ...v, comprobante: v.serie ? comprobantes.codigo(v.serie, v.numero) : '',
    })),
    turnos: turnosRepo.delDia(fecha),
    stockBajo: productosRepo.stockBajo(),
    estadosComprobantes: comprobantes.contarPorEstado(),
  };
}

module.exports = { delDia, hoy };
