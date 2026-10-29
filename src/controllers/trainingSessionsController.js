// trainingSessionsController.js — lógica de los handlers de Sesiones de entrenamiento.
// Las rutas (routes/trainingSessions.js) solo conectan URL + middleware con estas funciones.

const TrainingSessions = require('../models/trainingSessions');
const {
    toId, notFound, badRequest, requireBody, todayStr, isValidDate, isValidTime,
    parsePaging, parseSort, parseEnumQuery, parseDateQuery, paged
} = require('../utils');

const TYPES = ['tactical', 'physical', 'recovery'];
const SORTS = { date: 'session_date' };

const mapSession = (r) => ({
    id: r.session_id,
    date: r.session_date,
    startTime: r.start_time,
    location: r.location,
    type: r.type,
    notes: r.notes,
    isPublic: r.is_public === 1,
    createdBy: r.created_by
});

// Valida los campos enviados con las reglas de la Tabla 4. Devuelve { columna: valor }.
// En PATCH solo se validan los campos que vienen en el body.
function validateFields(body, { requireAll }) {
    const out = {};
    const has = (k) => body[k] !== undefined;

    if (requireAll || has('date')) {
        if (!isValidDate(body.date)) throw badRequest('date is required and must be a valid date (YYYY-MM-DD)');
        if (body.date < todayStr()) throw badRequest('date cannot be in the past');
        out.session_date = body.date;
    }
    if (requireAll || has('startTime')) {
        if (!isValidTime(body.startTime)) throw badRequest('startTime is required (format HH:MM)');
        out.start_time = body.startTime;
    }
    if (requireAll || has('location')) {
        if (typeof body.location !== 'string' || body.location.trim().length < 1 || body.location.trim().length > 100)
            throw badRequest('location is required (1 to 100 characters)');
        out.location = body.location.trim();
    }
    if (requireAll || has('type')) {
        if (!TYPES.includes(body.type)) throw badRequest(`type is required and must be one of: ${TYPES.join(', ')}`);
        out.type = body.type;
    }
    if (has('notes')) {
        if (body.notes !== null && (typeof body.notes !== 'string' || body.notes.length > 500))
            throw badRequest('notes must be a text of at most 500 characters');
        out.notes = body.notes;
    }
    if (has('isPublic')) {
        if (typeof body.isPublic !== 'boolean') throw badRequest('isPublic must be a boolean');
        out.is_public = body.isPublic ? 1 : 0;
    }
    return out;
}

// GET /api/training-sessions?from=&to=&type=&sort=&page=&limit=
// Visitantes y fans: solo sesiones públicas. Player y Admin: todas.
function listSessions(req, res) {
    const from = parseDateQuery(req.query.from, 'from') ?? todayStr();       // por defecto: desde hoy
    const to = parseDateQuery(req.query.to, 'to');
    if (to && to < from) throw badRequest('to cannot be before from');
    const type = parseEnumQuery(req.query.type, TYPES, 'type');
    const sort = parseSort(req.query.sort, SORTS, 'date');
    const paging = parsePaging(req.query, { defLimit: 20, maxLimit: 100 });
    // Visitantes (req.user = null) y fans solo ven las públicas
    const onlyPublic = !['player', 'admin'].includes(req.user?.role);

    const { rows, total } = TrainingSessions.list({ from, to, type, onlyPublic, sort, limit: paging.limit, offset: paging.offset });
    res.json(paged(rows.map(mapSession), paging, total));
}

// POST /api/training-sessions   (Admin)
// Al crear la sesión se crea una asistencia "pending" para TODA la plantilla (misma transacción).
function createSession(req, res) {
    const fields = validateFields(requireBody(req), { requireAll: true });

    const id = TrainingSessions.create(fields, req.user.userId);   // también crea las asistencias "pending"
    res.status(201).json(mapSession(TrainingSessions.findById(id)));
}

// PATCH /api/training-sessions/:id   (Admin)
function updateSession(req, res) {
    const id = toId(req.params.id);
    if (!id || !TrainingSessions.findById(id)) throw notFound('Session not found');

    const fields = validateFields(requireBody(req), { requireAll: false });
    if (Object.keys(fields).length === 0) throw badRequest('At least one field to change is required');

    TrainingSessions.update(id, fields);       // los nombres de columna salen de validateFields, no del cliente
    res.json(mapSession(TrainingSessions.findById(id)));
}

// DELETE /api/training-sessions/:id   (Admin) -> 204. Sus asistencias se borran en cascada.
function deleteSession(req, res) {
    const id = toId(req.params.id);
    if (!id || !TrainingSessions.remove(id)) throw notFound('Session not found');
    res.status(204).end();
}

module.exports = { listSessions, createSession, updateSession, deleteSession };
