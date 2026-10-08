// Carga productos de prueba: npm run demo
// Solo funciona si todavía no hay productos registrados.
const productosRepo = require('../src/repositorios/productos.repo');
const productos = require('../src/servicios/productos.servicio');

if (productosRepo.contar() > 0) {
  console.log('Ya hay productos registrados: no se cargó la demo.');
  process.exit(0);
}

// Los códigos de barras son de ejemplo. La afectación de IGV es solo una muestra: confírmala con el contador.
const demo = [
  { nombre: 'Leche evaporada 400 g', tipo: 'unidad', codigo_barras: '7750000000011', precio: '4.20', stock_minimo: '12', stock_inicial: '48' },
  { nombre: 'Arroz extra 1 kg', tipo: 'unidad', codigo_barras: '7750000000028', precio: '4.90', stock_minimo: '10', stock_inicial: '30' },
  { nombre: 'Gaseosa 1.5 L', tipo: 'unidad', codigo_barras: '7750000000035', precio: '6.50', stock_minimo: '6', stock_inicial: '24' },
  { nombre: 'Aceite vegetal 1 L', tipo: 'unidad', codigo_barras: '7750000000042', precio: '9.80', stock_minimo: '6', stock_inicial: '5' },
  { nombre: 'Pan francés', tipo: 'unidad', plu: '50', precio: '0.30', stock_minimo: '0', stock_inicial: '200' },
  { nombre: 'Tomate', tipo: 'peso', plu: '101', precio: '3.50', stock_minimo: '2', stock_inicial: '20', afectacion_igv: 'exonerado' },
  { nombre: 'Papa amarilla', tipo: 'peso', plu: '102', precio: '4.20', stock_minimo: '5', stock_inicial: '40', afectacion_igv: 'exonerado' },
  { nombre: 'Pollo entero', tipo: 'peso', plu: '201', precio: '10.90', stock_minimo: '3', stock_inicial: '15' },
];

for (const p of demo) productos.crear(p, null);
console.log(`Se cargaron ${demo.length} productos de prueba.`);
