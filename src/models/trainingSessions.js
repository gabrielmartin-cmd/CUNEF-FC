// models/trainingSessions.js — acceso a los datos de los entrenamientos (ver la explicación en models/teams.js).

const data = require('../data');
const { OWN_TEAM_ID } = require('../config');
const { byColumns, nextId, removeWhere } = require('../utils');

// SQL: SELECT * FROM training_sessions
//      WHERE session_date >= ? [AND session_date <= ?] [AND type = ?] [AND is_public = 1]
//      ORDER BY <sort.column> <sort.dir>, start_time <sort.dir> LIMIT ? OFFSET ?   (+ COUNT(*) para el total)
function list({ from, to, type, onlyPublic, sort, limit, offset }) {
    const rows = data.trainingSessions
        .filter((s) => s.session_date >= from)                 // las fechas 'YYYY-MM-DD' se pueden comparar como texto
        .filter((s) => !to || s.session_date <= to)
        .filter((s) => !type || s.type === type)
        .filter((s) => !onlyPublic || s.is_public === 1)
        .sort(byColumns([sort.column, sort.dir], ['start_time', sort.dir]));
    return { rows: rows.slice(offset, offset + limit), total: rows.length };
}

// SQL: SELECT * FROM training_sessions WHERE session_id = ?
const findById = (id) => data.trainingSessions.find((s) => s.session_id === id);

// Crea la sesión Y una asistencia "pending" para cada jugador de nuestro club. Devuelve el id nuevo.
// `fields` ya viene validado y con nombres de columna (session_date, start_time...).
// Con BD, las dos consultas irán dentro de una transacción (o se guardan las dos o ninguna):
// SQL: INSERT INTO training_sessions (session_date, start_time, location, type, notes, is_public, created_by) VALUES (...)
//      INSERT INTO attendances (session_id, player_id, status) SELECT ?, player_id, 'pending' FROM players WHERE team_id = ?
function create(fields, createdBy) {
    const session = {
        session_id: nextId(data.trainingSessions, 'session_id'),
        session_date: fields.session_date, start_time: fields.start_time, location: fields.location, type: fields.type,
        notes: fields.notes ?? null, is_public: fields.is_public ?? 0, created_by: createdBy
    };
    data.trainingSessions.push(session);
    for (const p of data.players.filter((x) => x.team_id === OWN_TEAM_ID)) {
        data.attendances.push({
            attendance_id: nextId(data.attendances, 'attendance_id'),
            session_id: session.session_id, player_id: p.player_id, status: 'pending', reason: null
        });
    }
    return session.session_id;
}

// SQL: UPDATE training_sessions SET col1 = ?, col2 = ? ... WHERE session_id = ?
function update(id, fields) {
    Object.assign(findById(id), fields);
}

// Devuelve true si existía. Sus asistencias se borran también (en la BD: ON DELETE CASCADE).
// SQL: DELETE FROM training_sessions WHERE session_id = ?
function remove(id) {
    if (!removeWhere(data.trainingSessions, (s) => s.session_id === id)) return false;
    removeWhere(data.attendances, (a) => a.session_id === id);
    return true;
}

module.exports = { list, findById, create, update, remove };
