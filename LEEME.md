# Caja POS

Sistema de ventas e inventario para un minimarket con una caja.

## Instalar (una sola vez)

```
npm install express ejs express-session better-sqlite3
```

Cuando lleguen los equipos reales:

```
npm install serialport             (balanza)
npm install node-thermal-printer   (impresora de tickets)
```

## Usar

- `npm run dev`: arranca el sistema y se reinicia solo al guardar cambios.
- `npm run demo`: carga 8 productos de prueba (solo si no hay productos).
- Abre http://127.0.0.1:3000 en el navegador.

La primera vez pide crear el usuario administrador.

## Productos de prueba

| Producto        | Código           |
|-----------------|------------------|
| Leche           | 7750000000011    |
| Arroz           | 7750000000028    |
| Gaseosa         | 7750000000035    |
| Aceite          | 7750000000042    |
| Pan (por unidad)| PLU 50           |
| Tomate (peso)   | PLU 101          |
| Papa (peso)     | PLU 102          |
| Pollo (peso)    | PLU 201          |

En la caja:
- `3*7750000000011` agrega 3 leches.
- Para productos por peso, escribe el PLU y, en modo simulado, el peso en kg al lado.
- F2 abre la pantalla de cobro, F3 el ticket anterior y Esc borra el código (o cancela la venta).
- Los productos con PLU aparecen como **botones rápidos** debajo del campo del código.

## Fotos del negocio y de productos (opcional)

Sin fotos, el sistema usa sus propias ilustraciones. Para poner las tuyas, copia los archivos
en estas carpetas (créalas si no existen). Aparecen solas en menos de 30 segundos, sin reiniciar.

| Foto | Archivo | Tamaño recomendado | Peso máximo |
|------|---------|--------------------|-------------|
| Logo | `public/img/negocio/logo.png` | 256 × 256 px, fondo transparente | 50 KB |
| Fachada de la tienda | `public/img/negocio/fachada.jpg` | 1200 × 800 px (horizontal) | 200 KB |
| Producto | `public/img/productos/<código o PLU>.jpg` | 200 × 200 px (cuadrada) | 30 KB |

- **Logo:** sale en el menú lateral y en el inicio de sesión.
- **Fachada:** reemplaza la ilustración de la bodega en el inicio de sesión.
- **Productos:** el nombre del archivo es el código de barras o el PLU, tal como aparece en la
  lista de Productos. Ejemplos: `7750000000011.jpg`, `101.jpg` (el PLU va sin ceros adelante).
  Sale en la caja, en los botones rápidos, en Productos e Inventario.
- Formatos aceptados: `.jpg`, `.png` y `.webp`.
- Para achicar una foto con Paint: **Cambiar tamaño → Píxeles**, escribe el ancho, y guarda como JPG.
  Fotos livianas hacen que la caja cargue al instante.
- No uses logos ni empaques de marcas que no sean del negocio.

## Configuración (config.js)

- `negocio`: nombre, RUC y dirección que salen en el ticket.
- `balanza.simulada`: cambiar a `false` cuando se conecte la balanza real, y ajustar `puerto`.
- `impresora.simulada`: cambiar a `false` con la impresora real. Mientras tanto los tickets se guardan en `tickets/`.
- `respaldos.copiaExterna`: carpeta extra (USB o Google Drive) para copiar cada respaldo.
- `claveSesion`: cambiarla por una frase larga en cada instalación.

## Pendiente

- Paso 8: envío de comprobantes a SUNAT con el proveedor que elija el cliente
  (`src/externos/facturacion.js`). Mientras tanto quedan como "pendiente".
