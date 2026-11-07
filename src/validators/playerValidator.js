// playerValidator.js — valida el body de POST y PUT /api/players (recurso PRINCIPAL).
const { createValidator } = require('./rules');
const { todayStr } = require('../utils');

// Conjunto cerrado de posiciones. El <select> de squad.html usa exactamente estos valores.
const POSITIONS = ['goalkeeper', 'defender', 'fullback', 'midfielder', 'forward'];

function validatePlayer(body) {
    const v = createValidator(body);

    v.text('name', { max: 50 });
    v.int('shirtNumber', { min: 1, max: 99 });
    v.oneOf('position', POSITIONS);
    v.date('dob');
    if (v.data.dob && v.data.dob >= todayStr()) v.fail('dob', 'dob must be a date in the past');
    v.int('height', { min: 140, max: 220 });                 // cm
    v.int('weight', { min: 40, max: 150 });                  // kg
    v.int('goals', { min: 0, max: 500 });
    v.int('assists', { min: 0, max: 500 });
    v.int('appearances', { min: 0, max: 500 });
    v.bool('injured');
    v.text('description', { max: 300, required: false });
    v.id('teamId', { required: false });                     // si no viene, el controlador pone CUNEF FC

    return v.result();
}

module.exports = { validatePlayer, POSITIONS };
