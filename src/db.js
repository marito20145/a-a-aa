// Conexión única a SQLite. Todo el sistema usa este mismo objeto `db`.
// better-sqlite3 es síncrono: no hace falta async/await.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

const db = new Database(config.rutaBaseDatos);

db.pragma('journal_mode = WAL');  // más resistente a cortes de luz
db.pragma('foreign_keys = ON');   // respeta las relaciones entre tablas

// Crea las tablas si no existen (seguro de ejecutar en cada arranque)
const esquema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
db.exec(esquema);

module.exports = db;
