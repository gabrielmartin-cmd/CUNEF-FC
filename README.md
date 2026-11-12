# CUNEF FC — Practice 1
Authors: Gabriel Martín Jiménez, Antonio García Vicente
Resources: **players** (main resource), teams, matches, news, training-sessions, attendances

Web del club de fútbol de CUNEF: una API REST en Express y las páginas en HTML, CSS y JavaScript
sin frameworks, servidas por el mismo servidor.

## Run it
Requires Node 18+. Nothing else.

    npm install
    npm start          -> open http://localhost:3000

Otros scripts: `npm test` (prueba de humo de toda la API) y `npm run dev` (reinicia el servidor al guardar).

Los datos viven **en memoria** (`src/data/seed.js`): al reiniciar el servidor vuelven a los de ejemplo.

Usuarios de ejemplo (contraseña `cunef2026`, solo para desarrollo):

| Email | Rol | Qué puede hacer |
|---|---|---|
| `admin@cunef.edu` | admin | todo: crear, editar y borrar cualquier recurso |
| `capi@cunef.edu`, `gabo@cunef.edu` | player | publicar noticias y editar las suyas, confirmar su asistencia |
| `fan@cunef.edu` | fan | solo leer (igual que un visitante sin login) |

Leer es público. Para escribir hace falta el token que devuelve `POST /api/auth/login`, en la cabecera
`Authorization: Bearer <token>`. Sin token se responde **401**, y con un rol que no tiene permiso, **403**.

## Resources

Reglas comunes a todos los recursos:
- `id` lo genera el servidor; si el cliente lo envía, se ignora.
- Los campos desconocidos se descartan y nunca se guardan.
- `POST` y `PUT` validan **todos** los campos. `PUT` sustituye el recurso entero, así que los opcionales que no se envíen quedan en `null`.

### players (MAIN resource)
| Field | Type | Rules |
|---|---|---|
| id | number | server-generated, ignored if sent |
| name | string | required, 1–50 characters |
| shirtNumber | number | required, integer 1–99 |
| position | string (closed set) | required: `goalkeeper` \| `defender` \| `fullback` \| `midfielder` \| `forward` |
| dob | string | required, real date `YYYY-MM-DD` in the past |
| height | number | required, integer 140–220 (cm) |
| weight | number | required, integer 40–150 (kg) |
| goals | number | required, integer 0–500 |
| assists | number | required, integer 0–500 |
| appearances | number | required, integer 0–500 |
| injured | boolean | required, `true` or `false` only |
| description | string \| null | optional, max 300 characters |
| teamId | number | optional (default 1 = CUNEF FC), must be an existing team |
| age, teamName | — | read-only, computed in the response |

### teams
| Field | Type | Rules |
|---|---|---|
| id | number | server-generated, ignored if sent |
| name | string | required, 1–60 characters |
| stadium | string | required, 1–100 characters |
| creationDate | string | required, real date `YYYY-MM-DD`, not in the future |

### matches
| Field | Type | Rules |
|---|---|---|
| id | number | server-generated, ignored if sent |
| date | string | required, `YYYY-MM-DDTHH:MM` |
| location | string | required, 1–100 characters |
| homeTeamId | number | required, existing team |
| awayTeamId | number | required, existing team, different from homeTeamId |
| homeGoals | number \| null | integer 0–50, or `null` if not played yet |
| awayGoals | number \| null | integer 0–50, or `null`; both goals must be numbers or both `null` |
| callupPublished | boolean | optional (default `false`); `true` only with 11 starters saved and match not played (409) |
| status, homeTeam, awayTeam | — | read-only: `upcoming`/`played` derived from the goals |

### news
| Field | Type | Rules |
|---|---|---|
| id | number | server-generated, ignored if sent |
| title | string | required, 1–120 characters |
| information | string | required, 1–2000 characters |
| author, createdAt | — | read-only: the author comes from the token, never from the body |

