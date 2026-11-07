// matchValidator.js — valida el body de POST y PUT /api/matches.
// Un partido sin jugar lleva homeGoals y awayGoals a null; uno jugado, los dos números.
const { createValidator } = require('./rules');

function validateMatch(body) {
    const v = createValidator(body);

    v.dateTime('date');
    v.text('location', { max: 100 });
    v.id('homeTeamId');
    v.id('awayTeamId');
    v.int('homeGoals', { min: 0, max: 50, nullable: true });
    v.int('awayGoals', { min: 0, max: 50, nullable: true });
    v.bool('callupPublished', { required: false });

    const { homeTeamId, awayTeamId, homeGoals, awayGoals } = v.data;
    if (homeTeamId && homeTeamId === awayTeamId) v.fail('awayTeamId', 'A team cannot play against itself');
    // Si uno de los dos goles es null y el otro un número, el resultado está a medias.
    if (homeGoals !== undefined && awayGoals !== undefined && (homeGoals === null) !== (awayGoals === null))
        v.fail('awayGoals', 'Send both goals (played match) or both null (upcoming match)');

    return v.result();
}

module.exports = { validateMatch };
