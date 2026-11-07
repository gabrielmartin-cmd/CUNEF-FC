// teamValidator.js — valida el body de POST y PUT /api/teams.
const { createValidator } = require('./rules');
const { todayStr } = require('../utils');

function validateTeam(body) {
    const v = createValidator(body);

    v.text('name', { max: 60 });
    v.text('stadium', { max: 100 });
    v.date('creationDate');
    if (v.data.creationDate && v.data.creationDate > todayStr()) v.fail('creationDate', 'creationDate cannot be in the future');

    return v.result();
}

module.exports = { validateTeam };
