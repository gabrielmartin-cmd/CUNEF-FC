// trainingSessionsController.js — lógica de /api/training-sessions.
// Visitantes y fans solo ven las sesiones públicas; players y admin las ven todas.
const store = require('../data/store');
const { validateTrainingSession, TYPES } = require('../validators/trainingSessionValidator');
const {
    toId, notFound, badRequest, validationError, todayStr,
    parseEnumQuery, parseDateQuery, parseLimitQuery, parseSort
} = require('../utils');

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

const canSeePrivate = (req) => ['player', 'admin'].includes(req.user?.role);

function findOr404(req) {
    const id = toId(req.params.id);
    const row = id && store.trainingSessions.findById(id);
    // Una sesión privada "no existe" para quien no puede verla.
    if (!row || (row.is_public !== 1 && !canSeePrivate(req))) throw notFound('Session not found');
    return row;
}

function validateBody(body) {
    const { valid, errors, data } = validateTrainingSession(body);
    if (!valid) throw validationError(errors);
    return data;
}

// GET /api/training-sessions?from=&to=&type=&sort=&limit=
function listSessions(req, res) {
    const from = parseDateQuery(req.query.from, 'from');
    const to = parseDateQuery(req.query.to, 'to');
    if (from && to && to < from) throw badRequest('to', 'to cannot be before from');
    const filters = {
        from, to,
        type: parseEnumQuery(req.query.type, TYPES, 'type'),
        onlyPublic: !canSeePrivate(req),
        sort: parseSort(req.query.sort, SORTS, 'date'),
        limit: parseLimitQuery(req.query.limit)
    };
    res.json(store.trainingSessions.list(filters).map(mapSession));
}

// GET /api/training-sessions/:id
function getSession(req, res) {
    res.json(mapSession(findOr404(req)));
}

// POST /api/training-sessions   (también crea la asistencia "pending" de toda la plantilla)
function createSession(req, res) {
    const { valid, errors, data } = validateTrainingSession(req.body);
    if (data.date && data.date < todayStr()) errors.push({ field: 'date', message: 'date cannot be in the past' });
    if (!valid || errors.length) throw validationError(errors);

    const id = store.trainingSessions.create(data, req.user.userId);
    res.status(201).location(`/api/training-sessions/${id}`).json(mapSession(store.trainingSessions.findById(id)));
}

// PUT /api/training-sessions/:id   (el admin puede corregir también sesiones pasadas)
function replaceSession(req, res) {
    const current = findOr404(req);
    store.trainingSessions.replace(current.session_id, validateBody(req.body));
    res.json(mapSession(store.trainingSessions.findById(current.session_id)));
}

// DELETE /api/training-sessions/:id   (borra también sus asistencias)
function deleteSession(req, res) {
    const current = findOr404(req);
    store.trainingSessions.remove(current.session_id);
    res.status(204).end();
}

module.exports = { listSessions, getSession, createSession, replaceSession, deleteSession };
