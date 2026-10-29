# CUNEF FC · Aplicación web (Node + Express)

API REST + web del club. Implementa las Tablas 1–5 del documento *From Screens to Endpoints*.
El mismo servidor sirve la web (`frontend/`), así que todo vive en **http://localhost:3000**.

**Todavía sin base de datos:** los datos de ejemplo están en arrays en `src/data.js` y viven en memoria.
Lo que se cambie desde la web se pierde al reiniciar el servidor (y `npm start` lo reinicia cada vez que guardas un archivo).

## Puesta en marcha

```bash
npm install
npm start        # http://localhost:3000  (se reinicia solo al guardar)
npm test         # 100+ comprobaciones de las reglas del Word
```

Usuarios de ejemplo (contraseña `cunef2026`, solo desarrollo): `admin@cunef.edu` (admin), `capi@cunef.edu` y `gabo@cunef.edu` (player), `fan@cunef.edu` (fan).

## Estructura

```
src/
  app.js            Express: middleware, rutas, front estático y gestor de errores
  server.js         arranca el servidor
  config.js  utils.js
  data.js           DATOS DE EJEMPLO (arrays = "tablas", objetos = "filas")
  models/           ÚNICO sitio que lee/modifica data.js (cada función lleva su SQL futura en un comentario)
  middleware/       logger.js (lab) · auth.js (JWT + roles)
  routes/           routers "finos": URL + quién puede llamarla
  controllers/      lógica de cada endpoint: validar -> pedir al modelo -> responder
frontend/           HTML, Styles.css y js/ (api.js + un script por página)
futuro-bd/          versión SQLite guardada para más adelante (NO se usa; ver futuro-bd/LEEME.md)
scripts/smoke-test.js
```

Recorrido de una petición: `frontend/js/*.js` → `routes/` (auth/rol) → `controllers/` (validación) → `models/` → `data.js`.

## Del Word al código

| Word | Dónde está |
|---|---|
| Tabla 2 (entidades y relaciones) | `src/data.js` (cada relación es un id: `team_id`, `player_id`, `author_id`...); el esquema SQL para el futuro, en `futuro-bd/schema.sql` |
| Tabla 3 (endpoints, errores, auth) | `src/routes/*.js` + `src/controllers/*.js` + `src/middleware/auth.js` (token con `userId`, `role`, `playerId`) |
| Tabla 4 (validaciones) | en cada controlador, antes de tocar los datos |
| Tabla 5 (paginación/filtros/orden) | `parsePaging`, `parseSort` en `src/utils.js` (listas blancas de columnas) |

| Página | Script | Endpoints |
|---|---|---|
| Home | `js/home.js` | `GET /api/teams/:id`, `GET /api/matches?status=upcoming` |
| Squad | `js/squad.js` | `GET /api/players`, `PATCH /api/players/:id` (admin) |
| Season | `js/season.js` | `GET /api/matches`, `GET /api/standings`, `GET/PUT /api/matches/:id/callup`, `PATCH /api/matches/:id` |
| News | `js/news.js` | `GET /api/news`, `POST /api/news` (player) |
| Login | `js/login.js` | `POST /api/auth/login`, `POST /api/users` |
| Training | `js/training.js` | `/api/training-sessions` (CRUD), `/api/attendances` |

## Cuando añadamos la base de datos

Solo cambian `src/models/` (cada función pasa a ejecutar la SQL de su comentario) y se añaden `db.js`, `schema.sql` y un seed. Rutas, controladores y frontend se quedan igual. Pasos detallados en `futuro-bd/LEEME.md`.

## Decisiones que el Word no cerraba

- `PLAYER` tiene dos campos extra que la web ya mostraba: `shirt_number` y `description`.
- El `status` de `MATCH` no se guarda: se deriva de si hay resultado.
- `GET /api/matches` acepta además `?teamId=` (solo los partidos de nuestro club).
- Un **fan** que llama a `/api/attendances` recibe 403.
- "La sesión no debe haber empezado" (409) se aplica a jugadores; el admin puede corregir después.
- `PUT callup` exige exactamente 11 titulares (Tabla 4): no se guardan borradores incompletos.
- Quitado de la web por no estar en el modelo: goleadores por partido, categorías de noticias y clean sheets.
- Los endpoints del lab (`/tasks`, `/health`, `/echo/:msg`, `/boom`) siguen igual. La raíz `/` sirve la web; la descripción de la API está en `/api`.

## Antes de publicar

Definir `JWT_SECRET` (obligatorio con `NODE_ENV=production`), usar HTTPS y limitar los intentos de login (p. ej. `express-rate-limit`).
