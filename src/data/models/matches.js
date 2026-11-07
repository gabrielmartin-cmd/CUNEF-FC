// models/matches.js — acceso a los datos de partidos y convocatorias (ver la explicación en models/teams.js).

const data = require('../data');
const { byColumns, nextId, removeWhere } = require('../utils');

const isPlayed = (m) => m.home_goals !== null;
const teamName = (id) => data.teams.find((t) => t.team_id === id)?.name ?? null;

// Equivale a los dos JOIN con teams: añade home_name y away_name.
const withTeams = (m) => ({ ...m, home_name: teamName(m.home_team_id), away_name: teamName(m.away_team_id) });

// SQL: SELECT m.*, h.name AS home_name, a.name AS away_name
//      FROM matches m JOIN teams h ON h.team_id = m.home_team_id JOIN teams a ON a.team_id = m.away_team_id
//      [WHERE m.home_goals IS NULL | IS NOT NULL] [AND (m.home_team_id = ? OR m.away_team_id = ?)]
//      ORDER BY <sort.column> <sort.dir>, m.match_id <sort.dir> LIMIT ? OFFSET ?   (+ COUNT(*) para el total)
function list({ status, teamId, sort, limit, offset }) {
    const rows = data.matches
        .filter((m) => status !== 'upcoming' || !isPlayed(m))
        .filter((m) => status !== 'played' || isPlayed(m))
        .filter((m) => !teamId || m.home_team_id === teamId || m.away_team_id === teamId)
        .sort(byColumns([sort.column, sort.dir], ['match_id', sort.dir]));
    return { rows: rows.slice(offset, offset + limit).map(withTeams), total: rows.length };
}

// SQL: (el mismo SELECT con JOIN de list) WHERE m.match_id = ?
function findById(id) {
    const match = data.matches.find((m) => m.match_id === id);
    return match && withTeams(match);
}

// SQL: UPDATE matches SET callup_published = ? WHERE match_id = ?
function setCallupPublished(id, published) {
    data.matches.find((m) => m.match_id === id).callup_published = published ? 1 : 0;
}

// ---- Convocatorias (tabla callups)

// SQL: SELECT c.role, p.player_id, p.player_name, p.position, p.shirt_number, p.status
//      FROM callups c JOIN players p ON p.player_id = c.player_id
//      WHERE c.match_id = ? ORDER BY (c.role = 'starter') DESC, p.shirt_number ASC
function getCallup(matchId) {
    return data.callups
        .filter((c) => c.match_id === matchId)
        .map((c) => {
            const p = data.players.find((x) => x.player_id === c.player_id);
            return { role: c.role, player_id: p.player_id, player_name: p.player_name, position: p.position, shirt_number: p.shirt_number, status: p.status };
        })
        .sort((a, b) => (b.role === 'starter') - (a.role === 'starter') || a.shirt_number - b.shirt_number);
}

// Sustituye la convocatoria entera. Con BD irá dentro de una transacción:
// SQL: DELETE FROM callups WHERE match_id = ?
//      INSERT INTO callups (match_id, player_id, role) VALUES (?, ?, ?)   (una vez por jugador)
function replaceCallup(matchId, players) {
    removeWhere(data.callups, (c) => c.match_id === matchId);
    for (const { playerId, role } of players) {
        data.callups.push({ callup_id: nextId(data.callups, 'callup_id'), match_id: matchId, player_id: playerId, role });
    }
}

// SQL: SELECT COUNT(*) AS n FROM callups WHERE match_id = ? AND role = 'starter'
const countStarters = (matchId) => data.callups.filter((c) => c.match_id === matchId && c.role === 'starter').length;

module.exports = { list, findById, setCallupPublished, getCallup, replaceCallup, countStarters };
