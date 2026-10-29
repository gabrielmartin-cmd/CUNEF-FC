// teamsController.js — lógica de los handlers de Datos del club (equipo).
// Las rutas (routes/teams.js) solo conectan URL + middleware con estas funciones.

const Teams = require('../models/teams');
const { toId, notFound } = require('../utils');

// GET /api/teams/:id  -> datos del club (Home)
function getTeam(req, res) {
    const id = toId(req.params.id);
    const t = id && Teams.findById(id);
    if (!t) throw notFound('Team not found');
    res.json({ id: t.team_id, name: t.name, stadium: t.stadium, creationDate: t.creation_date });
}

module.exports = { getTeam };
