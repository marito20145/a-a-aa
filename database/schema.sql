-- =====================================================================
-- Esquema de la base de datos (SQLite)
-- Reglas:
--   * Dinero en CÉNTIMOS (S/ 4.50 = 450) y peso en GRAMOS (1.250 kg = 1250).
--   * STRICT obliga a respetar los tipos: si mandas 4.5 a un INTEGER, falla.
--   * El stock solo cambia insertando en movimientos_stock (ver trigger).
-- Se ejecuta en cada arranque; IF NOT EXISTS evita duplicar tablas.
-- =====================================================================

-- ---------- Usuarios y turnos ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id          INTEGER PRIMARY KEY,
  nombre      TEXT    NOT NULL,
  usuario     TEXT    NOT NULL UNIQUE,
  clave_hash  TEXT    NOT NULL,
  rol         TEXT    NOT NULL CHECK (rol IN ('cajero', 'admin')),
  activo      INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
) STRICT;

CREATE TABLE IF NOT EXISTS turnos (
  id                INTEGER PRIMARY KEY,
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id),
  abierto_en        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  cerrado_en        TEXT,
  efectivo_inicial  INTEGER NOT NULL CHECK (efectivo_inicial >= 0),
  efectivo_contado  INTEGER CHECK (efectivo_contado >= 0)
) STRICT;

-- Una sola caja: solo puede haber un turno abierto a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS un_solo_turno_abierto
  ON turnos ((cerrado_en IS NULL)) WHERE cerrado_en IS NULL;

-- ---------- Clientes ----------
CREATE TABLE IF NOT EXISTS clientes (
  id                INTEGER PRIMARY KEY,
  tipo_documento    TEXT NOT NULL CHECK (tipo_documento IN ('DNI', 'RUC', 'CE', 'PASAPORTE')),
  numero_documento  TEXT NOT NULL,
  nombre            TEXT NOT NULL,
  direccion         TEXT,
  creado_en         TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE (tipo_documento, numero_documento)
) STRICT;

-- ---------- Productos ----------
CREATE TABLE IF NOT EXISTS productos (
  id              INTEGER PRIMARY KEY,
  codigo_barras   TEXT UNIQUE,              -- productos por unidad
  plu             TEXT UNIQUE,              -- código corto para productos por peso
  nombre          TEXT    NOT NULL,
  tipo            TEXT    NOT NULL CHECK (tipo IN ('unidad', 'peso')),
  precio          INTEGER NOT NULL CHECK (precio >= 0),  -- céntimos por unidad o por kg
  stock           INTEGER NOT NULL DEFAULT 0,            -- unidades o gramos (puede quedar negativo si estaba desfasado)
  stock_minimo    INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  afectacion_igv  TEXT    NOT NULL DEFAULT 'gravado'
                  CHECK (afectacion_igv IN ('gravado', 'exonerado', 'inafecto')),  -- confirmar con el contador
  activo          INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_en       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  CHECK (codigo_barras IS NOT NULL OR plu IS NOT NULL)
) STRICT;

-- ---------- Ventas ----------
CREATE TABLE IF NOT EXISTS ventas (
  id          INTEGER PRIMARY KEY,
  turno_id    INTEGER NOT NULL REFERENCES turnos(id),
  cliente_id  INTEGER REFERENCES clientes(id),
  estado      TEXT    NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'pagada', 'anulada')),
  total       INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  creada_en   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  pagada_en   TEXT,
  anulada_en  TEXT
) STRICT;

-- Solo una venta abierta (el carrito) por turno.
CREATE UNIQUE INDEX IF NOT EXISTS una_venta_abierta_por_turno
  ON ventas (turno_id) WHERE estado = 'abierta';

