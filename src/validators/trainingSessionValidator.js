// trainingSessionValidator.js — valida el body de POST y PUT /api/training-sessions.
const { createValidator } = require('./rules');

const TYPES = ['tactical', 'physical', 'recovery'];   // mismos valores que el <select> de training.html

function validateTrainingSession(body) {
    const v = createValidator(body);

    v.date('date');
    v.time('startTime');
    v.text('location', { max: 100 });
    v.oneOf('type', TYPES);
    v.text('notes', { max: 500, required: false });
    v.bool('isPublic');

    return v.result();
}

module.exports = { validateTrainingSession, TYPES };
