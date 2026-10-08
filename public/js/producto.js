// Formulario de producto: la etiqueta de la derecha se actualiza mientras se escribe.
(function () {
  var form = document.getElementById('form-producto');
  if (!form) return;
  var nombre = document.getElementById('vista-nombre');
  var precio = document.getElementById('vista-precio');
  var tipo = document.getElementById('vista-tipo');

  function actualizar() {
    nombre.textContent = form.elements.nombre.value.trim() || 'Nombre del producto';
    var n = Number(String(form.elements.precio.value || '').replace(',', '.'));
    precio.textContent = 'S/ ' + (isFinite(n) && n > 0 ? n.toFixed(2) : '0.00');
    tipo.textContent = form.elements.tipo.value === 'peso' ? 'por kg' : 'por unidad';
  }
  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
})();
