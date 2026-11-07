// teamsController.js — lógica de /api/teams (los equipos de la liga, CUNEF FC incluido).
const store = require('../data/store');
const { validateTeam } = require('../validators/teamValidator');
const { OWN_TEAM_ID } = require('../config');
const { toId, notFound, conflict, validationError } = require('../utils');

const mapTeam = (t) => ({ id: t.team_id, name: t.name, stadium: t.stadium, creationDate: t.creation_date });

function findOr404(rawId) {
    const id = toId(rawId);
    const row = id && store.teams.findById(id);
    if (!row) throw notFound('Team not found');
    return row;
}

function validateBody(body) {
    const { valid, errors, data } = validateTeam(body);
    if (!valid) throw validationError(errors);
    return data;
}

// GET /api/teams
function listTeams(req, res) {
    res.json(store.teams.list().map(mapTeam));
}

// GET /api/teams/:id
function getTeam(req, res) {
    res.json(mapTeam(findOr404(req.params.id)));
}

// POST /api/teams
function createTeam(req, res) {
    const id = store.teams.create(validateBody(req.body));
    res.status(201).location(`/api/teams/${id}`).json(mapTeam(store.teams.findById(id)));
}

// PUT /api/teams/:id
function replaceTeam(req, res) {
    const current = findOr404(req.params.id);
    store.teams.replace(current.team_id, validateBody(req.body));
    res.json(mapTeam(store.teams.findById(current.team_id)));
}

// DELETE /api/teams/:id
// 409 si es nuestro club o si todavía tiene partidos o jugadores (no dejamos datos "huérfanos").
function deleteTeam(req, res) {
    const current = findOr404(req.params.id);
    if (current.team_id === OWN_TEAM_ID) throw conflict('CUNEF FC cannot be deleted');
    if (store.matches.countByTeam(current.team_id) || store.players.countByTeam(current.team_id))
        throw conflict('This team still has matches or players. Delete them first.');
    store.teams.remove(current.team_id);
    res.status(204).end();
}

module.exports = { listTeams, getTeam, createTeam, replaceTeam, deleteTeam };