CREATE TABLE IF NOT EXISTS detalle_venta (
  id               INTEGER PRIMARY KEY,
  venta_id         INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id      INTEGER NOT NULL REFERENCES productos(id),
  descripcion      TEXT    NOT NULL,                              -- nombre del producto al vender
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),         -- unidades o gramos
  precio_unitario  INTEGER NOT NULL CHECK (precio_unitario >= 0), -- precio del momento (por unidad o por kg)
  subtotal         INTEGER NOT NULL CHECK (subtotal >= 0)
) STRICT;

CREATE TABLE IF NOT EXISTS pagos (
  id          INTEGER PRIMARY KEY,
  venta_id    INTEGER NOT NULL REFERENCES ventas(id),
  medio       TEXT    NOT NULL CHECK (medio IN ('efectivo', 'tarjeta', 'yape', 'plin', 'transferencia')),
  monto       INTEGER NOT NULL CHECK (monto > 0),         -- lo que se aplica a la venta
  vuelto      INTEGER NOT NULL DEFAULT 0 CHECK (vuelto >= 0),
  referencia  TEXT,                                       -- n.º de operación (tarjeta, Yape, Plin)
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
) STRICT;

-- ---------- Comprobantes electrónicos ----------
CREATE TABLE IF NOT EXISTS series (
  serie          TEXT    PRIMARY KEY,                     -- B001, F001...
  tipo           TEXT    NOT NULL CHECK (tipo IN ('boleta', 'factura', 'nota_credito')),
  ultimo_numero  INTEGER NOT NULL DEFAULT 0 CHECK (ultimo_numero >= 0)
) STRICT;

INSERT OR IGNORE INTO series (serie, tipo) VALUES ('B001', 'boleta'), ('F001', 'factura');

CREATE TABLE IF NOT EXISTS comprobantes (
  id             INTEGER PRIMARY KEY,
  venta_id       INTEGER NOT NULL REFERENCES ventas(id),
  tipo           TEXT    NOT NULL CHECK (tipo IN ('boleta', 'factura', 'nota_credito')),
  serie          TEXT    NOT NULL REFERENCES series(serie),
  numero         INTEGER NOT NULL CHECK (numero > 0),
  referencia_id  INTEGER REFERENCES comprobantes(id),     -- para notas de crédito
  estado         TEXT    NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente', 'enviado', 'rechazado', 'anulado')),
  intentos       INTEGER NOT NULL DEFAULT 0,
  respuesta      TEXT,                                    -- mensaje del proveedor OSE/PSE
  creado_en      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  enviado_en     TEXT,
  UNIQUE (serie, numero)
) STRICT;

-- Una venta tiene como máximo una boleta o factura (las notas de crédito van aparte).
CREATE UNIQUE INDEX IF NOT EXISTS un_comprobante_por_venta
  ON comprobantes (venta_id) WHERE tipo IN ('boleta', 'factura');

-- ---------- Inventario (kardex) ----------
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id           INTEGER PRIMARY KEY,
  producto_id  INTEGER NOT NULL REFERENCES productos(id),
  tipo         TEXT    NOT NULL CHECK (tipo IN ('venta', 'compra', 'ajuste', 'anulacion')),
  cantidad     INTEGER NOT NULL CHECK (cantidad <> 0),   -- positivo entra, negativo sale
  venta_id     INTEGER REFERENCES ventas(id),
  usuario_id   INTEGER REFERENCES usuarios(id),
  nota         TEXT,
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
) STRICT;

-- Cada movimiento actualiza el stock automáticamente.
CREATE TRIGGER IF NOT EXISTS actualizar_stock
AFTER INSERT ON movimientos_stock
BEGIN
  UPDATE productos SET stock = stock + NEW.cantidad WHERE id = NEW.producto_id;
END;

-- ---------- Índices para búsquedas frecuentes ----------
CREATE INDEX IF NOT EXISTS idx_ventas_turno        ON ventas (turno_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta       ON detalle_venta (venta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_venta         ON pagos (venta_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_estado ON comprobantes (estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_prod    ON movimientos_stock (producto_id, creado_en);
