// db.js — conexión a la base de datos. Lo importan todos los controladores con require('../db').
//
// ¿Por qué una base de datos y no un array en memoria (como en el lab de /tasks)?
// Un array se pierde cada vez que el servidor se reinicia. La BD guarda los datos en un
// fichero del disco (data/cunef-fc.db), así que sobreviven a reinicios.
//
// Usamos SQLite con el módulo integrado de Node (node:sqlite, Node >= 22.13):
// no hay que instalar ningún programa servidor de BD; la BD es un simple fichero.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DB_PATH } = require('./config');

// Crea la carpeta data/ si todavía no existe (la primera vez que se arranca).
// ':memory:' es una BD temporal en RAM que usan los tests (scripts/smoke-test.js).
if (DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Abre (o crea, si no existe) el fichero de la BD. "Sync" = las consultas son síncronas:
// devuelven el resultado directamente, sin await. Más fácil de leer para empezar.
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');           // imprescindible: activa las relaciones (FK)
// (sin WAL a propósito: el repo vive en OneDrive y los ficheros -wal/-shm le dan problemas)

// Ejecuta schema.sql en cada arranque. Como usa "CREATE TABLE IF NOT EXISTS", solo crea
// las tablas que falten: NO borra ni toca los datos que ya hay. (Quien borra es seed.js.)
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// Ejecuta fn() dentro de una transacción: o se guarda todo o no se guarda nada.
// Ejemplo: al crear un entreno se insertan la sesión Y una asistencia por jugador; si
// algo falla a mitad, ROLLBACK deshace lo hecho y la BD no queda a medias.
function transaction(fn) {
    db.exec('BEGIN');
    try {
        const result = fn();
        db.exec('COMMIT');
        return result;
    } catch (err) {
        db.exec('ROLLBACK');
        throw err;
    }
}

// Cómo se usa "db" en los controladores:
//   db.prepare('SELECT * FROM players WHERE player_id = ?').get(5)   -> una fila (objeto) o undefined
//   db.prepare('SELECT * FROM players').all()                        -> array de filas
//   db.prepare('UPDATE players SET goals = ? WHERE player_id = ?').run(3, 5)  -> INSERT/UPDATE/DELETE
// Los "?" se rellenan con los argumentos. NUNCA metas datos del usuario dentro del texto SQL
// con `${...}`: los ? evitan la inyección SQL.
module.exports = { db, transaction };
