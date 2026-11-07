// models/trainingSessions.js — lee y modifica data.trainingSessions.
const data = require('../seed');
const { OWN_TEAM_ID } = require('../../config');
const { byColumns, nextId, removeWhere } = require('../../utils');

const toRow = (d) => ({
    session_date: d.date, start_time: d.startTime, location: d.location, type: d.type,
    notes: d.notes ?? null, is_public: d.isPublic ? 1 : 0
});

function list({ from = null, to = null, type = null, onlyPublic = false, sort = { column: 'session_date', dir: 'ASC' }, limit = null } = {}) {
    const rows = data.trainingSessions
        .filter((s) => !from || s.session_date >= from)          // las fechas 'YYYY-MM-DD' se pueden comparar como texto
        .filter((s) => !to || s.session_date <= to)
        .filter((s) => !type || s.type === type)
        .filter((s) => !onlyPublic || s.is_public === 1)
        .sort(byColumns([sort.column, sort.dir], ['start_time', sort.dir]));
    return limit ? rows.slice(0, limit) : rows;
}

const findById = (id) => data.trainingSessions.find((s) => s.session_id === id);

// Crear una sesión crea también una asistencia "pending" para cada jugador de la plantilla.
function create(d, createdBy) {
    const session = { session_id: nextId(data.trainingSessions, 'session_id'), ...toRow(d), created_by: createdBy };
    data.trainingSessions.push(session);
    for (const p of data.players.filter((x) => x.team_id === OWN_TEAM_ID)) {
        data.attendances.push({
            attendance_id: nextId(data.attendances, 'attendance_id'),
            session_id: session.session_id, player_id: p.player_id, status: 'pending', reason: null
        });
    }
    return session.session_id;
}

function replace(id, d) {
    Object.assign(findById(id), toRow(d));
}

// Borrar una sesión borra también sus asistencias.
function remove(id) {
    if (!removeWhere(data.trainingSessions, (s) => s.session_id === id)) return false;
    removeWhere(data.attendances, (a) => a.session_id === id);
    return true;
}

module.exports = { list, findById, create, replace, remove };