### training-sessions
| Field | Type | Rules |
|---|---|---|
| id | number | server-generated, ignored if sent |
| date | string | required, real date `YYYY-MM-DD` (not in the past on POST) |
| startTime | string | required, `HH:MM` |
| location | string | required, 1–100 characters |
| type | string (closed set) | required: `tactical` \| `physical` \| `recovery` |
| notes | string \| null | optional, max 500 characters |
| isPublic | boolean | required; private sessions are only visible to players and admin |

### attendances
| Field | Type | Rules |
|---|---|---|
| id | number | server-generated, ignored if sent |
| sessionId | number | required, existing training session |
| playerId | number | required, existing player; one attendance per player and session (409) |
| status | string (closed set) | required: `pending` \| `confirmed` \| `absent` \| `injured` |
| reason | string \| null | max 300 characters; **required** when status is `absent` |

## Endpoints

Para los 6 recursos (`<r>` = `players`, `teams`, `matches`, `news`, `training-sessions`, `attendances`):

| Method | Path | Query params | Success | Errors |
|---|---|---|---|---|
| GET | /api/`<r>` | (see below) | 200 (array) | 400 |
| GET | /api/`<r>`/:id | | 200 | 404 |
| POST | /api/`<r>` | | 201 + `Location` | 400, 401, 403, 409 |
| PUT | /api/`<r>`/:id | | 200 | 400, 401, 403, 404, 409 |
| DELETE | /api/`<r>`/:id | | 204 | 401, 403, 404, 409 |

Filtros y endpoints extra:

| Method | Path | Query params | Success | Errors |
|---|---|---|---|---|
| GET | /api/players | `search`, `position`, `injured`, `sort`, `limit` | 200 | 400 |
| GET | /api/players/stats | | 200 | |
| GET | /api/matches | `status` (upcoming\|played), `teamId`, `sort`, `limit` | 200 | 400 |
| GET | /api/news | `sort` (createdAt\|title, `-` = desc), `limit` | 200 | 400 |
| GET | /api/training-sessions | `from`, `to`, `type`, `sort`, `limit` | 200 | 400 |
| GET | /api/attendances | `sessionId`, `playerId`, `status`, `from`, `to` | 200 | 400, 401, 403 |
| GET | /api/matches/:id/callup | | 200 | 404 |
| PUT | /api/matches/:id/callup | | 200 | 400, 401, 403, 404, 409 |
| GET | /api/standings | | 200 | |
| POST | /api/auth/login | | 200 | 400, 401 |
| POST | /api/users | | 201 | 400, 409 |
| * | anything else | | | 404 (JSON) |

Formato de los errores:

```json
// 400: TODOS los problemas a la vez
{ "errors": [ { "field": "shirtNumber", "message": "shirtNumber must be between 1 and 99" },
              { "field": "position", "message": "position must be one of: goalkeeper, defender, fullback, midfielder, forward" } ] }
// 401, 403, 404, 409 y 500 (nunca se envía la traza)
{ "error": "Player not found" }
```

### Examples — players (main resource)

`GET /api/players?search=ca&position=forward&injured=false` → **200**
```json
[ { "id": 13, "name": "Capi", "shirtNumber": 9, "position": "forward", "dob": "2005-10-05", "age": 21,
    "height": 181, "weight": 75, "goals": 15, "assists": 4, "appearances": 10, "injured": false,
    "description": "A talented forward and the team's captain…", "teamId": 1, "teamName": "CUNEF FC" } ]
```
`GET /api/players?injured=maybe` → **400** `{ "errors": [ { "field": "injured", "message": "injured must be true or false" } ] }`

`GET /api/players/stats` → **200**
```json
{ "total": 18, "injured": 1, "available": 17, "averageAge": 19.8, "totalGoals": 48, "totalAssists": 46,
  "averageGoals": 2.7,
  "byPosition": { "goalkeeper": 2, "defender": 3, "fullback": 2, "midfielder": 5, "forward": 6 },
  "leaders": { "goals": { "id": 13, "name": "Capi", "value": 15 },
               "assists": { "id": 12, "name": "Gabo", "value": 8 },
               "appearances": { "id": 13, "name": "Capi", "value": 10 } } }
```
`GET /api/players/13` → **200** (same object as in the list) · `GET /api/players/999` → **404** `{ "error": "Player not found" }`

