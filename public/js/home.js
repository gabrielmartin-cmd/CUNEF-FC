/* home.js — página de inicio.
   GET /api/teams/1                                  datos del club
   GET /api/matches?status=upcoming&teamId=1&limit=1 próximo partido
   GET /api/players/stats                            resumen de la plantilla */
(function () {
    'use strict';

    const stadium = document.getElementById('club-stadium');
    const founded = document.getElementById('club-founded');
    const nextMatch = document.getElementById('next-match');
    const glanceGrid = document.getElementById('glance-grid');
    const glanceStatus = document.getElementById('glance-status');

    async function loadClub() {
        try {
            const team = await apiRequest('GET', `/api/teams/${OWN_TEAM_ID}`);
            stadium.textContent = team.stadium;
            founded.textContent = team.creationDate.slice(0, 4);
            founded.setAttribute('datetime', team.creationDate);
        } catch {
            // si falla, se queda el texto que ya trae el HTML
        }
    }

    async function loadNextMatch() {
        try {
            const [m] = await apiRequest('GET', '/api/matches' + query({ status: 'upcoming', teamId: OWN_TEAM_ID, limit: 1 }));
            nextMatch.replaceChildren(...(m
                ? [`${m.homeTeam.name} vs ${m.awayTeam.name}`, el('br'),
                    el('a', { href: 'Season.html' }, `${formatDate(m.date, { month: 'short', day: 'numeric' })} · ${formatTime(m.date)}`)]
                : ['No upcoming matches']));
        } catch {
            nextMatch.textContent = 'Unavailable right now';
        }
    }

    const statCard = (title, value, unit, note) => el('article', { className: 'stat-card card' },
        el('h3', {}, title),
        el('p', { className: 'stat-card__value' }, value, el('span', {}, unit)),
        note && el('p', { className: 'stat-card__player' }, note));

    async function loadStats() {
        setStatus(glanceStatus, 'Loading stats…');
        try {
            const s = await apiRequest('GET', '/api/players/stats');
            if (!s.total) {
                glanceGrid.replaceChildren();
                return setStatus(glanceStatus, 'No players in the squad yet.');
            }
            glanceGrid.replaceChildren(
                statCard('Players', s.total, 'in the squad', `${s.available} available · ${s.injured} injured`),
                statCard('Goals', s.totalGoals, 'scored', `${s.averageGoals} per player`),
                statCard('Top scorer', s.leaders.goals.value, 'goals', s.leaders.goals.name),
                statCard('Average age', s.averageAge, 'years', Object.entries(s.byPosition).map(([pos, n]) => `${n} ${pos}s`).join(' · ')));
            setStatus(glanceStatus, '');
        } catch (err) {
            glanceGrid.replaceChildren();
            setStatus(glanceStatus, err.message, 'error');
        }
    }

    loadClub();
    loadNextMatch();
    loadStats();
})();
