// Error de negocio: un problema que el usuario puede corregir (dato mal escrito, falta stock, etc.).
// El sistema lo muestra como mensaje en pantalla en lugar de una página de error.
class ErrorNegocio extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorNegocio';
  }
}

module.exports = { ErrorNegocio };
