/* Squad: jugadores, líderes de la temporada y edición de estadísticas (admin) */
(function () {
    'use strict';
    const { api, auth, esc, capitalize, setStatus, errorMessage } = CUNEF;

    const grid = document.getElementById('players-grid');
    const statusEl = document.getElementById('squad-status');
    const leaders = document.getElementById('leaders-grid');
    const positionFilter = document.getElementById('position-filter');
    const sortSelect = document.getElementById('sort-select');
    const dialog = document.getElementById('stats-dialog');
    const form = document.getElementById('stats-form');
    const dialogError = document.getElementById('stats-error');
    let players = [];
    let editingId = null;

    function playerCard(p) {
        const isAdmin = auth.role === 'admin';
        return `
        <article class="player-card card">
            <span class="player-card__number" aria-hidden="true">${esc(p.shirtNumber ?? '')}</span>
            <span class="player-card__position badge">${esc(capitalize(p.position))}</span>
            <h3>${esc(p.name)} ${p.status === 'injured' ? '<span class="badge badge--injured">Injured</span>' : ''}</h3>
            ${p.description ? `<p class="card__text">${esc(p.description)}</p>` : ''}
            <dl class="details">
                <div class="details__row"><dt>Number</dt><dd>${esc(p.shirtNumber ?? '–')}</dd></div>
                <div class="details__row"><dt>Age</dt><dd>${esc(p.age ?? '–')}</dd></div>
                <div class="details__row"><dt>Goals</dt><dd>${p.stats.goals}</dd></div>
                <div class="details__row"><dt>Assists</dt><dd>${p.stats.assists}</dd></div>
                <div class="details__row"><dt>Appearances</dt><dd>${p.stats.appearances}</dd></div>
            </dl>
            ${isAdmin ? `<div class="card__actions"><button type="button" class="btn--outline btn--small" data-edit="${p.id}">Edit stats</button></div>` : ''}
        </article>`;
    }

    async function loadPlayers() {
        setStatus(statusEl, 'Loading players…');
        try {
            const res = await api.get('/api/players', { position: positionFilter.value, sort: sortSelect.value, limit: 100 });
            players = res.data;
            grid.innerHTML = players.map(playerCard).join('');
            setStatus(statusEl, players.length ? '' : 'No players found.');
        } catch (err) {
            grid.innerHTML = '';
            setStatus(statusEl, errorMessage(err), 'error');
        }
    }

    // Tres peticiones: el primero de la lista ordenada por goles / asistencias / partidos
    async function loadLeaders() {
        const defs = [
            ['Top scorer', '-goals', 'goals', 'goals'],
            ['Most assists', '-assists', 'assists', 'assists'],
            ['Most appearances', '-appearances', 'appearances', 'matches']
        ];
        try {
            const results = await Promise.all(defs.map(([, sort]) => api.get('/api/players', { sort, limit: 1 })));
            leaders.innerHTML = defs.map(([title, , key, unit], i) => {
                const p = results[i].data[0];
                return p ? `
                <article class="stat-card card">
                    <h3>${title}</h3>
                    <p class="stat-card__value">${p.stats[key]}<span>${unit}</span></p>
                    <p class="stat-card__player">${esc(p.name)}</p>
                </article>` : '';
            }).join('');
        } catch {
            leaders.innerHTML = '<p class="status status--error">Season leaders are not available right now.</p>';
        }
    }

    // ----- Admin: editar estadísticas (PATCH /api/players/:id)
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-edit]');
        if (!btn) return;
        const p = players.find((x) => x.id === Number(btn.dataset.edit));
        if (!p) return;
        editingId = p.id;
        document.getElementById('stats-title').textContent = `Edit stats — ${p.name}`;
        form.elements.goals.value = p.stats.goals;
        form.elements.assists.value = p.stats.assists;
        form.elements.appearances.value = p.stats.appearances;
        setStatus(dialogError, '');
        dialog.showModal();
    });

    document.getElementById('stats-cancel').addEventListener('click', () => dialog.close());

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus(dialogError, '');
        const stats = { goals: form.elements.goals.valueAsNumber, assists: form.elements.assists.valueAsNumber, appearances: form.elements.appearances.valueAsNumber };
        try {
            await api.patch(`/api/players/${editingId}`, { stats });
            dialog.close();
            await Promise.all([loadPlayers(), loadLeaders()]);
        } catch (err) {
            setStatus(dialogError, errorMessage(err), 'error');
        }
    });

    positionFilter.addEventListener('change', loadPlayers);
    sortSelect.addEventListener('change', loadPlayers);
    loadPlayers();
    loadLeaders();
})();
