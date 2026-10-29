// models/standings.js — clasificación calculada a partir de los partidos jugados (3-1-0).
// No es una "tabla": se calcula cada vez con los datos de teams y matches.

const data = require('../data');
const { byColumns } = require('../utils');

// SQL: WITH results AS (
//          SELECT home_team_id AS team_id, home_goals AS gf, away_goals AS ga FROM matches WHERE home_goals IS NOT NULL
//          UNION ALL
//          SELECT away_team_id, away_goals, home_goals FROM matches WHERE home_goals IS NOT NULL)
//      SELECT t.team_id, t.name, COUNT(r.team_id) AS played, SUM(r.gf > r.ga) AS won, ... AS points
//      FROM teams t LEFT JOIN results r ON r.team_id = t.team_id
//      GROUP BY t.team_id ORDER BY points DESC, goal_difference DESC, goals_for DESC, t.name ASC
function compute() {
    // Una fila a cero por equipo (así aparecen también los que aún no han jugado)
    const rows = data.teams.map((t) => ({
        team_id: t.team_id, name: t.name, played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0, points: 0
    }));
    const add = (teamId, gf, ga) => {
        const r = rows.find((x) => x.team_id === teamId);
        r.played++;
        r.goals_for += gf;
        r.goals_against += ga;
        r.goal_difference += gf - ga;
        if (gf > ga) { r.won++; r.points += 3; } else if (gf === ga) { r.drawn++; r.points += 1; } else r.lost++;
    };
    for (const m of data.matches) {
        if (m.home_goals === null) continue;                    // aún no jugado
        add(m.home_team_id, m.home_goals, m.away_goals);
        add(m.away_team_id, m.away_goals, m.home_goals);
    }
    return rows.sort(byColumns(['points', 'DESC'], ['goal_difference', 'DESC'], ['goals_for', 'DESC'], ['name', 'ASC']));
}

module.exports = { compute };
