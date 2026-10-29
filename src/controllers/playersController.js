// playersController.js — lógica de los handlers de Jugadores y sus estadísticas.
// Las rutas (routes/players.js) solo conectan URL + middleware con estas funciones.
//
// Todos los controladores siguen el mismo patrón, este es el más sencillo para estudiarlo:
//   1. leer y VALIDAR la entrada (req.params, req.query, req.body)
//   2. pedir o modificar los datos a través del MODELO (src/models/players.js)
//   3. convertir las filas al formato de la API (mapPlayer)
//   4. responder con res.json(...)
// Los errores se "lanzan" con throw y los responde el gestor de errores de app.js.
// El controlador NO sabe si los datos están en un array (data.js) o en una base de datos:
// eso es cosa del modelo. Por eso este archivo no cambiará cuando añadamos la BD.

const Players = require('../models/players');
const Teams = require('../models/teams');
const {
    toId, notFound, badRequest, isNonNegInt, isPlainObject, requireBody,
    parsePaging, parseSort, parseEnumQuery, paged
} = require('../utils');

// Listas blancas: solo se aceptan estos valores del cliente.
const POSITIONS = ['goalkeeper', 'defender', 'fullback', 'midfielder', 'forward'];
// ?sort=goals se traduce a la columna goals. Si el cliente manda otra cosa -> 400.
const SORTS = { name: 'player_name', goals: 'goals', assists: 'assists', appearances: 'appearances' };

// La edad no se guarda (cambiaría cada año): se calcula a partir de la fecha de nacimiento.
function ageFrom(dob) {
    if (!dob) return null;
    const b = new Date(dob), n = new Date();
    let age = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
    return age;
}

// Traduce una fila de datos (snake_case: player_name) al JSON de la API (camelCase: name).
// Así el front no depende de cómo se llamen las columnas por dentro.
function mapPlayer(r) {
    return {
        id: r.player_id,
        name: r.player_name,
        shirtNumber: r.shirt_number,
        description: r.description,
        position: r.position,
        status: r.status,
        height: r.height,
        weight: r.weight,
        dob: r.dob,
        age: ageFrom(r.dob),
        teamId: r.team_id,
        teamName: r.team_name,
        stats: { goals: r.goals, assists: r.assists, appearances: r.appearances }
    };
}

// GET /api/players?position=&sort=-goals&page=&limit=
function listPlayers(req, res) {
    // 1. Validar los parámetros de la URL (req.query). Si alguno es inválido, lanzan un 400.
    const position = parseEnumQuery(req.query.position, POSITIONS, 'position');
    const sort = parseSort(req.query.sort, SORTS, 'name');            // { column: 'goals', dir: 'DESC' }
    const paging = parsePaging(req.query, { defLimit: 20, maxLimit: 100 });

    // 2. Pedir los datos al modelo. total = cuántos jugadores hay (para que el front sepa cuántas páginas hay).
    const { rows, total } = Players.list({ position, sort, limit: paging.limit, offset: paging.offset });

    // 3 y 4. Responde { data: [...jugadores], page, limit, total }
    res.json(paged(rows.map(mapPlayer), paging, total));
}

// GET /api/players/:id
function getPlayer(req, res) {
    const id = toId(req.params.id);              // "12" -> 12 ; "abc" -> null
    const row = id && Players.findById(id);
    if (!row) throw notFound('Player not found');
    res.json(mapPlayer(row));
}

// PATCH /api/players/:id  body: { stats: {goals, assists, appearances}, teamId? }   (Admin)
// Aquí no comprobamos el rol: cuando se llega a esta función, requireRole('admin') (en la ruta)
// ya ha garantizado que quien llama es admin.
function updatePlayer(req, res) {
    const id = toId(req.params.id);
    const current = id && Players.findById(id);
    if (!current) throw notFound('Player not found');

    const body = requireBody(req);
    const { stats, teamId } = body;
    if (!isPlainObject(stats)) throw badRequest('stats is required and must be an object');
    for (const k of ['goals', 'assists', 'appearances']) {
        if (!isNonNegInt(stats[k])) throw badRequest(`stats.${k} must be an integer ≥ 0`);
    }
    if (teamId !== undefined) {
        if (!Number.isInteger(teamId) || teamId < 1) throw badRequest('teamId must be an integer');
        if (!Teams.findById(teamId)) throw notFound('Team not found');
    }

    // Aquí es donde el dato se modifica DE VERDAD. Si no se envía teamId (null) se deja el equipo que ya tenía.
    Players.updateStats(id, stats, teamId ?? null);

    // Devolvemos el jugador ya actualizado para que el front pueda repintarlo.
    res.json(mapPlayer(Players.findById(id)));
}

module.exports = { listPlayers, getPlayer, updatePlayer };
