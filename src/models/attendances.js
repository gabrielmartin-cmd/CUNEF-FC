// models/attendances.js — acceso a los datos de asistencia a entrenamientos (ver la explicación en models/teams.js).

const data = require('../data');
const { byColumns } = require('../utils');

// Equivale a los JOIN con players y training_sessions: añade el nombre del jugador y los datos de la sesión.
function withDetails(a) {
    const p = data.players.find((x) => x.player_id === a.player_id);
    const s = data.trainingSessions.find((x) => x.session_id === a.session_id);
    return { ...a, player_name: p.player_name, session_date: s.session_date, start_time: s.start_time, type: s.type, location: s.location };
}

// Todos los filtros son opcionales.
// SQL: SELECT a.*, p.player_name, s.session_date, s.start_time, s.type, s.location
//      FROM attendances a JOIN players p ON p.player_id = a.player_id JOIN training_sessions s ON s.session_id = a.session_id
//      WHERE [a.player_id = ?] [AND a.session_id = ?] [AND a.status = ?] [AND s.session_date >= ?] [AND s.session_date <= ?]
//      ORDER BY s.session_date, s.start_time, p.player_name LIMIT ? OFFSET ?   (+ COUNT(*) para el total)
function list({ playerId, sessionId, status, from, to, limit, offset }) {
    const rows = data.attendances
        .map(withDetails)
        .filter((a) => !playerId || a.player_id === playerId)
        .filter((a) => !sessionId || a.session_id === sessionId)
        .filter((a) => !status || a.status === status)
        .filter((a) => !from || a.session_date >= from)
        .filter((a) => !to || a.session_date <= to)
        .sort(byColumns(['session_date', 'ASC'], ['start_time', 'ASC'], ['player_name', 'ASC']));
    return { rows: rows.slice(offset, offset + limit), total: rows.length };
}

// SQL: (el mismo SELECT con JOIN de list) WHERE a.attendance_id = ?
function findById(id) {
    const a = data.attendances.find((x) => x.attendance_id === id);
    return a && withDetails(a);
}

// SQL: UPDATE attendances SET status = ?, reason = ? WHERE attendance_id = ?
function update(id, status, reason) {
    Object.assign(data.attendances.find((x) => x.attendance_id === id), { status, reason });
}

module.exports = { list, findById, update };