`POST /api/players` (admin)
```json
{ "name": "Lucas", "shirtNumber": 23, "position": "midfielder", "dob": "2006-04-10", "height": 178,
  "weight": 70, "goals": 0, "assists": 0, "appearances": 0, "injured": false, "description": "Academy" }
```
→ **201**, `Location: /api/players/19`, body = the new player with `"id": 19`.

`PUT /api/players/19` (admin), the same body with every field → **200** with the updated player.
`DELETE /api/players/19` (admin) → **204** with no body. It also deletes that player's attendances and call-ups.

### Examples — teams
`GET /api/teams` → **200** `[ { "id": 1, "name": "CUNEF FC", "stadium": "Campos de Fútbol Ganapanes", "creationDate": "2025-06-01" }, … ]`
`GET /api/teams/1` → **200** (one team)
`POST /api/teams` `{ "name": "Test FC", "stadium": "Test Park", "creationDate": "2020-01-01" }` → **201** + `Location: /api/teams/8`
`PUT /api/teams/8` (same body) → **200** · `DELETE /api/teams/8` → **204**
`DELETE /api/teams/1` → **409** `{ "error": "CUNEF FC cannot be deleted" }` (also 409 if the team still has matches or players)

### Examples — matches
`GET /api/matches?status=upcoming&teamId=1&limit=1` → **200**
```json
[ { "id": 13, "date": "2026-11-12T16:00", "location": "Campos de Fútbol Ganapanes", "homeTeamId": 1, "awayTeamId": 4,
    "homeTeam": { "id": 1, "name": "CUNEF FC" }, "awayTeam": { "id": 4, "name": "Universidad Francisco Victoria" },
    "homeGoals": null, "awayGoals": null, "status": "upcoming", "callupPublished": true } ]
```
`GET /api/matches/13` → **200** (one match)
`POST /api/matches` `{ "date": "2030-05-01T18:00", "location": "Campus", "homeTeamId": 1, "awayTeamId": 2, "homeGoals": null, "awayGoals": null, "callupPublished": false }` → **201** + `Location`
`PUT /api/matches/18`, the same body with `"homeGoals": 2, "awayGoals": 1` (record the result) → **200** · `DELETE /api/matches/18` → **204**
`POST /api/matches` with `homeTeamId` equal to `awayTeamId` → **400** `{ "errors": [ { "field": "awayTeamId", "message": "A team cannot play against itself" } ] }`
`PUT /api/matches/13/callup` `{ "players": [ { "playerId": 1, "role": "starter" }, … ] }` → **200** with the call-up (needs exactly 11 starters)

### Examples — news
`GET /api/news?limit=1` → **200** `[ { "id": 6, "title": "Training this week: open session", "information": "…", "createdAt": "2026-11-06T12:00:00Z", "author": { "id": 3, "name": "Gabo" } } ]`
`GET /api/news/6` → **200**
`POST /api/news` (player/admin) `{ "title": "Derby day", "information": "Come and support us!" }` → **201** + `Location: /api/news/7`
`PUT /api/news/7` (author or admin), same body → **200** · `DELETE /api/news/7` → **204**
`PUT /api/news/2` as a player who is not the author → **403** `{ "error": "Only the author or an admin can change this news" }`

### Examples — training-sessions
`GET /api/training-sessions?from=2026-11-01&to=2026-11-30&type=tactical` → **200**
```json
[ { "id": 2, "date": "2026-11-08", "startTime": "19:00", "location": "Campos de Fútbol Ganapanes", "type": "tactical",
    "notes": "Pressing triggers and set pieces…", "isPublic": true, "createdBy": 1 } ]
```
`GET /api/training-sessions/2` → **200** (404 if it is private and you are not a player or admin)
`POST /api/training-sessions` (admin) `{ "date": "2030-05-02", "startTime": "19:00", "location": "Ganapanes", "type": "tactical", "notes": null, "isPublic": true }` → **201** + `Location`. It also creates a `pending` attendance for every squad player.
`PUT /api/training-sessions/6` (same body) → **200** · `DELETE /api/training-sessions/6` → **204** (also deletes its attendances)
`GET /api/training-sessions?type=yoga` → **400** `{ "errors": [ { "field": "type", "message": "type must be one of: tactical, physical, recovery" } ] }`

