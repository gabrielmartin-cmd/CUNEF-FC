// matchesController.js — lógica de los handlers de Partidos y convocatorias.
// Las rutas (routes/matches.js) solo conectan URL + middleware con estas funciones.

const Matches = require('../models/matches');
const Players = require('../models/players');
const { OWN_TEAM_ID } = require('../config');
const {
    toId, notFound, badRequest, conflict, requireBody, isPlainObject,
    parsePaging, parseSort, parseEnumQuery, paged
} = require('../utils');

const STATUSES = ['upcoming', 'played'];
const SORTS = { date: 'match_date' };
const CALLUP_ROLES = ['starter', 'substitute'];

function mapMatch(r) {
    const played = r.home_goals !== null;
    return {
        id: r.match_id,
        date: r.match_date,                                  // YYYY-MM-DDTHH:MM
        location: r.location,
        homeTeam: { id: r.home_team_id, name: r.home_name },
        awayTeam: { id: r.away_team_id, name: r.away_name },
        result: played ? { homeGoals: r.home_goals, awayGoals: r.away_goals } : null,
        status: played ? 'played' : 'upcoming',              // derivado, no se guarda
        callupPublished: r.callup_published === 1
    };
}

const findMatch = (id) => {
    const mid = toId(id);
    const row = mid && Matches.findById(mid);
    if (!row) throw notFound('Match not found');
    return row;
};

// Fila de la convocatoria -> JSON de la API
const mapCallupPlayer = (r) => ({
    playerId: r.player_id, name: r.player_name, position: r.position,
    shirtNumber: r.shirt_number, playerStatus: r.status, role: r.role
});

// GET /api/matches?status=upcoming|played&teamId=&sort=&page=&limit=   (público)
// teamId es un extra útil: "solo los partidos de mi club" (Home/Season).
function listMatches(req, res) {
    const status = parseEnumQuery(req.query.status, STATUSES, 'status');
    const defSort = status === 'played' ? '-date' : 'date';
    const sort = parseSort(req.query.sort, SORTS, defSort);
    const paging = parsePaging(req.query, { defLimit: 20, maxLimit: 100 });

    let teamId = null;
    if (req.query.teamId !== undefined) {
        teamId = toId(req.query.teamId);
        if (!teamId) throw badRequest('teamId must be a positive integer');
    }

    const { rows, total } = Matches.list({ status, teamId, sort, limit: paging.limit, offset: paging.offset });
    res.json(paged(rows.map(mapMatch), paging, total));
}

// GET /api/matches/:id/callup
// Visitantes/fans/players: 404 hasta que se publique. Admin: siempre.
function getCallup(req, res) {
    const match = findMatch(req.params.id);
    const isAdmin = req.user?.role === 'admin';
    if (match.callup_published !== 1 && !isAdmin) throw notFound('Call-up not published');

    res.json(Matches.getCallup(match.match_id).map(mapCallupPlayer));
}

// PUT /api/matches/:id/callup   body: { players: [{ playerId, role }] }   (Admin)
// Sustituye la lista ENTERA (por eso PUT y no PATCH).
function saveCallup(req, res) {
    const match = findMatch(req.params.id);
    const { players } = requireBody(req);

    // --- forma del body (400)
    if (!Array.isArray(players)) throw badRequest('players is required and must be an array');
    if (players.length > 20) throw badRequest('A call-up has at most 20 players');
    const seen = new Set();
    for (const item of players) {
        if (!isPlainObject(item)) throw badRequest('Each player must be an object { playerId, role }');
        if (!Number.isInteger(item.playerId) || item.playerId < 1) throw badRequest('playerId must be an integer');
        if (seen.has(item.playerId)) throw badRequest('A player cannot appear twice in the call-up');
        seen.add(item.playerId);
        if (!CALLUP_ROLES.includes(item.role)) throw badRequest('role must be starter or substitute');
    }
    if (players.filter((p) => p.role === 'starter').length !== 11) throw badRequest('A call-up needs exactly 11 starters');

    // --- cada jugador debe existir (404) y ser de nuestro club (400)
    const playerById = new Map();
    for (const { playerId } of players) {
        const p = Players.findById(playerId);
        if (!p) throw notFound(`Player ${playerId} not found`);
        if (p.team_id !== OWN_TEAM_ID) throw badRequest(`Player ${playerId} does not belong to CUNEF FC`);
        playerById.set(playerId, p);
    }

    // --- reglas de negocio (409)
    if (match.home_goals !== null) throw conflict('The call-up can only be changed for an upcoming match');
    for (const { playerId, role } of players) {
        if (role === 'starter' && playerById.get(playerId).status === 'injured')
            throw conflict(`Player ${playerId} is injured and cannot be a starter`);
    }

    Matches.replaceCallup(match.match_id, players);
    res.json(Matches.getCallup(match.match_id).map(mapCallupPlayer));
}

// PATCH /api/matches/:id   body: { callupPublished: true|false }   (Admin)
function updateMatch(req, res) {
    const match = findMatch(req.params.id);
    const { callupPublished } = requireBody(req);
    if (typeof callupPublished !== 'boolean') throw badRequest('callupPublished is required and must be a boolean');

    if (callupPublished) {
        if (match.home_goals !== null) throw conflict('The match has already been played');
        if (Matches.countStarters(match.match_id) !== 11) throw conflict('The call-up can be published only if it has 11 starters');
    }
    Matches.setCallupPublished(match.match_id, callupPublished);
    res.json(mapMatch(findMatch(match.match_id)));
}

module.exports = { listMatches, getCallup, saveCallup, updateMatch };
