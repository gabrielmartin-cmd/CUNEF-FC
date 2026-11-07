// matchesController.js — lógica de /api/matches y de su convocatoria (/api/matches/:id/callup).
const store = require('../data/store');
const { validateMatch } = require('../validators/matchValidator');
const { OWN_TEAM_ID } = require('../config');
const {
    toId, notFound, conflict, badRequest, validationError,
    parseEnumQuery, parseIdQuery, parseLimitQuery, parseSort
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
        homeTeamId: r.home_team_id,
        awayTeamId: r.away_team_id,
        homeTeam: { id: r.home_team_id, name: r.home_name },
        awayTeam: { id: r.away_team_id, name: r.away_name },
        homeGoals: r.home_goals,
        awayGoals: r.away_goals,
        status: played ? 'played' : 'upcoming',              // derivado, no se guarda
        callupPublished: r.callup_published === 1
    };
}

const mapCallupPlayer = (r) => ({
    playerId: r.player_id, name: r.player_name, position: r.position,
    shirtNumber: r.shirt_number, injured: r.injured, role: r.role
});

function findOr404(rawId) {
    const id = toId(rawId);
    const row = id && store.matches.findById(id);
    if (!row) throw notFound('Match not found');
    return row;
}

function validateBody(body) {
    const { errors, data } = validateMatch(body);
    if (data.homeTeamId && !store.teams.findById(data.homeTeamId)) errors.push({ field: 'homeTeamId', message: 'homeTeamId does not match any team' });
    if (data.awayTeamId && !store.teams.findById(data.awayTeamId)) errors.push({ field: 'awayTeamId', message: 'awayTeamId does not match any team' });
    if (errors.length) throw validationError(errors);
    return data;
}

// Reglas de la convocatoria al publicarla (409 = la petición es válida pero choca con el estado actual).
function checkPublish(matchId, data, wasPublished) {
    if (!data.callupPublished || wasPublished) return;
    if (data.homeGoals !== null && data.homeGoals !== undefined) throw conflict('A played match cannot publish a call-up');
    if (!matchId || store.matches.countStarters(matchId) !== 11) throw conflict('The call-up can be published only if it has 11 starters');
}

// GET /api/matches?status=upcoming|played&teamId=&sort=&limit=
function listMatches(req, res) {
    const status = parseEnumQuery(req.query.status, STATUSES, 'status');
    const filters = {
        status,
        teamId: parseIdQuery(req.query.teamId, 'teamId'),
        sort: parseSort(req.query.sort, SORTS, status === 'played' ? '-date' : 'date'),
        limit: parseLimitQuery(req.query.limit)
    };
    res.json(store.matches.list(filters).map(mapMatch));
}

// GET /api/matches/:id
function getMatch(req, res) {
    res.json(mapMatch(findOr404(req.params.id)));
}

// POST /api/matches
function createMatch(req, res) {
    const data = validateBody(req.body);
    checkPublish(null, data, false);
    const id = store.matches.create(data);
    res.status(201).location(`/api/matches/${id}`).json(mapMatch(store.matches.findById(id)));
}

// PUT /api/matches/:id   (también sirve para meter el resultado o publicar la convocatoria)
function replaceMatch(req, res) {
    const current = findOr404(req.params.id);
    const data = validateBody(req.body);
    checkPublish(current.match_id, data, current.callup_published === 1);
    store.matches.replace(current.match_id, data);
    res.json(mapMatch(store.matches.findById(current.match_id)));
}

// DELETE /api/matches/:id
function deleteMatch(req, res) {
    const current = findOr404(req.params.id);
    store.matches.remove(current.match_id);
    res.status(204).end();
}

// ---------- Convocatoria ----------

// GET /api/matches/:id/callup  — pública si está publicada; el admin ve también el borrador
function getCallup(req, res) {
    const match = findOr404(req.params.id);
    const isAdmin = req.user?.role === 'admin';
    if (match.callup_published !== 1 && !isAdmin) throw notFound('Call-up not published');
    res.json(store.matches.getCallup(match.match_id).map(mapCallupPlayer));
}

// PUT /api/matches/:id/callup  body: { players: [ { playerId, role }, ... ] }
function saveCallup(req, res) {
    const match = findOr404(req.params.id);
    const players = req.body?.players;

    if (!Array.isArray(players)) throw badRequest('players', 'players is required and must be an array');
    if (players.length > 20) throw badRequest('players', 'A call-up has at most 20 players');
    const errors = [];
    const seen = new Set();
    players.forEach((item, i) => {
        const field = `players[${i}]`;
        if (!item || !Number.isInteger(item.playerId) || item.playerId < 1) return errors.push({ field, message: 'playerId must be a positive integer' });
        if (seen.has(item.playerId)) errors.push({ field, message: 'A player cannot appear twice in the call-up' });
        seen.add(item.playerId);
        if (!CALLUP_ROLES.includes(item.role)) errors.push({ field, message: 'role must be starter or substitute' });
        const p = store.players.findById(item.playerId);
        if (!p) errors.push({ field, message: `Player ${item.playerId} not found` });
        else if (p.team_id !== OWN_TEAM_ID) errors.push({ field, message: `Player ${item.playerId} does not belong to CUNEF FC` });
        else if (item.role === 'starter' && p.injured) errors.push({ field, message: `${p.player_name} is injured and cannot be a starter` });
    });
    if (players.filter((p) => p?.role === 'starter').length !== 11) errors.push({ field: 'players', message: 'A call-up needs exactly 11 starters' });
    if (errors.length) throw validationError(errors);
    if (match.home_goals !== null) throw conflict('The call-up can only be changed for an upcoming match');

    store.matches.replaceCallup(match.match_id, players.map(({ playerId, role }) => ({ playerId, role })));
    res.json(store.matches.getCallup(match.match_id).map(mapCallupPlayer));
}

module.exports = { listMatches, getMatch, createMatch, replaceMatch, deleteMatch, getCallup, saveCallup };