### Examples — attendances
`GET /api/attendances?sessionId=2` (admin; a player only gets their own) → **200**
```json
[ { "id": 19, "sessionId": 2, "playerId": 15, "playerName": "Bruno", "status": "pending", "reason": null,
    "session": { "date": "2026-11-08", "startTime": "19:00", "type": "tactical", "location": "Campos de Fútbol Ganapanes" } } ]
```
`GET /api/attendances/19` → **200**
`POST /api/attendances` (admin) `{ "sessionId": 2, "playerId": 19, "status": "pending", "reason": null }` → **201** + `Location` (409 if that player already has one for the session)
`PUT /api/attendances/19` `{ "sessionId": 2, "playerId": 15, "status": "absent", "reason": "Exam" }` → **200**. A player can only change their own, only to `confirmed`/`absent`, and only before the session starts (409).
`DELETE /api/attendances/19` (admin) → **204**
`PUT` with `"status": "absent"` and no reason → **400** `{ "errors": [ { "field": "reason", "message": "reason is required when status is absent" } ] }`

### Examples — extra endpoints
`POST /api/auth/login` `{ "email": "admin@cunef.edu", "password": "cunef2026" }` → **200** `{ "token": "eyJ…", "user": { "id": 1, "name": "Admin CUNEF FC", "role": "admin", … } }` (401 if wrong)
`POST /api/users` `{ "name": "Ana", "email": "ana@mail.com", "password": "12345678" }` → **201** (always creates a `fan`; 409 if the email exists)
`GET /api/standings` → **200** `[ { "position": 1, "teamId": 1, "team": "CUNEF FC", "played": 6, "won": 4, "drawn": 2, "lost": 0, "goalsFor": 14, "goalsAgainst": 6, "goalDifference": 8, "points": 14 }, … ]`
`GET /api/nope` → **404** `{ "error": "Route not found: GET /api/nope" }`

## Postman
1. Postman → **Import** → elige `postman/cuneffc.postman_collection.json`.
2. Arranca un servidor recién iniciado con `npm start`. La variable de colección `baseUrl` ya vale `http://localhost:3000/api`.
3. Botón derecho en la colección → **Run collection** → **Run** (en orden).
   - La petición **0** hace login como admin y guarda el `token`. Todas las demás lo envían como `Bearer {{token}}`.
   - Las peticiones **1–5** son el CRUD completo de `players`: la 2 crea un jugador y guarda su `id` en `{{playerId}}`, y las 3, 4 y 5 lo usan.
   - Las peticiones **6–11** prueban el 404 tras borrar, un POST inválido (400 con todos los errores), el filtro, un filtro inválido (400), `/stats` y una ruta desconocida.

   Cada petición tiene tests (pestaña *Tests*) que comprueban el código de estado.

## Front end
Cada página carga `js/api.js` (con `apiRequest()`, el único sitio que llama a `fetch`), luego `js/ui.js`
(utilidades del DOM: `createElement` + `textContent` + `replaceChildren`, estados de carga, error y vacío,
y errores junto a cada campo) y por último su propio script.

