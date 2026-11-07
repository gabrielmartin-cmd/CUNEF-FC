/* season.js — página Season.
   matches:   GET /api/matches?status=upcoming|played&teamId=1 · POST · PUT /:id · DELETE /:id
   callup:    GET / PUT /api/matches/:id/callup (publicar = PUT del partido con callupPublished)
   teams:     GET /api/teams · POST · PUT /:id · DELETE /:id
   standings: GET /api/standings (calculada por el servidor) */
(function () {
    'use strict';

    const isAdmin = () => auth.role === 'admin';
    const fixturesGrid = document.getElementById('fixtures-grid');
    const fixturesStatus = document.getElementById('fixtures-status');
    const resultsGrid = document.getElementById('results-grid');
    const resultsStatus = document.getElementById('results-status');
    const standingsBody = document.getElementById('standings-body');
    const standingsStatus = document.getElementById('standings-status');
    const teamsBody = document.getElementById('teams-body');
    const teamsStatus = document.getElementById('teams-status');
    let matches = [];          // próximos + resultados que se están mostrando
    let teams = [];

    // Partido de la API -> body para PUT (todos los campos: PUT sustituye el partido entero)
    const matchBody = (m) => ({
        date: m.date, location: m.location, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId,
        homeGoals: m.homeGoals, awayGoals: m.awayGoals, callupPublished: m.callupPublished
    });

    const detail = (term, ...value) => el('div', { className: 'details__row' }, el('dt', {}, term), el('dd', {}, ...value));

    function adminActions(m, withCallup) {
        if (!isAdmin()) return null;
        return el('div', { className: 'card__actions' },
            withCallup && el('button', { type: 'button', className: 'btn--outline btn--small', dataset: { callup: m.id } }, 'Manage call-up'),
            el('button', { type: 'button', className: 'btn--outline btn--small', dataset: { editMatch: m.id } }, 'Edit'),
            el('button', { type: 'button', className: 'btn--danger btn--small', dataset: { deleteMatch: m.id } }, 'Delete'));
    }

    // ---------- Próximos partidos ----------
    function fixtureCard(m) {
        const slot = el('div', { dataset: { callupSlot: m.id } });
        fillCallup(m, slot);
        return el('article', { className: 'fixture-card card' },
            el('span', { className: 'badge' }, 'League Match'),
            el('h3', { className: 'fixture-card__teams' }, m.homeTeam.name, ' ', el('span', { className: 'fixture-card__vs' }, 'vs'), ' ', m.awayTeam.name),
            el('dl', { className: 'details' },
                detail('Date', el('time', { dateTime: m.date.slice(0, 10) }, formatDate(m.date))),
                detail('Time', el('time', { dateTime: formatTime(m.date) }, formatTime(m.date))),
                detail('Location', m.location)),
            slot,
            adminActions(m, true));
    }

    function callupView(list, published) {
        const li = (p) => el('li', { className: p.injured ? 'is-injured' : '' }, p.shirtNumber ? `#${p.shirtNumber} ` : '', p.name);
        const starters = list.filter((p) => p.role === 'starter');
        const subs = list.filter((p) => p.role === 'substitute');
        return el('details', { className: 'callup', open: published },
            el('summary', {}, `Call-up${published ? '' : ' (draft · not public)'}: ${starters.length} starters, ${subs.length} substitutes`),
            el('h4', {}, 'Starters'), el('ul', {}, starters.map(li)),
            el('h4', {}, 'Substitutes'), el('ul', {}, subs.length ? subs.map(li) : el('li', {}, 'None')));
    }

    async function fillCallup(m, slot) {
        const note = (text) => slot.replaceChildren(el('p', { className: 'card__meta callup' }, text));
        if (!m.callupPublished && !isAdmin()) return note('Call-up not published yet.');
        try {
            const list = await apiRequest('GET', `/api/matches/${m.id}/callup`);
            if (list.length || m.callupPublished) slot.replaceChildren(callupView(list, m.callupPublished));
            else note('No call-up saved yet.');
        } catch (err) {
            note(err.status === 404 ? 'Call-up not published yet.' : err.message);
        }
    }

    // ---------- Resultados ----------
    function resultCard(m) {
        const diff = m.homeTeam.id === OWN_TEAM_ID ? m.homeGoals - m.awayGoals : m.awayGoals - m.homeGoals;
        const [label, cls] = diff > 0 ? ['Victory', 'badge--win'] : diff < 0 ? ['Defeat', 'badge--loss'] : ['Draw', 'badge--draw'];
        return el('article', { className: 'result-card card' },
            el('h3', { className: 'result-card__score' },
                el('span', { className: 'result-card__team' }, m.homeTeam.name),
                el('span', { className: 'result-card__value' }, `${m.homeGoals} - ${m.awayGoals}`),
                el('span', { className: 'result-card__team' }, m.awayTeam.name)),
            el('div', { className: 'result-card__footer' },
                el('p', { className: 'card__meta' }, el('time', { dateTime: m.date.slice(0, 10) }, formatDate(m.date))),
                el('span', { className: `badge ${cls}` }, label)),
            adminActions(m, false));
    }

    async function loadMatches() {
        const [upcoming, played] = await Promise.all([
            loadList({
                container: fixturesGrid, statusEl: fixturesStatus, loading: 'Loading fixtures…', empty: 'No upcoming matches.',
                request: () => apiRequest('GET', '/api/matches' + query({ status: 'upcoming', teamId: OWN_TEAM_ID })), render: fixtureCard
            }),
            loadList({
                container: resultsGrid, statusEl: resultsStatus, loading: 'Loading results…', empty: 'No results yet.',
                request: () => apiRequest('GET', '/api/matches' + query({ status: 'played', teamId: OWN_TEAM_ID, limit: 6 })), render: resultCard
            })
        ]);
        matches = [...(upcoming || []), ...(played || [])];
    }

    // ---------- Clasificación ----------
    async function loadStandings() {
        setStatus(standingsStatus, 'Loading standings…');
        try {
            const rows = await apiRequest('GET', '/api/standings');
            const matchday = Math.max(0, ...rows.map((r) => r.played));
            document.getElementById('standings-caption').textContent = `University League — Matchday ${matchday}`;
            const gd = (n) => (n > 0 ? `+${n}` : String(n));
            standingsBody.replaceChildren(...rows.map((r) => el('tr', { className: r.teamId === OWN_TEAM_ID ? 'is-cunef' : '' },
                el('th', { scope: 'row' }, r.position), el('td', {}, r.team), el('td', {}, r.played), el('td', {}, r.won),
                el('td', {}, r.drawn), el('td', {}, r.lost), el('td', {}, gd(r.goalDifference)), el('td', {}, r.points))));
            setStatus(standingsStatus, rows.length ? '' : 'No teams yet.');
        } catch (err) {
            standingsBody.replaceChildren();
            setStatus(standingsStatus, err.message, 'error');
        }
    }

    // ---------- Equipos ----------
    function teamRow(t) {
        return el('tr', { className: t.id === OWN_TEAM_ID ? 'is-cunef' : '' },
            el('td', {}, t.name), el('td', {}, t.stadium), el('td', {}, t.creationDate.slice(0, 4)),
            el('td', {}, isAdmin() && el('div', { className: 'card__actions' },
                el('button', { type: 'button', className: 'btn--outline btn--small', dataset: { editTeam: t.id } }, 'Edit'),
                t.id !== OWN_TEAM_ID && el('button', { type: 'button', className: 'btn--danger btn--small', dataset: { deleteTeam: t.id } }, 'Delete'))));
    }

    async function loadTeams() {
        teams = (await loadList({
            container: teamsBody, statusEl: teamsStatus, loading: 'Loading teams…', empty: 'No teams yet.',
            request: () => apiRequest('GET', '/api/teams'), render: teamRow
        })) || [];
    }

    const refreshAll = () => Promise.all([loadMatches(), loadStandings(), loadTeams()]);

    // ---------- Admin: diálogo de partido ----------
    const matchDialog = document.getElementById('match-dialog');
    const matchForm = document.getElementById('match-form');
    let editingMatch = null;

    function openMatchDialog(m) {
        editingMatch = m || null;
        matchForm.reset();
        clearFormErrors(matchForm);
        const f = matchForm.elements;
        // Las listas de equipos salen de la API (teams es un recurso), no están escritas en el HTML.
        for (const select of [f.homeTeamId, f.awayTeamId])
            select.replaceChildren(...teams.map((t) => el('option', { value: t.id }, t.name)));
        document.getElementById('match-dialog-title').textContent = m ? 'Edit match' : 'New match';
        if (m) {
            f.homeTeamId.value = m.homeTeamId;
            f.awayTeamId.value = m.awayTeamId;
            f.date.value = m.date.slice(0, 10);
            f.time.value = formatTime(m.date);
            f.location.value = m.location;
            f.homeGoals.value = m.homeGoals ?? '';
            f.awayGoals.value = m.awayGoals ?? '';
            f.callupPublished.checked = m.callupPublished;
        } else {
            f.homeTeamId.value = OWN_TEAM_ID;
            f.awayTeamId.value = teams.find((t) => t.id !== OWN_TEAM_ID)?.id ?? '';
            f.location.value = teams.find((t) => t.id === OWN_TEAM_ID)?.stadium ?? '';
            f.time.value = '16:00';
        }
        matchDialog.showModal();
    }

    function matchFormBody() {
        const f = matchForm.elements;
        return {
            date: `${f.date.value}T${f.time.value}`,
            location: f.location.value.trim(),
            homeTeamId: Number(f.homeTeamId.value),
            awayTeamId: Number(f.awayTeamId.value),
            homeGoals: numberOrNull(f.homeGoals),
            awayGoals: numberOrNull(f.awayGoals),
            callupPublished: f.callupPublished.checked
        };
    }

    // Comprobaciones que no se pueden escribir con atributos HTML (las mismas que hace el validador).
    function matchExtraCheck() {
        const b = matchFormBody();
        const errors = [];
        if (b.homeTeamId === b.awayTeamId) errors.push({ field: 'awayTeamId', message: 'A team cannot play against itself' });
        if ((b.homeGoals === null) !== (b.awayGoals === null)) errors.push({ field: 'awayGoals', message: 'Fill in both goals or leave both empty' });
        return errors;
    }

    matchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitForm(matchForm, {
            extraCheck: matchExtraCheck,
            request: () => (editingMatch
                ? apiRequest('PUT', `/api/matches/${editingMatch.id}`, matchFormBody())
                : apiRequest('POST', '/api/matches', matchFormBody())),
            onSuccess: async () => { matchDialog.close(); await Promise.all([loadMatches(), loadStandings()]); }
        });
    });

    // ---------- Admin: diálogo de equipo ----------
    const teamDialog = document.getElementById('team-dialog');
    const teamForm = document.getElementById('team-form');
    let editingTeam = null;

    function openTeamDialog(t) {
        editingTeam = t || null;
        teamForm.reset();
        clearFormErrors(teamForm);
        document.getElementById('team-dialog-title').textContent = t ? 'Edit team' : 'New team';
        if (t) {
            teamForm.elements.name.value = t.name;
            teamForm.elements.stadium.value = t.stadium;
            teamForm.elements.creationDate.value = t.creationDate;
        }
        teamDialog.showModal();
    }

    teamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = teamForm.elements;
        const body = { name: f.name.value.trim(), stadium: f.stadium.value.trim(), creationDate: f.creationDate.value };
        submitForm(teamForm, {
            extraCheck: () => (body.creationDate > toDateStr(new Date()) ? [{ field: 'creationDate', message: 'Cannot be in the future' }] : []),
            request: () => (editingTeam ? apiRequest('PUT', `/api/teams/${editingTeam.id}`, body) : apiRequest('POST', '/api/teams', body)),
            onSuccess: async () => { teamDialog.close(); await refreshAll(); }      // el nombre sale también en partidos y clasificación
        });
    });

    document.querySelectorAll('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
    document.getElementById('new-match').addEventListener('click', () => openMatchDialog(null));
    document.getElementById('new-team').addEventListener('click', () => openTeamDialog(null));

    async function remove(path, question, statusEl) {
        if (!confirm(question)) return;
        try {
            await apiRequest('DELETE', path);
            await refreshAll();
        } catch (err) {
            setStatus(statusEl, err.message, 'error');      // p. ej. 409: el equipo todavía tiene partidos
        }
    }

    // Un solo listener por zona (delegación de eventos): sirve también para las tarjetas que se pintan después.
    function onMatchClick(e) {
        const btn = e.target.closest('[data-callup], [data-edit-match], [data-delete-match]');
        if (!btn) return;
        const { callup, editMatch, deleteMatch } = btn.dataset;            // data-edit-match -> dataset.editMatch
        const m = matches.find((x) => x.id === Number(callup ?? editMatch ?? deleteMatch));
        if (callup) return openCallup(m);
        if (editMatch) return openMatchDialog(m);
        remove(`/api/matches/${m.id}`, `Delete ${m.homeTeam.name} vs ${m.awayTeam.name}?`, e.currentTarget === resultsGrid ? resultsStatus : fixturesStatus);
    }
    fixturesGrid.addEventListener('click', onMatchClick);
    resultsGrid.addEventListener('click', onMatchClick);

    teamsBody.addEventListener('click', (e) => {
        const edit = e.target.closest('[data-edit-team]');
        if (edit) return openTeamDialog(teams.find((t) => t.id === Number(edit.dataset.editTeam)));
        const del = e.target.closest('[data-delete-team]');
        if (del) {
            const t = teams.find((x) => x.id === Number(del.dataset.deleteTeam));
            remove(`/api/teams/${t.id}`, `Delete ${t.name}?`, teamsStatus);
        }
    });

    // ---------- Admin: convocatoria ----------
    const callupDialog = document.getElementById('callup-dialog');
    const rowsEl = document.getElementById('callup-rows');
    const counter = document.getElementById('callup-counter');
    const msg = document.getElementById('callup-msg');
    const saveBtn = document.getElementById('callup-save');
    const publishBtn = document.getElementById('callup-publish');
    let cu = null;   // { match, sel: Map(playerId -> role), savedKey, savedStarters }

    const keyOf = (sel) => JSON.stringify([...sel.entries()].sort((a, b) => a[0] - b[0]));
    const countRole = (sel, role) => [...sel.values()].filter((r) => r === role).length;

    function flash(text, kind) {
        msg.className = kind === 'error' ? 'form__error' : 'form__success';
        setStatus(msg, text, kind);
    }

    function refreshCallupControls() {
        const starters = countRole(cu.sel, 'starter');
        const subs = countRole(cu.sel, 'substitute');
        const ready = starters === 11 && starters + subs <= 20;
        const dirty = keyOf(cu.sel) !== cu.savedKey;
        counter.textContent = `Starters ${starters}/11 · Substitutes ${subs} · Total ${starters + subs}/20`;
        counter.classList.toggle('is-ready', ready);
        saveBtn.disabled = !ready || !dirty;
        publishBtn.textContent = cu.match.callupPublished ? 'Unpublish call-up' : 'Publish call-up';
        publishBtn.disabled = cu.match.callupPublished ? false : dirty || cu.savedStarters !== 11;
        publishBtn.title = !cu.match.callupPublished && dirty ? 'Save the call-up before publishing' : '';
    }

    function callupRow(p) {
        const select = el('select', { dataset: { player: p.id }, attrs: { 'aria-label': `Call-up role of ${p.name}` } },
            el('option', { value: '' }, 'Not called up'),
            el('option', { value: 'starter', disabled: p.injured }, 'Starter'),
            el('option', { value: 'substitute' }, 'Substitute'));
        select.value = cu.sel.get(p.id) || '';
        return el('tr', { className: p.injured ? 'is-injured' : '' },
            el('td', {}, p.shirtNumber ? `#${p.shirtNumber} ` : '', p.name, ' ', p.injured && el('span', { className: 'badge badge--injured' }, 'Injured')),
            el('td', {}, capitalize(p.position)),
            el('td', {}, select));
    }

    async function openCallup(match) {
        setStatus(msg, '');
        rowsEl.replaceChildren(el('tr', {}, el('td', { colSpan: 3 }, 'Loading…')));
        document.getElementById('callup-match').textContent =
            `${match.homeTeam.name} vs ${match.awayTeam.name} · ${formatDate(match.date)} ${formatTime(match.date)}`;
        callupDialog.showModal();
        try {
            const [players, current] = await Promise.all([
                apiRequest('GET', '/api/players?sort=shirtNumber'),
                apiRequest('GET', `/api/matches/${match.id}/callup`)
            ]);
            const sel = new Map(current.map((p) => [p.playerId, p.role]));
            cu = { match, sel, savedKey: keyOf(sel), savedStarters: countRole(sel, 'starter') };
            rowsEl.replaceChildren(...players.filter((p) => p.teamId === OWN_TEAM_ID).map(callupRow));
            refreshCallupControls();
        } catch (err) {
            rowsEl.replaceChildren();
            flash(err.message, 'error');
        }
    }

    rowsEl.addEventListener('change', (e) => {
        const select = e.target.closest('select[data-player]');
        if (!select || !cu) return;
        const id = Number(select.dataset.player);
        if (select.value) cu.sel.set(id, select.value); else cu.sel.delete(id);
        setStatus(msg, '');
        refreshCallupControls();
    });

    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        try {
            const players = [...cu.sel.entries()].map(([playerId, role]) => ({ playerId, role }));
            await apiRequest('PUT', `/api/matches/${cu.match.id}/callup`, { players });
            cu.savedKey = keyOf(cu.sel);
            cu.savedStarters = countRole(cu.sel, 'starter');
            flash('Call-up saved.', 'ok');
        } catch (err) {
            flash(err.message, 'error');
        }
        refreshCallupControls();
    });

    // Publicar = PUT del partido completo con callupPublished cambiado.
    publishBtn.addEventListener('click', async () => {
        publishBtn.disabled = true;
        try {
            const updated = await apiRequest('PUT', `/api/matches/${cu.match.id}`, { ...matchBody(cu.match), callupPublished: !cu.match.callupPublished });
            cu.match = updated;
            flash(updated.callupPublished ? 'Call-up published: fans can see it now.' : 'Call-up unpublished.', 'ok');
        } catch (err) {
            flash(err.message, 'error');
        }
        refreshCallupControls();
    });

    document.getElementById('callup-close').addEventListener('click', () => callupDialog.close());
    callupDialog.addEventListener('close', () => { if (cu) { cu = null; loadMatches(); } });

    loadTeams();        // también hace falta para el diálogo de partidos
    loadMatches();
    loadStandings();
})();
