// standingsController.js — lógica de los handlers de Clasificación de la liga (calculada con los partidos jugados).
// Las rutas (routes/standings.js) solo conectan URL + middleware con estas funciones.

const Standings = require('../models/standings');

// GET /api/standings -> clasificación calculada a partir de los partidos jugados (3-1-0)
function listStandings(req, res) {
    const rows = Standings.compute();

    res.json(rows.map((r, i) => ({
        position: i + 1,
        teamId: r.team_id,
        team: r.name,
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        goalsFor: r.goals_for,
        goalsAgainst: r.goals_against,
        goalDifference: r.goal_difference,
        points: r.points
    })));
}

module.exports = { listStandings };
