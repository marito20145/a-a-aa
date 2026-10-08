// Configuración general. Lo que cambia de un cliente a otro va aquí.
const path = require('path');

module.exports = {
  // Servidor: solo esta PC puede entrar (127.0.0.1)
  puerto: 3000,
  host: '127.0.0.1',
  claveSesion: 'cambia-esta-frase-por-una-larga-y-unica',

  // Datos del negocio (aparecen en tickets y comprobantes)
  negocio: {
    nombre: 'Mi Minimarket',
    ruc: '',
    direccion: '',
    telefono: '',
  },

  igv: 0.18,

  // Desde este monto la boleta pide DNI o RUC del cliente (S/ 700.00). Confirmar con el contador.
  montoBoletaConDocumento: 70000,

  // Archivos
  rutaBaseDatos: path.join(__dirname, 'database', 'pos.db'),
  rutaRespaldos: path.join(__dirname, 'respaldos'),
  rutaTickets: path.join(__dirname, 'tickets'),

  respaldos: {
    conservar: 30,       // cuántas copias guardar en la carpeta respaldos/
    copiaExterna: '',    // carpeta extra (USB o Google Drive), ej: 'G:\\Mi unidad\\respaldos-caja'
  },

  // Balanza: en modo simulado se escribe el peso a mano en la pantalla de caja
  balanza: {
    simulada: true,
    pesoSimulado: 1000,  // gramos por defecto en modo simulado
    puerto: 'COM3',
    baudios: 9600,
    comando: '',         // algunas balanzas necesitan que se les pida el peso (ver manual)
    intervaloMs: 300,
  },

  // Impresora térmica: en modo simulado los tickets se guardan en la carpeta tickets/
  impresora: {
    simulada: true,
    tipo: 'epson',                  // epson o star
    interfaz: 'tcp://192.168.1.100', // depende de cómo se conecte la impresora
    ancho: 42,                      // caracteres por línea (80 mm ≈ 42-48, 58 mm ≈ 32)
    abrirCajon: true,
  },

  // Facturación electrónica (paso 8)
  facturacion: {
    activa: false,
    url: '',
    token: '',
  },
};
