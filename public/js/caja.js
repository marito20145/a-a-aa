// Pantalla de caja: foco en el código, resaltado del último producto, botones rápidos y atajos.
(function () {
  var codigo = document.getElementById('codigo');
  if (!codigo) return;
  var cobrar = document.getElementById('ir-cobrar');
  var cancelar = document.getElementById('form-cancelar');
  var ticket = document.getElementById('ultimo-ticket');
  var peso = document.getElementById('peso-simulado');
  var rapidos = document.getElementById('rapidos');
  var filas = document.querySelectorAll('[data-linea]');

  // Antes de agregar se guarda la cantidad de cada línea; al volver se resalta la que cambió.
  var formularios = document.querySelectorAll('form[data-agrega]');
  for (var f = 0; f < formularios.length; f++) {
    formularios[f].addEventListener('submit', function () {
      var antes = {};
      for (var i = 0; i < filas.length; i++) antes[filas[i].dataset.linea] = filas[i].dataset.cantidad;
      try { sessionStorage.setItem('caja-antes', JSON.stringify(antes)); } catch (e) {}
      // Los botones rápidos usan el peso escrito en el campo de la balanza simulada.
      var copia = this.querySelector('[data-copia-peso]');
      if (copia && peso) copia.value = peso.value;
    });
  }

  var antes = null;
  try {
    antes = JSON.parse(sessionStorage.getItem('caja-antes'));
    sessionStorage.removeItem('caja-antes');
  } catch (e) {}
  if (antes) {
    for (var i = filas.length - 1; i >= 0; i--) {
      var fila = filas[i];
      if (antes[fila.dataset.linea] === fila.dataset.cantidad) continue;
      fila.classList.add('recien');
      fila.scrollIntoView({ block: 'nearest' });
      document.getElementById('ultimo-nombre').textContent = fila.querySelector('.producto').textContent;
      document.getElementById('ultimo-cantidad').textContent = fila.querySelector('.cantidad').textContent;
      document.getElementById('ultimo-monto').textContent = fila.querySelector('.subtotal').textContent;
      document.getElementById('ultimo').hidden = false;
      break;
    }
  }

  // La fila de productos rápidos recuerda si se dejó plegada.
  if (rapidos) {
    try { if (localStorage.getItem('caja-rapidos') === 'cerrado') rapidos.open = false; } catch (e) {}
    rapidos.addEventListener('toggle', function () {
      try { localStorage.setItem('caja-rapidos', rapidos.open ? 'abierto' : 'cerrado'); } catch (e) {}
    });
  }

  // Buscador por nombre (F4): consulta /caja/buscar y agrega el elegido con su código o PLU.
  var buscador = document.getElementById('buscador');
  var texto = document.getElementById('buscador-texto');
  var lista = document.getElementById('resultados');
  var encontrados = [];
  var elegido = -1;
  var espera = null;
  var consulta = 0;

  function aviso(mensaje) {
    lista.innerHTML = '';
    var li = document.createElement('li');
    li.className = 'resultados-vacio';
    li.setAttribute('role', 'presentation');
    li.textContent = mensaje;
    lista.appendChild(li);
  }

  function marcar(i) {
    elegido = i;
    var items = lista.querySelectorAll('[role="option"]');
    for (var k = 0; k < items.length; k++) items[k].setAttribute('aria-selected', String(k === i));
    if (items[i]) {
      items[i].scrollIntoView({ block: 'nearest' });
      texto.setAttribute('aria-activedescendant', items[i].id);
    }
  }

  function pintar() {
    if (!encontrados.length) return aviso('No hay productos con ese nombre.');
    lista.innerHTML = '';
    encontrados.forEach(function (p, i) {
      var li = document.createElement('li');
      li.id = 'resultado-' + i;
      li.setAttribute('role', 'option');
      var img = document.createElement('img');
      img.src = p.imagen;
      img.alt = '';
      var nombre = document.createElement('span');
      nombre.className = 'resultado-nombre';
      nombre.textContent = p.nombre;
      var detalle = document.createElement('small');
      detalle.textContent = 'Código ' + p.codigo + ' · Stock ' + p.stock;
      nombre.appendChild(detalle);
      var precio = document.createElement('span');
      precio.className = 'precio-tag';
      precio.textContent = p.precio;
      li.appendChild(img);
      li.appendChild(nombre);
      li.appendChild(precio);
      li.addEventListener('mousemove', function () { if (elegido !== i) marcar(i); });
      li.addEventListener('click', function () { agregar(i); });
      lista.appendChild(li);
    });
    marcar(0);
  }

  function buscar() {
    var q = texto.value.trim();
    if (q.length < 2) { encontrados = []; return aviso('Escribe al menos 2 letras.'); }
    var numero = ++consulta;
    fetch('/caja/buscar?q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok || (r.headers.get('content-type') || '').indexOf('json') < 0) throw new Error();
        return r.json();
      })
      .then(function (datos) {
        if (numero !== consulta) return; // llegó tarde: ya se escribió otra cosa
        encontrados = datos;
        pintar();
      })
      .catch(function () { if (numero === consulta) aviso('No se pudo buscar. Revisa que tu turno siga abierto.'); });
  }

  function agregar(i) {
    var p = encontrados[i];
    if (!p) return;
    codigo.value = p.codigo;
    buscador.close();
    var form = document.getElementById('form-escaneo');
    if (form.requestSubmit) form.requestSubmit(); else form.submit();
  }

  function abrirBuscador() {
    if (!buscador || buscador.open) return;
    texto.value = '';
    encontrados = [];
    aviso('Escribe al menos 2 letras.');
    buscador.showModal();
    texto.focus();
  }

  if (buscador && typeof buscador.showModal === 'function') {
    document.getElementById('abrir-buscador').addEventListener('click', abrirBuscador);
    texto.addEventListener('input', function () {
      clearTimeout(espera);
      espera = setTimeout(buscar, 150);
    });
    texto.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (encontrados.length) marcar(Math.min(elegido + 1, encontrados.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (encontrados.length) marcar(Math.max(elegido - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); agregar(elegido); }
    });
    // Clic fuera de la ventana: se cierra.
    buscador.addEventListener('click', function (e) { if (e.target === buscador) buscador.close(); });
  } else if (buscador) {
    document.getElementById('abrir-buscador').hidden = true;
  }

  var dialogoAbierto = function () { return !!document.querySelector('dialog[open]'); };

  document.addEventListener('keydown', function (e) {
    if (dialogoAbierto()) return;
    if (e.key === 'F4' && buscador && typeof buscador.showModal === 'function') { e.preventDefault(); abrirBuscador(); return; }
    if (e.key === 'F2' && cobrar) { e.preventDefault(); location.href = cobrar.href; return; }
    if (e.key === 'F3' && ticket) { e.preventDefault(); location.href = ticket.href; return; }
    if (e.key === 'Escape') {
      if (codigo.value) { codigo.value = ''; codigo.focus(); return; }
      // requestSubmit pasa por la ventana de confirmación de app.js
      if (cancelar && cancelar.requestSubmit) cancelar.requestSubmit();
      return;
    }
    // Lo que llegue del lector o del teclado va al campo del código aunque el foco esté en otro lado.
    var activo = document.activeElement;
    var enCampo = activo && /^(INPUT|SELECT|TEXTAREA)$/.test(activo.tagName);
    if (!enCampo && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) codigo.focus();
  });

  // Al cerrar una ventana de confirmación, el foco vuelve al código.
  document.addEventListener('close', function () { codigo.focus(); }, true);
})();
