// models/attendances.js — lee y modifica data.attendances.
const data = require('../seed');
const { byColumns, nextId, removeWhere } = require('../../utils');

// Añade a la asistencia el nombre del jugador y los datos de la sesión (como un JOIN).
function withDetails(a) {
    const p = data.players.find((x) => x.player_id === a.player_id);
    const s = data.trainingSessions.find((x) => x.session_id === a.session_id);
    return { ...a, player_name: p.player_name, session_date: s.session_date, start_time: s.start_time, type: s.type, location: s.location };
}

const toRow = (d) => ({ session_id: d.sessionId, player_id: d.playerId, status: d.status, reason: d.reason ?? null });

function list({ playerId = null, sessionId = null, status = null, from = null, to = null } = {}) {
    return data.attendances
        .map(withDetails)
        .filter((a) => !playerId || a.player_id === playerId)
        .filter((a) => !sessionId || a.session_id === sessionId)
        .filter((a) => !status || a.status === status)
        .filter((a) => !from || a.session_date >= from)
        .filter((a) => !to || a.session_date <= to)
        .sort(byColumns(['session_date', 'ASC'], ['start_time', 'ASC'], ['player_name', 'ASC']));
}

function findById(id) {
    const a = data.attendances.find((x) => x.attendance_id === id);
    return a && withDetails(a);
}

// Un jugador solo puede tener una asistencia por sesión (como un UNIQUE(session_id, player_id)).
const findBySessionAndPlayer = (sessionId, playerId) =>
    data.attendances.find((a) => a.session_id === sessionId && a.player_id === playerId);

function create(d) {
    const row = { attendance_id: nextId(data.attendances, 'attendance_id'), ...toRow(d) };
    data.attendances.push(row);
    return row.attendance_id;
}

function replace(id, d) {
    Object.assign(data.attendances.find((a) => a.attendance_id === id), toRow(d));
}

const remove = (id) => removeWhere(data.attendances, (a) => a.attendance_id === id) > 0;

module.exports = { list, findById, findBySessionAndPlayer, create, replace, remove };
