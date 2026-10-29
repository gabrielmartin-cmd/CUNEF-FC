// models/players.js — acceso a los datos de los jugadores (ver la explicación en models/teams.js).

const data = require('../data');
const { byColumns } = require('../utils');

// Equivale al JOIN con teams: devuelve una copia del jugador con el nombre de su equipo (team_name).
function withTeam(p) {
    const team = data.teams.find((t) => t.team_id === p.team_id);
    return { ...p, team_name: team ? team.name : null };
}

// SQL: SELECT p.*, t.name AS team_name FROM players p JOIN teams t ON t.team_id = p.team_id
//      [WHERE p.position = ?] ORDER BY <sort.column> <sort.dir>, p.player_name ASC LIMIT ? OFFSET ?
//      (+ SELECT COUNT(*) con el mismo WHERE para el total)
function list({ position, sort, limit, offset }) {
    const rows = data.players
        .filter((p) => !position || p.position === position)        // filter crea un array nuevo: ordenar no altera data.players
        .sort(byColumns([sort.column, sort.dir], ['player_name', 'ASC']));
    return { rows: rows.slice(offset, offset + limit).map(withTeam), total: rows.length };
}

// SQL: SELECT p.*, t.name AS team_name FROM players p JOIN teams t ON t.team_id = p.team_id WHERE p.player_id = ?
function findById(id) {
    const player = data.players.find((p) => p.player_id === id);
    return player && withTeam(player);
}

// SQL: UPDATE players SET goals = ?, assists = ?, appearances = ?, team_id = COALESCE(?, team_id) WHERE player_id = ?
function updateStats(id, { goals, assists, appearances }, teamId) {
    const player = data.players.find((p) => p.player_id === id);
    Object.assign(player, { goals, assists, appearances });
    if (teamId != null) player.team_id = teamId;
}

module.exports = { list, findById, updateStats };
