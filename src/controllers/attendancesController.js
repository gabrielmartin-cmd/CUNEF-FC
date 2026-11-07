// attendancesController.js — lógica de /api/attendances.
//   admin  -> lo ve y lo cambia todo
//   player -> solo ve las suyas y solo puede cambiar status/reason (confirmed o absent) antes de que empiece la sesión
//   fan / visitante -> 403 / 401
const store = require('../data/store');
const { validateAttendance, STATUSES } = require('../validators/attendanceValidator');
const {
    toId, notFound, forbidden, conflict, badRequest, validationError, nowStr,
    parseEnumQuery, parseIdQuery, parseDateQuery
} = require('../utils');

const mapAttendance = (r) => ({
    id: r.attendance_id,
    sessionId: r.session_id,
    playerId: r.player_id,
    playerName: r.player_name,
    status: r.status,
    reason: r.reason,
    session: { date: r.session_date, startTime: r.start_time, type: r.type, location: r.location }
});

function requireSquadAccess(req) {
    const { role, playerId } = req.user;
    if (role === 'admin' || (role === 'player' && playerId)) return;
    throw forbidden('Only players and admins have attendances');
}

function findOr404(req) {
    const id = toId(req.params.id);
    const row = id && store.attendances.findById(id);
    if (!row) throw notFound('Attendance not found');
    if (req.user.role !== 'admin' && row.player_id !== req.user.playerId) throw forbidden('This attendance is not yours');
    return row;
}

// Valida el body y que la sesión y el jugador existan.
function validateBody(body) {
    const { errors, data } = validateAttendance(body);
    if (data.sessionId && !store.trainingSessions.findById(data.sessionId)) errors.push({ field: 'sessionId', message: 'sessionId does not match any session' });
    if (data.playerId && !store.players.findById(data.playerId)) errors.push({ field: 'playerId', message: 'playerId does not match any player' });
    if (errors.length) throw validationError(errors);
    if (data.status !== 'absent' && data.status !== 'injured') data.reason = null;   // el motivo solo tiene sentido si no viene
    return data;
}

// GET /api/attendances?sessionId=&playerId=&status=&from=&to=
function listAttendances(req, res) {
    requireSquadAccess(req);
    const filters = {
        // un player solo ve las suyas, aunque pida otro playerId
        playerId: req.user.role === 'player' ? req.user.playerId : parseIdQuery(req.query.playerId, 'playerId'),
        sessionId: parseIdQuery(req.query.sessionId, 'sessionId'),
        status: parseEnumQuery(req.query.status, STATUSES, 'status'),
        from: parseDateQuery(req.query.from, 'from'),
        to: parseDateQuery(req.query.to, 'to')
    };
    if (filters.from && filters.to && filters.to < filters.from) throw badRequest('to', 'to cannot be before from');
    res.json(store.attendances.list(filters).map(mapAttendance));
}

// GET /api/attendances/:id
function getAttendance(req, res) {
    requireSquadAccess(req);
    res.json(mapAttendance(findOr404(req)));
}

// POST /api/attendances  (admin: p. ej. un jugador nuevo que se apunta a una sesión ya creada)
function createAttendance(req, res) {
    const data = validateBody(req.body);
    if (store.attendances.findBySessionAndPlayer(data.sessionId, data.playerId))
        throw conflict('This player already has an attendance for this session');
    const id = store.attendances.create(data);
    res.status(201).location(`/api/attendances/${id}`).json(mapAttendance(store.attendances.findById(id)));
}

// PUT /api/attendances/:id
function replaceAttendance(req, res) {
    requireSquadAccess(req);
    const current = findOr404(req);
    const data = validateBody(req.body);

    if (req.user.role !== 'admin') {
        if (data.sessionId !== current.session_id || data.playerId !== current.player_id)
            throw forbidden('A player can only change status and reason');
        if (!['confirmed', 'absent'].includes(data.status)) throw forbidden('A player may only send confirmed or absent');
        if (`${current.session_date}T${current.start_time}` <= nowStr()) throw conflict('The session has already started');
    } else {
        const other = store.attendances.findBySessionAndPlayer(data.sessionId, data.playerId);
        if (other && other.attendance_id !== current.attendance_id)
            throw conflict('This player already has an attendance for this session');
    }

    store.attendances.replace(current.attendance_id, data);
    res.json(mapAttendance(store.attendances.findById(current.attendance_id)));
}

// DELETE /api/attendances/:id  (admin)
function deleteAttendance(req, res) {
    const current = findOr404(req);
    store.attendances.remove(current.attendance_id);
    res.status(204).end();
}

module.exports = { listAttendances, getAttendance, createAttendance, replaceAttendance, deleteAttendance };
