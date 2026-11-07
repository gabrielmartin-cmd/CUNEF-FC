// attendanceValidator.js — valida el body de POST y PUT /api/attendances.
// Una asistencia = un jugador en una sesión de entrenamiento, con su estado.
const { createValidator } = require('./rules');

const STATUSES = ['pending', 'confirmed', 'absent', 'injured'];

function validateAttendance(body) {
    const v = createValidator(body);

    v.id('sessionId');
    v.id('playerId');
    v.oneOf('status', STATUSES);
    v.text('reason', { max: 300, required: false });
    if (v.data.status === 'absent' && !v.data.reason) v.fail('reason', 'reason is required when status is absent');

    return v.result();
}

module.exports = { validateAttendance, STATUSES };
