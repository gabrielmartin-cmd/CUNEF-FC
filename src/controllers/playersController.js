// playersController.js — lógica de /api/players (recurso PRINCIPAL).
// Cada handler sigue los mismos pasos: leer/validar la petición -> pedir al store -> responder.
const store = require('../data/store');
const { validatePlayer, POSITIONS } = require('../validators/playerValidator');
const {
    toId, notFound, validationError,
    parseSearchQuery, parseEnumQuery, parseBoolQuery, parseLimitQuery, parseSort
} = require('../utils');

// ?sort= admitidos (nombre en la API -> columna guardada)
const SORTS = { name: 'player_name', goals: 'goals', assists: 'assists', appearances: 'appearances', shirtNumber: 'shirt_number' };

function ageFrom(dob) {
    const b = new Date(dob), n = new Date();
    let age = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
    return age;
}

// fila guardada (snake_case) -> JSON de la API (camelCase)
const mapPlayer = (r) => ({
    id: r.player_id,
    name: r.player_name,
    shirtNumber: r.shirt_number,
    position: r.position,
    dob: r.dob,
    age: ageFrom(r.dob),
    height: r.height,
    weight: r.weight,
    goals: r.goals,
    assists: r.assists,
    appearances: r.appearances,
    injured: r.injured,
    description: r.description,
    teamId: r.team_id,
    teamName: r.team_name
});

function findOr404(rawId) {
    const id = toId(rawId);                       // "12" -> 12 ; "abc" -> null
    const row = id && store.players.findById(id);
    if (!row) throw notFound('Player not found');
    return row;
}

// Valida el body y, además, que el equipo exista. Lanza 400 con TODOS los errores juntos.
function validateBody(body) {
    const { valid, errors, data } = validatePlayer(body);
    if (data.teamId && !store.teams.findById(data.teamId)) errors.push({ field: 'teamId', message: 'teamId does not match any team' });
    if (!valid || errors.length) throw validationError(errors);
    return data;
}

// GET /api/players?search=&position=&injured=&sort=&limit=   (endpoint FILTRADO; los filtros se combinan)
function listPlayers(req, res) {
    const filters = {
        search: parseSearchQuery(req.query.search),
        position: parseEnumQuery(req.query.position, POSITIONS, 'position'),
        injured: parseBoolQuery(req.query.injured, 'injured'),
        sort: parseSort(req.query.sort, SORTS, 'name'),
        limit: parseLimitQuery(req.query.limit)
    };
    res.json(store.players.list(filters).map(mapPlayer));      // array, puede estar vacío
}

// GET /api/players/stats — resumen calculado EN CADA PETICIÓN (no se guarda en ningún sitio).
function getStats(req, res) {
    const players = store.players.list().map(mapPlayer);
    const total = players.length;
    const sum = (key) => players.reduce((acc, p) => acc + p[key], 0);
    const round1 = (n) => Math.round(n * 10) / 10;
    const leader = (key) => {
        if (!total) return null;
        const best = players.reduce((a, b) => (b[key] > a[key] ? b : a));
        return { id: best.id, name: best.name, value: best[key] };
    };
    const byPosition = Object.fromEntries(POSITIONS.map((pos) => [pos, players.filter((p) => p.position === pos).length]));
    const injured = players.filter((p) => p.injured).length;

    res.json({
        total,
        injured,
        available: total - injured,
        averageAge: total ? round1(sum('age') / total) : 0,
        totalGoals: sum('goals'),
        totalAssists: sum('assists'),
        averageGoals: total ? round1(sum('goals') / total) : 0,
        byPosition,
        leaders: { goals: leader('goals'), assists: leader('assists'), appearances: leader('appearances') }
    });
}

// GET /api/players/:id
function getPlayer(req, res) {
    res.json(mapPlayer(findOr404(req.params.id)));
}

// POST /api/players  -> 201 + cabecera Location con la URL del nuevo jugador
function createPlayer(req, res) {
    const data = validateBody(req.body);
    const id = store.players.create(data);
    res.status(201).location(`/api/players/${id}`).json(mapPlayer(store.players.findById(id)));
}

// PUT /api/players/:id  -> sustituye el jugador entero (por eso se validan todos los campos)
function replacePlayer(req, res) {
    const current = findOr404(req.params.id);
    const data = validateBody(req.body);
    store.players.replace(current.player_id, data);
    res.json(mapPlayer(store.players.findById(current.player_id)));
}

// DELETE /api/players/:id  -> 204 sin cuerpo
function deletePlayer(req, res) {
    const current = findOr404(req.params.id);
    store.players.remove(current.player_id);
    res.status(204).end();
}

module.exports = { listPlayers, getStats, getPlayer, createPlayer, replacePlayer, deletePlayer };
