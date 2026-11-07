// models/players.js — lee y modifica data.players. Solo lo usa el store (src/data/store.js).
const data = require('../seed');
const { OWN_TEAM_ID } = require('../../config');
const { byColumns, nextId, removeWhere } = require('../../utils');

function withTeam(p) {
    const team = data.teams.find((t) => t.team_id === p.team_id);
    return { ...p, team_name: team ? team.name : null };
}

// datos del validador (camelCase) -> fila guardada (snake_case, como las columnas de la futura BD)
const toRow = (d) => ({
    player_name: d.name, shirt_number: d.shirtNumber, position: d.position, dob: d.dob,
    height: d.height, weight: d.weight, goals: d.goals, assists: d.assists, appearances: d.appearances,
    injured: d.injured, description: d.description ?? null, team_id: d.teamId ?? OWN_TEAM_ID
});

// Filtros del endpoint filtrado. Todos se combinan (AND).
//   search   -> el nombre CONTIENE el texto, sin distinguir mayúsculas
//   position -> posición exacta
//   injured  -> true / false
function list({ search = null, position = null, injured = null, sort = { column: 'player_name', dir: 'ASC' }, limit = null } = {}) {
    const rows = data.players
        .filter((p) => !search || p.player_name.toLowerCase().includes(search))
        .filter((p) => !position || p.position === position)
        .filter((p) => injured === null || p.injured === injured)
        .sort(byColumns([sort.column, sort.dir], ['player_name', 'ASC']));   // filter ya creó un array nuevo
    return (limit ? rows.slice(0, limit) : rows).map(withTeam);
}

function findById(id) {
    const player = data.players.find((p) => p.player_id === id);
    return player && withTeam(player);
}

function create(d) {
    const row = { player_id: nextId(data.players, 'player_id'), ...toRow(d) };
    data.players.push(row);
    return row.player_id;
}

function replace(id, d) {
    Object.assign(data.players.find((p) => p.player_id === id), toRow(d));
}

// Borrar un jugador borra también sus asistencias y convocatorias (como ON DELETE CASCADE).
function remove(id) {
    if (!removeWhere(data.players, (p) => p.player_id === id)) return false;
    removeWhere(data.attendances, (a) => a.player_id === id);
    removeWhere(data.callups, (c) => c.player_id === id);
    return true;
}

const countByTeam = (teamId) => data.players.filter((p) => p.team_id === teamId).length;

module.exports = { list, findById, create, replace, remove, countByTeam };
