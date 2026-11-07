/* squad.js — página Squad (recurso PRINCIPAL: players).
   GET    /api/players?search=&position=&injured=&sort=   lista filtrada EN EL SERVIDOR
   GET    /api/players/stats                              líderes de la temporada
   POST   /api/players · PUT /api/players/:id · DELETE /api/players/:id   (admin) */
(function () {
    'use strict';

    const grid = document.getElementById('players-grid');
    const statusEl = document.getElementById('squad-status');
    const filters = document.getElementById('player-filters');
    const leadersGrid = document.getElementById('leaders-grid');
    const leadersStatus = document.getElementById('leaders-status');
    const dialog = document.getElementById('player-dialog');
    const form = document.getElementById('player-form');
    const isAdmin = () => auth.role === 'admin';
    let players = [];
    let editingId = null;          // null = creando, número = editando ese jugador

    // ---------- Pintar una tarjeta (createElement + textContent, nunca innerHTML) ----------
    function detail(term, value) {
        return el('div', { className: 'details__row' }, el('dt', {}, term), el('dd', {}, value ?? '–'));
    }

    function playerCard(p) {
        return el('article', { className: 'player-card card' },
            el('span', { className: 'player-card__number', attrs: { 'aria-hidden': 'true' } }, p.shirtNumber),
            el('span', { className: 'player-card__position badge' }, capitalize(p.position)),
            el('h3', {}, p.name, p.injured && ' ', p.injured && el('span', { className: 'badge badge--injured' }, 'Injured')),
            p.description && el('p', { className: 'card__text' }, p.description),
            el('dl', { className: 'details' },
                detail('Number', p.shirtNumber),
                detail('Age', p.age),
                detail('Goals', p.goals),
                detail('Assists', p.assists),
                detail('Appearances', p.appearances)),
            isAdmin() && el('div', { className: 'card__actions' },
                el('button', { type: 'button', className: 'btn--outline btn--small', dataset: { edit: p.id } }, 'Edit'),
                el('button', { type: 'button', className: 'btn--danger btn--small', dataset: { delete: p.id } }, 'Delete')));
    }

    // ---------- Lista: el query string se monta con los filtros; filtra el servidor ----------
    async function loadPlayers() {
        const f = filters.elements;
        const path = '/api/players' + query({
            search: f.search.value.trim(), position: f.position.value, injured: f.injured.value, sort: f.sort.value
        });
        players = (await loadList({
            container: grid, statusEl, loading: 'Loading players…', empty: 'No players match your search.',
            request: () => apiRequest('GET', path), render: playerCard
        })) || [];
    }

    // ---------- Stats: GET /api/players/stats ----------
    function statCard(title, leader, unit) {
        return el('article', { className: 'stat-card card' },
            el('h3', {}, title),
            el('p', { className: 'stat-card__value' }, leader ? leader.value : 0, el('span', {}, unit)),
            el('p', { className: 'stat-card__player' }, leader ? leader.name : '–'));
    }

    async function loadStats() {
        setStatus(leadersStatus, 'Loading stats…');
        try {
            const s = await apiRequest('GET', '/api/players/stats');
            leadersGrid.replaceChildren(
                statCard('Top scorer', s.leaders.goals, 'goals'),
                statCard('Most assists', s.leaders.assists, 'assists'),
                statCard('Most appearances', s.leaders.appearances, 'matches'),
                el('article', { className: 'stat-card card' },
                    el('h3', {}, 'Squad'),
                    el('p', { className: 'stat-card__value' }, s.total, el('span', {}, 'players')),
                    el('p', { className: 'stat-card__player' }, `${s.available} available · ${s.injured} injured · avg. age ${s.averageAge}`)));
            setStatus(leadersStatus, s.total ? '' : 'No players yet.');
        } catch (err) {
            leadersGrid.replaceChildren();
            setStatus(leadersStatus, err.message, 'error');
        }
    }

    // Esperamos 300 ms después de la última tecla para no pedir al servidor en cada letra.
    let searchTimer;
    filters.addEventListener('input', (e) => {
        if (e.target.name !== 'search') return;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadPlayers, 300);
    });
    filters.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') loadPlayers(); });
    filters.addEventListener('submit', (e) => { e.preventDefault(); loadPlayers(); });

    // ---------- Admin: crear / editar ----------
    function openDialog(player) {
        editingId = player ? player.id : null;
        form.reset();
        clearFormErrors(form);
        document.getElementById('player-dialog-title').textContent = player ? `Edit — ${player.name}` : 'New player';
        if (player) {
            for (const name of ['name', 'shirtNumber', 'position', 'dob', 'height', 'weight', 'goals', 'assists', 'appearances'])
                form.elements[name].value = player[name];
            form.elements.description.value = player.description || '';
            form.elements.injured.checked = player.injured;
        } else {
            for (const name of ['goals', 'assists', 'appearances']) form.elements[name].value = 0;
        }
        dialog.showModal();
    }

    function formBody() {
        const f = form.elements;
        return {
            name: f.name.value.trim(),
            shirtNumber: numberOrNull(f.shirtNumber),
            position: f.position.value,
            dob: f.dob.value,
            height: numberOrNull(f.height),
            weight: numberOrNull(f.weight),
            goals: numberOrNull(f.goals),
            assists: numberOrNull(f.assists),
            appearances: numberOrNull(f.appearances),
            injured: f.injured.checked,
            description: f.description.value.trim() || null
        };
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitForm(form, {
            extraCheck: () => (form.elements.dob.value && form.elements.dob.value >= toDateStr(new Date())
                ? [{ field: 'dob', message: 'Date of birth must be in the past' }] : []),
            request: () => (editingId
                ? apiRequest('PUT', `/api/players/${editingId}`, formBody())
                : apiRequest('POST', '/api/players', formBody())),
            onSuccess: async () => {
                dialog.close();
                await Promise.all([loadPlayers(), loadStats()]);      // la lista se actualiza sin recargar
            }
        });
    });

    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    document.getElementById('new-player').addEventListener('click', () => openDialog(null));

    grid.addEventListener('click', async (e) => {
        const edit = e.target.closest('[data-edit]');
        if (edit) return openDialog(players.find((p) => p.id === Number(edit.dataset.edit)));

        const del = e.target.closest('[data-delete]');
        if (!del) return;
        const player = players.find((p) => p.id === Number(del.dataset.delete));
        if (!confirm(`Delete ${player.name}? Their attendances and call-ups will be deleted too.`)) return;
        try {
            await apiRequest('DELETE', `/api/players/${player.id}`);
            await Promise.all([loadPlayers(), loadStats()]);
        } catch (err) {
            setStatus(statusEl, err.message, 'error');
        }
    });

    loadPlayers();
    loadStats();
})();
