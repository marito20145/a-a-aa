// Pantalla de cobro: vuelto en vivo, montos rápidos, campos según el comprobante y doble envío.
(function () {
  var form = document.getElementById('form-cobro');
  if (!form) return;
  var total = Number(document.querySelector('[data-total]').dataset.total);
  var campos = form.querySelectorAll('[data-pago]');
  var efectivo = form.elements.efectivo;
  var billetes = form.querySelectorAll('[data-billete]');
  var registrar = document.getElementById('registrar');
  var textoRegistrar = registrar.innerHTML;
  var aviso = document.getElementById('aviso-cobro');
  var panel = document.getElementById('vuelto-panel');
  var enviando = false;

  function centimos(v) {
    var n = Number(String(v || '').replace(',', '.'));
    return isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  }
  function texto(c) { return (c / 100).toFixed(2); }
  function soles(c) { return 'S/ ' + texto(c).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function otrosMedios() {
    var suma = 0;
    for (var i = 0; i < campos.length; i++) if (campos[i] !== efectivo) suma += centimos(campos[i].value);
    return suma;
  }

  function actualizar() {
    var otros = otrosMedios();
    var dif = centimos(efectivo.value) + otros - total;
    document.getElementById('vuelto-titulo').textContent = dif < 0 ? 'Falta' : 'Vuelto';
    document.getElementById('vuelto').textContent = soles(Math.abs(dif));
    panel.classList.toggle('falta', dif < 0);
    document.getElementById('campo-referencia').hidden = otros === 0;
    // Un billete menor a lo que queda por pagar en efectivo no alcanza.
    var porPagar = Math.max(total - otros, 0);
    for (var i = 0; i < billetes.length; i++) billetes[i].disabled = Number(billetes[i].dataset.billete) < porPagar;
    aviso.hidden = true;
  }

  function comprobante() {
    var factura = form.elements.comprobante.value === 'factura';
    document.getElementById('campo-direccion').hidden = !factura;
    document.getElementById('texto-documento').textContent = factura ? 'RUC' : 'DNI o RUC';
  }

  for (var i = 0; i < campos.length; i++) {
    campos[i].addEventListener('input', actualizar);
    campos[i].addEventListener('focus', function () { this.select(); });
  }
  for (var j = 0; j < billetes.length; j++) {
    billetes[j].addEventListener('click', function () {
      efectivo.value = texto(Number(this.dataset.billete));
      actualizar();
      registrar.focus();
    });
  }
  form.querySelector('[data-exacto]').addEventListener('click', function () {
    efectivo.value = texto(Math.max(total - otrosMedios(), 0));
    actualizar();
    registrar.focus();
  });
  var todos = form.querySelectorAll('[data-todo]');
  for (var k = 0; k < todos.length; k++) {
    todos[k].addEventListener('click', function () {
      for (var i = 0; i < campos.length; i++) campos[i].value = campos[i].name === this.dataset.todo ? texto(total) : '';
      actualizar();
      form.elements.referencia.focus();
    });
  }
  var radios = form.querySelectorAll('[name="comprobante"]');
  for (var r = 0; r < radios.length; r++) radios[r].addEventListener('change', comprobante);

  // Mismas reglas que el servidor: así no se pierde lo escrito por un rechazo.
  form.addEventListener('submit', function (e) {
    var otros = otrosMedios();
    var falta = total - otros - centimos(efectivo.value);
    var problema = '';
    if (otros > total) problema = 'Tarjeta, Yape, Plin y transferencia no pueden sumar más que el total: el vuelto solo se da en efectivo.';
    else if (falta > 0) problema = 'Falta ' + soles(falta) + ' para completar el pago.';
    if (problema || enviando) {
      e.preventDefault();
      if (problema) { aviso.textContent = problema; aviso.hidden = false; efectivo.focus(); }
      return;
    }
    // Evita registrar la misma venta dos veces por un doble clic o un Enter repetido.
    enviando = true;
    registrar.disabled = true;
    registrar.textContent = 'Registrando…';
  });
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    enviando = false;
    registrar.disabled = false;
    registrar.innerHTML = textoRegistrar;
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') location.href = document.getElementById('volver').href;
  });

  actualizar();
  comprobante();
})();
