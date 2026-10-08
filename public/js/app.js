// Comportamiento común a todas las pantallas. Todo es opcional: si este archivo falla,
// los formularios se siguen enviando igual y los mensajes se ven en la página.
(function () {
  // Reloj del menú lateral
  var reloj = document.getElementById('reloj');
  if (reloj) {
    var fecha = document.createElement('span');
    var hora = document.createElement('span');
    fecha.className = 'reloj-fecha';
    hora.className = 'reloj-hora';
    reloj.appendChild(fecha);
    reloj.appendChild(hora);
    var mostrar = function () {
      var ahora = new Date();
      fecha.textContent = ahora.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
      hora.textContent = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    mostrar();
    setInterval(mostrar, 15000);
  }

  // Mensajes "toast": los de éxito y aviso se van solos; los errores esperan a que se cierren.
  function cerrarNota(nota) {
    nota.classList.add('saliendo');
    setTimeout(function () { if (nota.parentNode) nota.parentNode.removeChild(nota); }, 220);
  }
  var notas = document.querySelectorAll('.avisos .nota');
  for (var i = 0; i < notas.length; i++) {
    (function (nota) {
      var boton = nota.querySelector('.nota-cerrar');
      if (boton) boton.addEventListener('click', function () { cerrarNota(nota); });
      if (nota.classList.contains('nota-error')) return;
      var temporizador = setTimeout(function () { cerrarNota(nota); }, 5000);
      // Al pasar el mouse el mensaje se queda fijo, para leerlo con calma.
      nota.addEventListener('mouseenter', function () { clearTimeout(temporizador); nota.classList.add('fija'); });
    })(notas[i]);
  }

  // Ventana de confirmación propia. Devuelve una promesa con true o false.
  var dialogo = null;
  function confirmar(texto, botonSi) {
    if (typeof HTMLDialogElement !== 'function') return Promise.resolve(window.confirm(texto));
    if (!dialogo) {
      dialogo = document.createElement('dialog');
      dialogo.className = 'dialogo';
      dialogo.innerHTML =
        '<form method="dialog">' +
        '<div class="dialogo-ico"><svg class="ico" aria-hidden="true"><use href="#i-alerta"></use></svg></div>' +
        '<p class="dialogo-texto" id="dialogo-texto"></p>' +
        '<div class="acciones">' +
        '<button value="no" class="boton-secundario" autofocus>No, volver</button>' +
        '<button value="si" class="boton boton-peligro" id="dialogo-si"></button>' +
        '</div></form>';
      dialogo.setAttribute('aria-labelledby', 'dialogo-texto');
      document.body.appendChild(dialogo);
    }
    dialogo.querySelector('#dialogo-texto').textContent = texto;
    dialogo.querySelector('#dialogo-si').textContent = botonSi || 'Sí, continuar';
    dialogo.returnValue = '';
    return new Promise(function (resolver) {
      dialogo.addEventListener('close', function alCerrar() {
        dialogo.removeEventListener('close', alCerrar);
        resolver(dialogo.returnValue === 'si');
      });
      dialogo.showModal();
    });
  }
  window.confirmar = confirmar;

  // Formularios con data-confirmar="¿Seguro...?" piden confirmación antes de enviarse.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.dataset || !form.dataset.confirmar || form.dataset.confirmado === '1') return;
    e.preventDefault();
    confirmar(form.dataset.confirmar, form.dataset.confirmarBoton).then(function (si) {
      if (!si) return;
      form.dataset.confirmado = '1';
      form.submit();
    });
  });

  // Botones que llenan un campo con un monto: <button data-llenar="nombre_del_campo" data-valor="100.00">
  document.addEventListener('click', function (e) {
    var boton = e.target.closest && e.target.closest('[data-llenar]');
    if (!boton || !boton.form) return;
    var campo = boton.form.elements[boton.dataset.llenar];
    if (!campo) return;
    campo.value = boton.dataset.valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.focus();
  });

  // Mostrar u ocultar la contraseña
  var botones = document.querySelectorAll('[data-ver-clave]');
  for (var j = 0; j < botones.length; j++) {
    botones[j].hidden = false;
    botones[j].addEventListener('click', function () {
      var campo = document.getElementById(this.dataset.verClave);
      var visible = campo.type === 'text';
      campo.type = visible ? 'password' : 'text';
      this.setAttribute('aria-pressed', String(!visible));
      this.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
      campo.focus();
    });
  }
})();
