// attendancesController.js — lógica de los handlers de Asistencia de los jugadores a los entrenamientos.
// Las rutas (routes/attendances.js) solo conectan URL + middleware con estas funciones.

const Attendances = require('../models/attendances');
const {
    toId, notFound, badRequest, conflict, requireBody, HttpError, pad,
    parsePaging, parseEnumQuery, parseDateQuery, paged
} = require('../utils');

const STATUSES = ['pending', 'confirmed', 'absent', 'injured'];

const mapAttendance = (r) => ({
    id: r.attendance_id,
    sessionId: r.session_id,
    playerId: r.player_id,
    playerName: r.player_name,
    status: r.status,
    reason: r.reason,
    session: { date: r.session_date, startTime: r.start_time, type: r.type, location: r.location }
});

// Solo player (con jugador asociado) y admin tienen asistencias. Un fan recibe 403.
// Este archivo enseña el SEGUNDO nivel de permisos. requireRole() de la ruta solo mira el rol;
// aquí además se mira de QUIÉN es el dato: un player solo ve y cambia SUS asistencias.
// Eso no se puede decidir en la ruta, porque hay que leer el dato para saber quién es su dueño.
function requireSquadAccess(req) {
    const { role, playerId } = req.user;
    if (role === 'admin') return;
    if (role === 'player' && playerId) return;
    throw new HttpError(403, 'Only players and admins have attendances');
}

// GET /api/attendances?sessionId=&playerId=&status=&from=&to=&page=&limit=
// Mismo endpoint para player y admin: el servidor filtra por el playerId del token.
function listAttendances(req, res) {
    requireSquadAccess(req);

    const filters = {};
    if (req.user.role === 'player') {
        // siempre las suyas: el playerId sale del TOKEN, no de ?playerId= (que un player podría falsear)
        filters.playerId = req.user.playerId;
    } else if (req.query.playerId !== undefined) {
        const pid = toId(req.query.playerId);
        if (!pid) throw badRequest('playerId must be a positive integer');
        filters.playerId = pid;
    }
    if (req.query.sessionId !== undefined) {
        const sid = toId(req.query.sessionId);
        if (!sid) throw badRequest('sessionId must be a positive integer');
        filters.sessionId = sid;
    }
    filters.status = parseEnumQuery(req.query.status, STATUSES, 'status');
    filters.from = parseDateQuery(req.query.from, 'from');
    filters.to = parseDateQuery(req.query.to, 'to');
    if (filters.from && filters.to && filters.to < filters.from) throw badRequest('to cannot be before from');
    const paging = parsePaging(req.query, { defLimit: 50, maxLimit: 100 });

    const { rows, total } = Attendances.list({ ...filters, limit: paging.limit, offset: paging.offset });
    res.json(paged(rows.map(mapAttendance), paging, total));
}

// PATCH /api/attendances/:id   body: { status, reason }   (dueño o Admin)
function updateAttendance(req, res) {
    requireSquadAccess(req);
    const id = toId(req.params.id);
    const att = id && Attendances.findById(id);
    if (!att) throw notFound('Attendance not found');

    // Comprobación de "dueño": compara el jugador de la fila con el jugador del token.
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && att.player_id !== req.user.playerId) throw new HttpError(403, 'This attendance is not yours');

    const { status, reason } = requireBody(req);
    if (!STATUSES.includes(status)) throw badRequest(`status is required and must be one of: ${STATUSES.join(', ')}`);
    if (!isAdmin) {
        if (status === 'injured') throw new HttpError(403, 'Only an admin can mark a player as injured');
        if (status === 'pending') throw badRequest('A player may send only confirmed or absent');
    }
    if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 300))
        throw badRequest('reason must be a text of at most 300 characters');
    if (status === 'absent' && (typeof reason !== 'string' || reason.trim() === ''))
        throw badRequest('reason is required when status is absent');

    // Un jugador no puede cambiar su asistencia cuando la sesión ya ha empezado (el admin sí, para corregir)
    if (!isAdmin) {
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        if (`${att.session_date}T${att.start_time}` <= nowStr) throw conflict('The session has already started');
    }

    const cleanReason = status === 'absent' || status === 'injured' ? (reason?.trim() || null) : null;
    Attendances.update(id, status, cleanReason);
    res.json(mapAttendance(Attendances.findById(id)));
}

module.exports = { listAttendances, updateAttendance };
