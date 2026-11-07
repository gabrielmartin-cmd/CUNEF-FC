/* Home: datos del club (GET /api/teams/:id) y próximo partido (GET /api/matches?status=upcoming) */
(function () {
    'use strict';
    const { api, OWN_TEAM_ID, esc, formatDate, formatTime } = CUNEF;

    const stadium = document.getElementById('club-stadium');
    const founded = document.getElementById('club-founded');
    const nextMatch = document.getElementById('next-match');

    async function load() {
        const [team, matches] = await Promise.allSettled([
            api.get(`/api/teams/${OWN_TEAM_ID}`),
            api.get('/api/matches', { status: 'upcoming', teamId: OWN_TEAM_ID, limit: 1 })
        ]);

        // Si la API falla, se queda el contenido estático del HTML
        if (team.status === 'fulfilled') {
            const t = team.value;
            if (t.stadium) stadium.textContent = t.stadium;
            if (t.creationDate) {
                const year = t.creationDate.slice(0, 4);
                founded.textContent = year;
                founded.setAttribute('datetime', t.creationDate);
            }
        }

        if (matches.status === 'fulfilled') {
            const m = matches.value.data[0];
            nextMatch.innerHTML = m
                ? `${esc(m.homeTeam.name)} vs ${esc(m.awayTeam.name)}<br>
                   <a href="Season.html">${esc(formatDate(m.date, { month: 'short', day: 'numeric' }))} · ${esc(formatTime(m.date))}</a>`
                : 'No upcoming matches';
        } else {
            nextMatch.textContent = 'Unavailable right now';
        }
    }

    load();
})();