| Page | Script | Endpoints |
|---|---|---|
| `index.html` | `js/home.js` | `GET /api/teams/1`, `GET /api/matches?status=upcoming&teamId=1&limit=1`, `GET /api/players/stats` |
| `squad.html` | `js/squad.js` | `GET /api/players?search=&position=&injured=&sort=` (search box + 3 selects), `GET /api/players/stats`, `POST`/`PUT`/`DELETE /api/players` (admin) |
| `Season.html` | `js/season.js` | `GET /api/matches?status=…`, `POST`/`PUT`/`DELETE /api/matches`, `GET`/`PUT /api/matches/:id/callup`, `GET`/`POST`/`PUT`/`DELETE /api/teams`, `GET /api/standings` |
| `News.html` | `js/news.js` | `GET /api/news`, `POST`/`PUT`/`DELETE /api/news` (player/admin) |
| `training.html` | `js/training.js` | `GET /api/training-sessions?from=&to=&type=`, `POST`/`PUT`/`DELETE /api/training-sessions`, `GET`/`POST`/`PUT`/`DELETE /api/attendances` |
| `login.html` | `js/login.js` | `POST /api/auth/login`, `POST /api/users` |

Las listas fijas de los `<select>` (posiciones, tipo de entrenamiento y estados de asistencia) usan exactamente
los valores de los validadores. Las listas de **equipos** y **jugadores** de los formularios sí vienen de la API,
porque son recursos.

## Design decisions
- **Invalid query parameters: rejected with 400 or ignored? Why?**
  Un parámetro **conocido con un valor inválido** (`?position=striker`, `?injured=maybe`, `?limit=0`) se **rechaza con 400**
  y el mismo formato `{ errors: [...] }`. Si lo ignorásemos, el cliente recibiría la lista completa creyendo que está
  filtrada, y ese fallo silencioso es más difícil de detectar. Los parámetros **desconocidos** (`?foo=1`) se ignoran,
  igual que los campos desconocidos del body, porque no cambian el resultado.
- **Where express.static is mounted in app.js, and why there.**
  Justo después del middleware común (JSON, logger, cabeceras) y **antes** de los routers de `/api`. Así una petición
  de página (`/squad.html`, `/Styles.css`) se responde enseguida sin pasar por los routers, y no hay conflicto
  porque ningún archivo de `public/` empieza por `/api`. Va antes del 404 en JSON y del gestor de errores, que
  siempre son los últimos. Web y API comparten servidor y origen (`http://localhost:3000`). Para desarrollo hay además un CORS limitado a `localhost` y a `file://`, que permite abrir los `.html` con doble clic o con Live Server (ver `API_BASE` en `public/js/api.js`).
- **Why searching and filtering happen on the server.**
  El servidor es quien tiene todos los datos: el navegador solo descarga lo que cumple el filtro (menos datos si la lista
  crece) y la misma búsqueda sirve igual para la web, Postman o cualquier otro cliente. Además, la validación
  de los filtros está en un solo sitio, y si mañana hay base de datos el filtro pasa a ser un `WHERE` sin tocar el frontend.
- **Capas.** `routes/` (URL + permiso) → `controllers/` (validar, reglas, mapear a JSON) → `data/store.js` → `data/models/` → `data/seed.js`.
  Los controladores **solo** hablan con `store.js`. Para pasar a una base de datos real (carpeta `futuro-bd/`, todavía sin usar)
  solo cambian los archivos de `data/models/`.
- **Autenticación (opcional en la práctica).** La conservamos de los labs: leer es público y escribir exige el token,
  con el rol comprobado siempre en el token firmado y nunca en el body. Por eso la colección de Postman empieza haciendo login.
- **PUT = sustitución completa.** Por eso se validan todos los campos. Los antiguos `PATCH` (estadísticas, convocatoria publicada…)
  ahora son un `PUT` del recurso entero, y publicar una convocatoria es un `PUT /api/matches/:id` con `callupPublished: true`.
- **409 Conflict** cuando la petición es válida pero choca con el estado actual: borrar CUNEF FC o un equipo con partidos,
  repetir una asistencia, publicar una convocatoria sin 11 titulares o cambiar una asistencia de una sesión que ya empezó.
- **Borrado en cascada:** borrar un jugador borra sus asistencias y convocatorias, borrar una sesión borra sus asistencias
  y borrar un partido borra su convocatoria.

## AI
See AI/ai-report.docx.
