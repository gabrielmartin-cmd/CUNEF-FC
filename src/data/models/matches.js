// models/matches.js — lee y modifica data.matches y data.callups (convocatorias).
const data = require('../seed');
const { byColumns, nextId, removeWhere } = require('../../utils');

const isPlayed = (m) => m.home_goals !== null;
const teamName = (id) => data.teams.find((t) => t.team_id === id)?.name ?? null;
const withTeams = (m) => ({ ...m, home_name: teamName(m.home_team_id), away_name: teamName(m.away_team_id) });

const toRow = (d) => ({
    match_date: d.date, location: d.location, home_team_id: d.homeTeamId, away_team_id: d.awayTeamId,
    home_goals: d.homeGoals ?? null, away_goals: d.awayGoals ?? null, callup_published: d.callupPublished ? 1 : 0
});

function list({ status = null, teamId = null, sort = { column: 'match_date', dir: 'ASC' }, limit = null } = {}) {
    const rows = data.matches
        .filter((m) => status !== 'upcoming' || !isPlayed(m))
        .filter((m) => status !== 'played' || isPlayed(m))
        .filter((m) => !teamId || m.home_team_id === teamId || m.away_team_id === teamId)
        .sort(byColumns([sort.column, sort.dir], ['match_id', sort.dir]));
    return (limit ? rows.slice(0, limit) : rows).map(withTeams);
}

function findById(id) {
    const match = data.matches.find((m) => m.match_id === id);
    return match && withTeams(match);
}

function create(d) {
    const row = { match_id: nextId(data.matches, 'match_id'), ...toRow(d) };
    data.matches.push(row);
    return row.match_id;
}

function replace(id, d) {
    Object.assign(data.matches.find((m) => m.match_id === id), toRow(d));
}

// Borrar un partido borra también su convocatoria.
function remove(id) {
    if (!removeWhere(data.matches, (m) => m.match_id === id)) return false;
    removeWhere(data.callups, (c) => c.match_id === id);
    return true;
}

const countByTeam = (teamId) => data.matches.filter((m) => m.home_team_id === teamId || m.away_team_id === teamId).length;

// ---- Convocatoria (sub-recurso /api/matches/:id/callup)
function getCallup(matchId) {
    return data.callups
        .filter((c) => c.match_id === matchId)
        .map((c) => {
            const p = data.players.find((x) => x.player_id === c.player_id);
            return { role: c.role, player_id: p.player_id, player_name: p.player_name, position: p.position, shirt_number: p.shirt_number, injured: p.injured };
        })
        .sort((a, b) => (b.role === 'starter') - (a.role === 'starter') || a.shirt_number - b.shirt_number);
}

function replaceCallup(matchId, players) {
    removeWhere(data.callups, (c) => c.match_id === matchId);
    for (const { playerId, role } of players) {
        data.callups.push({ callup_id: nextId(data.callups, 'callup_id'), match_id: matchId, player_id: playerId, role });
    }
}

const countStarters = (matchId) => data.callups.filter((c) => c.match_id === matchId && c.role === 'starter').length;

module.exports = { list, findById, create, replace, remove, countByTeam, getCallup, replaceCallup, countStarters };
