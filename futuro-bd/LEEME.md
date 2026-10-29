# futuro-bd/ — NO SE USA (todavía)

El profesor ha pedido no usar base de datos aún. La app funciona con los arrays de `src/data.js`.
Aquí se guarda la versión con SQLite que ya estaba hecha, para recuperarla cuando toque:

- `schema.sql`: las tablas (Tabla 2 del Word).
- `db.js`: la conexión a SQLite (`node:sqlite`, Node >= 22.13).
- `seed.js`: rellenaba la BD con los mismos datos que ahora hay en `src/data.js`.

Ningún archivo de `src/` importa nada de esta carpeta. Se puede borrar antes de entregar si hace falta
(pero conviene tenerla guardada en git, por ejemplo en otra rama).

## Pasos para volver a la base de datos

1. Mover `db.js` y `schema.sql` a `src/`, y añadir a `src/config.js` la línea
   `DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cunef-fc.db'),`
2. En cada archivo de `src/models/`, sustituir el cuerpo de cada función por la consulta SQL que tiene
   encima en el comentario (`db.prepare(...).get/all/run(...)`).
3. Un `seed.js` que inserte en la BD los arrays de `src/data.js` (o recuperar este) y `"seed": "node src/seed.js"` en package.json.

Los controladores, las rutas y el frontend NO hay que tocarlos.
