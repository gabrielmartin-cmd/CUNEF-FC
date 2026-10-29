/* Season: próximos partidos + convocatoria, resultados, clasificación y gestión de convocatorias (admin) */
(function () {
    'use strict';
    const { api, auth, OWN_TEAM_ID, esc, formatDate, formatTime, capitalize, setStatus, errorMessage } = CUNEF;

    const fixturesGrid = document.getElementById('fixtures-grid');
    const fixturesStatus = document.getElementById('fixtures-status');
    const resultsGrid = document.getElementById('results-grid');
    const resultsStatus = document.getElementById('results-status');
    const standingsBody = document.getElementById('standings-body');
    const standingsCaption = document.getElementById('standings-caption');
    const standingsStatus = document.getElementById('standings-status');
    const isAdmin = () => auth.role === 'admin';
    let upcoming = [];

    // ---------- Próximos partidos ----------
    const fixtureCard = (m) => `
        <article class="fixture-card card" data-match="${m.id}">
            <span class="badge">League Match</span>
            <h3 class="fixture-card__teams">${esc(m.homeTeam.name)} <span class="fixture-card__vs">vs</span> ${esc(m.awayTeam.name)}</h3>
            <dl class="details">
                <div class="details__row"><dt>Date</dt><dd><time datetime="${esc(m.date.slice(0, 10))}">${esc(formatDate(m.date))}</time></dd></div>
                <div class="details__row"><dt>Time</dt><dd><time datetime="${esc(formatTime(m.date))}">${esc(formatTime(m.date))}</time></dd></div>
                <div class="details__row"><dt>Location</dt><dd>${esc(m.location)}</dd></div>
            </dl>
            <div data-callup-slot="${m.id}"></div>
            ${isAdmin() ? `<div class="card__actions"><button type="button" class="btn--outline btn--small" data-callup-open="${m.id}">Manage call-up</button></div>` : ''}
        </article>`;

    function callupHtml(list, published) {
        const li = (p) => `<li class="${p.playerStatus === 'injured' ? 'is-injured' : ''}">${p.shirtNumber ? `#${esc(p.shirtNumber)} ` : ''}${esc(p.name)}</li>`;
        const starters = list.filter((p) => p.role === 'starter');
        const subs = list.filter((p) => p.role === 'substitute');
        const draft = published ? '' : ' (draft · not public)';
        return `<details class="callup" ${published ? 'open' : ''}>
            <summary>Call-up${draft}: ${starters.length} starters, ${subs.length} substitutes</summary>
            <h4>Starters</h4><ul>${starters.map(li).join('')}</ul>
            <h4>Substitutes</h4><ul>${subs.map(li).join('') || '<li>None</li>'}</ul>
        </details>`;
    }

    async function fillCallup(m) {
        const slot = fixturesGrid.querySelector(`[data-callup-slot="${m.id}"]`);
        if (!slot) return;
        // Solo se pide si hay algo que ver: publicada, o somos admin (el admin ve también el borrador)
        if (!m.callupPublished && !isAdmin()) {
            slot.innerHTML = '<p class="card__meta callup">Call-up not published yet.</p>';
            return;
        }
        try {
            const list = await api.get(`/api/matches/${m.id}/callup`);
            slot.innerHTML = list.length || m.callupPublished
                ? callupHtml(list, m.callupPublished)
                : '<p class="card__meta callup">No call-up saved yet.</p>';
        } catch (err) {
            slot.innerHTML = `<p class="card__meta callup">${esc(err.status === 404 ? 'Call-up not published yet.' : errorMessage(err))}</p>`;
        }
    }

    async function loadFixtures() {
        setStatus(fixturesStatus, 'Loading fixtures…');
        try {
            const res = await api.get('/api/matches', { status: 'upcoming', teamId: OWN_TEAM_ID, limit: 6 });
            upcoming = res.data;
            fixturesGrid.innerHTML = upcoming.map(fixtureCard).join('');
            setStatus(fixturesStatus, upcoming.length ? '' : 'No upcoming matches.');
            upcoming.forEach(fillCallup);
        } catch (err) {
            fixturesGrid.innerHTML = '';
            setStatus(fixturesStatus, errorMessage(err), 'error');
        }
    }

    // ---------- Resultados ----------
    function resultCard(m) {
        const { homeGoals, awayGoals } = m.result;
        const diff = m.homeTeam.id === OWN_TEAM_ID ? homeGoals - awayGoals : awayGoals - homeGoals;
        const badge = diff > 0 ? '<span class="badge badge--win">Victory</span>'
            : diff < 0 ? '<span class="badge badge--loss">Defeat</span>'
                : '<span class="badge badge--draw">Draw</span>';
        return `
        <article class="result-card card">
            <h3 class="result-card__score">
                <span class="result-card__team">${esc(m.homeTeam.name)}</span>
                <span class="result-card__value">${homeGoals} - ${awayGoals}</span>
                <span class="result-card__team">${esc(m.awayTeam.name)}</span>
            </h3>
            <div class="result-card__footer">
                <p class="card__meta"><time datetime="${esc(m.date.slice(0, 10))}">${esc(formatDate(m.date))}</time></p>
                ${badge}
            </div>
        </article>`;
    }

    async function loadResults() {
        setStatus(resultsStatus, 'Loading results…');
        try {
            const res = await api.get('/api/matches', { status: 'played', teamId: OWN_TEAM_ID, limit: 6 });   // más recientes primero
            resultsGrid.innerHTML = res.data.map(resultCard).join('');
            setStatus(resultsStatus, res.data.length ? '' : 'No results yet.');
        } catch (err) {
            resultsGrid.innerHTML = '';
            setStatus(resultsStatus, errorMessage(err), 'error');
        }
    }

    // ---------- Clasificación ----------
    async function loadStandings() {
        setStatus(standingsStatus, 'Loading standings…');
        try {
            const rows = await api.get('/api/standings');
            const matchday = Math.max(0, ...rows.map((r) => r.played));
            standingsCaption.textContent = `University League — Matchday ${matchday}`;
            const gd = (n) => (n > 0 ? `+${n}` : String(n));
            standingsBody.innerHTML = rows.map((r) => `
                <tr class="${r.teamId === OWN_TEAM_ID ? 'is-cunef' : ''}">
                    <th scope="row">${r.position}</th>
                    <td>${esc(r.team)}</td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${gd(r.goalDifference)}</td><td>${r.points}</td>
                </tr>`).join('');
            setStatus(standingsStatus, '');
        } catch (err) {
            standingsBody.innerHTML = '';
            setStatus(standingsStatus, errorMessage(err), 'error');
        }
    }

    // ---------- Admin: gestionar convocatoria ----------
    const dialog = document.getElementById('callup-dialog');
    const rowsEl = document.getElementById('callup-rows');
    const counter = document.getElementById('callup-counter');
    const msg = document.getElementById('callup-msg');
    const saveBtn = document.getElementById('callup-save');
    const publishBtn = document.getElementById('callup-publish');
    let cu = null;   // { match, players, sel: Map(playerId -> role), savedKey, savedStarters, published }

    const keyOf = (sel) => JSON.stringify([...sel.entries()].sort((a, b) => a[0] - b[0]));
    const countRole = (sel, role) => [...sel.values()].filter((r) => r === role).length;

    function flash(text, kind) {
        msg.className = kind === 'error' ? 'form__error' : 'form__success';
        setStatus(msg, text, kind);
    }

    function refreshCallupControls() {
        const starters = countRole(cu.sel, 'starter');
        const subs = countRole(cu.sel, 'substitute');
        const total = starters + subs;
        const ready = starters === 11 && total <= 20;
        const dirty = keyOf(cu.sel) !== cu.savedKey;
        counter.textContent = `Starters ${starters}/11 · Substitutes ${subs} · Total ${total}/20`;
        counter.classList.toggle('is-ready', ready);
        saveBtn.disabled = !ready || !dirty;
        publishBtn.textContent = cu.published ? 'Unpublish call-up' : 'Publish call-up';
        publishBtn.disabled = cu.published ? false : dirty || cu.savedStarters !== 11;
        publishBtn.title = !cu.published && dirty ? 'Save the call-up before publishing' : '';
    }

    async function openCallup(matchId) {
        const match = upcoming.find((m) => m.id === matchId);
        if (!match) return;
        setStatus(msg, '');
        rowsEl.innerHTML = '<tr><td colspan="3">Loading…</td></tr>';
        document.getElementById('callup-match').textContent =
            `${match.homeTeam.name} vs ${match.awayTeam.name} · ${formatDate(match.date)} ${formatTime(match.date)}`;
        dialog.showModal();
        try {
            const [players, current] = await Promise.all([
                api.get('/api/players', { limit: 100, sort: 'name' }),
                api.get(`/api/matches/${matchId}/callup`)
            ]);
            const sel = new Map(current.map((p) => [p.playerId, p.role]));
            cu = { match, players: players.data, sel, savedKey: keyOf(sel), savedStarters: countRole(sel, 'starter'), published: match.callupPublished };
            rowsEl.innerHTML = cu.players.map((p) => `
                <tr class="${p.status === 'injured' ? 'is-injured' : ''}">
                    <td>${p.shirtNumber ? `#${esc(p.shirtNumber)} ` : ''}${esc(p.name)} ${p.status === 'injured' ? '<span class="badge badge--injured">Injured</span>' : ''}</td>
                    <td>${esc(capitalize(p.position))}</td>
                    <td>
                        <select data-player="${p.id}" aria-label="Call-up role of ${esc(p.name)}">
                            <option value="">Not called up</option>
                            <option value="starter" ${p.status === 'injured' ? 'disabled' : ''}>Starter</option>
                            <option value="substitute">Substitute</option>
                        </select>
                    </td>
                </tr>`).join('');
            rowsEl.querySelectorAll('select').forEach((s) => { s.value = sel.get(Number(s.dataset.player)) || ''; });
            refreshCallupControls();
        } catch (err) {
            rowsEl.innerHTML = '';
            flash(errorMessage(err), 'error');
        }
    }

    rowsEl.addEventListener('change', (e) => {
        const select = e.target.closest('select[data-player]');
        if (!select || !cu) return;
        const id = Number(select.dataset.player);
        select.value ? cu.sel.set(id, select.value) : cu.sel.delete(id);
        setStatus(msg, '');
        refreshCallupControls();
    });

    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        try {
            const players = [...cu.sel.entries()].map(([playerId, role]) => ({ playerId, role }));
            await api.put(`/api/matches/${cu.match.id}/callup`, { players });
            cu.savedKey = keyOf(cu.sel);
            cu.savedStarters = countRole(cu.sel, 'starter');
            flash('Call-up saved.', 'ok');
        } catch (err) {
            flash(errorMessage(err), 'error');
        }
        refreshCallupControls();
    });

    publishBtn.addEventListener('click', async () => {
        publishBtn.disabled = true;
        try {
            const updated = await api.patch(`/api/matches/${cu.match.id}`, { callupPublished: !cu.published });
            cu.published = updated.callupPublished;
            cu.match.callupPublished = updated.callupPublished;
            flash(cu.published ? 'Call-up published: fans can see it now.' : 'Call-up unpublished.', 'ok');
        } catch (err) {
            flash(errorMessage(err), 'error');
        }
        refreshCallupControls();
    });

    document.getElementById('callup-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { cu = null; loadFixtures(); });
    fixturesGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-callup-open]');
        if (btn) openCallup(Number(btn.dataset.callupOpen));
    });

    loadFixtures();
    loadResults();
    loadStandings();
})();
