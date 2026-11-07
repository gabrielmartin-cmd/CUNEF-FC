/* Training: calendario de sesiones, detalle y asistencia.
   Visitante/fan: sesiones públicas · Player: todas + su asistencia · Admin: gestión completa */
(function () {
    'use strict';
    const { api, auth, esc, formatDate, formatTime, capitalize, parseLocal, toDateStr, setStatus, errorMessage } = CUNEF;

    const role = auth.role;
    const isAdmin = role === 'admin';
    const isPlayer = role === 'player' && !!auth.user?.playerId;
    const privileged = role === 'player' || isAdmin;
    const STATUS_BADGE = { confirmed: 'badge--ok', absent: 'badge--loss', injured: 'badge--injured', pending: 'badge--muted' };
    const STATUSES = ['pending', 'confirmed', 'absent', 'injured'];

    const listEl = document.getElementById('session-list');
    const detailEl = document.getElementById('session-detail');
    const listStatus = document.getElementById('training-status');
    const monthLabel = document.getElementById('month-label');
    const typeFilter = document.getElementById('type-filter');

    const today = new Date();
    let view = { year: today.getFullYear(), month: today.getMonth() };
    let sessions = [];
    let selectedId = null;
    let myAtt = new Map();        // player: sessionId -> su asistencia
    let detailToken = 0;          // evita que una respuesta lenta pise a una más reciente

    const badge = (status) => `<span class="badge ${STATUS_BADGE[status] || ''}">${esc(capitalize(status))}</span>`;
    const hasStarted = (s) => parseLocal(`${s.date}T${s.startTime}`) <= new Date();

    if (!privileged) {
        const n = document.getElementById('training-notice');
        n.hidden = false;
        n.innerHTML = 'You are seeing the <strong>public</strong> sessions. <a href="login.html">Log in</a> as a player to see the full schedule and confirm your attendance.';
    }

    // ---------- Calendario (agenda por días) ----------
    async function loadMonth() {
        const first = new Date(view.year, view.month, 1);
        const last = new Date(view.year, view.month + 1, 0);
        monthLabel.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        setStatus(listStatus, 'Loading sessions…');
        const range = { from: toDateStr(first), to: toDateStr(last) };
        try {
            const res = await api.get('/api/training-sessions', { ...range, type: typeFilter.value, sort: 'date', limit: 100 });
            sessions = res.data;
            if (isPlayer) {
                const att = await api.get('/api/attendances', { ...range, limit: 100 });
                myAtt = new Map(att.data.map((a) => [a.sessionId, a]));
            }
            if (!sessions.some((s) => s.id === selectedId)) selectedId = null;
            renderList();
            renderDetail();
            setStatus(listStatus, sessions.length ? '' : 'No sessions this month.');
        } catch (err) {
            sessions = [];
            listEl.innerHTML = '';
            setStatus(listStatus, errorMessage(err), 'error');
        }
    }

    function renderList() {
        const byDay = new Map();
        for (const s of sessions) byDay.set(s.date, [...(byDay.get(s.date) || []), s]);
        listEl.innerHTML = [...byDay.entries()].map(([date, items]) => `
            <section class="agenda__day">
                <h3 class="agenda__date">${esc(formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' }))}</h3>
                <ul>${items.map((s) => `
                    <li><button type="button" class="session-item" data-session="${s.id}" aria-pressed="${s.id === selectedId}">
                        <span class="session-item__time">${esc(s.startTime)}</span>
                        <span class="session-item__main">
                            <span class="badge">${esc(capitalize(s.type))}</span>
                            ${privileged && !s.isPublic ? '<span class="badge badge--muted">Private</span>' : ''}
                            ${isPlayer && myAtt.get(s.id) ? badge(myAtt.get(s.id).status) : ''}
                        </span>
                        <span class="session-item__where">${esc(s.location)}</span>
                    </button></li>`).join('')}
                </ul>
            </section>`).join('');
    }

    listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-session]');
        if (!btn) return;
        selectedId = Number(btn.dataset.session);
        renderList();
        renderDetail();
        if (window.matchMedia('(max-width: 55.99rem)').matches) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // ---------- Detalle de la sesión + asistencia ----------
    async function renderDetail() {
        const s = sessions.find((x) => x.id === selectedId);
        const token = ++detailToken;
        if (!s) {
            detailEl.innerHTML = '<p class="status">Select a session to see its notes and attendance.</p>';
            return;
        }
        detailEl.innerHTML = `
            <div class="session-detail">
                <header>
                    <p class="eyebrow">${esc(formatDate(s.date, { weekday: 'long', month: 'long', day: 'numeric' }))} · ${esc(s.startTime)}</p>
                    <h2>${esc(capitalize(s.type))} session</h2>
                </header>
                <dl class="details" style="margin-top:0;padding-top:0;border-top:0">
                    <div class="details__row"><dt>Location</dt><dd>${esc(s.location)}</dd></div>
                    <div class="details__row"><dt>Visibility</dt><dd>${s.isPublic ? 'Public' : 'Players only'}</dd></div>
                </dl>
                <div><h3>Notes</h3><p class="card__text">${s.notes ? esc(s.notes) : 'No notes for this session.'}</p></div>
                ${isAdmin ? `<div class="card__actions">
                    <button type="button" class="btn--outline btn--small" data-edit-session>Edit session</button>
                    <button type="button" class="btn--danger btn--small" data-delete-session>Delete session</button></div>` : ''}
                <p id="detail-msg" role="status" hidden></p>
                <div id="attendance-area"><p class="status">Loading attendance…</p></div>
            </div>`;
        const area = detailEl.querySelector('#attendance-area');

        if (!role || role === 'visitor') {
            area.innerHTML = '<p class="notice"><a href="login.html">Log in</a> as a player to see and confirm your attendance.</p>';
        } else if (role === 'fan') {
            area.innerHTML = '<p class="notice">Attendance is managed by the players and the coaching staff.</p>';
        } else if (isAdmin) {
            try {
                const res = await api.get('/api/attendances', { sessionId: s.id, limit: 100 });
                if (token !== detailToken) return;
                area.innerHTML = adminAttendanceHtml(res.data);
            } catch (err) {
                if (token === detailToken) area.innerHTML = `<p class="status status--error">${esc(errorMessage(err))}</p>`;
            }
        } else if (!isPlayer) {
            area.innerHTML = '<p class="notice">Your account is not linked to a player yet. Ask an admin to link it.</p>';
        } else {
            area.innerHTML = playerAttendanceHtml(s, myAtt.get(s.id));
        }
    }

    // --- Player: su propia asistencia
    function playerAttendanceHtml(s, att) {
        if (!att) return '<p class="notice">You have no attendance record for this session.</p>';
        const closed = hasStarted(s);
        return `
            <div class="session-detail">
                <h3>Your attendance</h3>
                <p>${badge(att.status)} ${att.reason ? `<span class="card__meta">“${esc(att.reason)}”</span>` : ''}</p>
                ${closed ? '<p class="notice">This session has already started: attendance is closed.</p>' : `
                <div class="field">
                    <label for="att-reason">Reason (required if you cannot attend)</label>
                    <textarea id="att-reason" maxlength="300">${esc(att.reason || '')}</textarea>
                </div>
                <div class="card__actions">
                    <button type="button" data-att="${att.id}" data-status="confirmed">I’ll be there</button>
                    <button type="button" class="btn--outline" data-att="${att.id}" data-status="absent">I can’t attend</button>
                </div>`}
            </div>`;
    }

    // --- Admin: toda la plantilla
    function adminAttendanceHtml(rows) {
        const counts = Object.fromEntries(STATUSES.map((st) => [st, rows.filter((r) => r.status === st).length]));
        return `
            <div class="session-detail">
                <h3>Squad attendance</h3>
                <div class="attendance-summary">${STATUSES.map((st) => `${badge(st).replace('</span>', ` · ${counts[st]}</span>`)}`).join('')}</div>
                <div class="table-wrap" tabindex="0" role="region" aria-label="Squad attendance">
                    <table class="simple-table">
                        <thead><tr><th scope="col">Player</th><th scope="col">Status</th><th scope="col">Reason</th><th scope="col"><span class="visually-hidden">Save</span></th></tr></thead>
                        <tbody>${rows.map((r) => `
                            <tr data-row="${r.id}">
                                <td>${esc(r.playerName)}</td>
                                <td><select aria-label="Status of ${esc(r.playerName)}">${STATUSES.map((st) => `<option value="${st}" ${st === r.status ? 'selected' : ''}>${capitalize(st)}</option>`).join('')}</select></td>
                                <td><input type="text" maxlength="300" value="${esc(r.reason || '')}" aria-label="Reason for ${esc(r.playerName)}"></td>
                                <td><button type="button" class="btn--small" data-admin-save="${r.id}">Save</button></td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }

    function detailMsg(text, kind) {
        const el = detailEl.querySelector('#detail-msg');
        if (!el) return;
        el.className = kind === 'error' ? 'form__error' : 'form__success';
        setStatus(el, text, kind);
    }

    detailEl.addEventListener('click', async (e) => {
        // Player confirma / justifica
        const attBtn = e.target.closest('[data-att]');
        if (attBtn) {
            const status = attBtn.dataset.status;
            const reason = detailEl.querySelector('#att-reason').value.trim();
            if (status === 'absent' && !reason) return detailMsg('Please write a reason if you cannot attend.', 'error');
            try {
                const updated = await api.patch(`/api/attendances/${attBtn.dataset.att}`, { status, reason: status === 'absent' ? reason : undefined });
                myAtt.set(updated.sessionId, updated);
                renderList();
                renderDetail();
            } catch (err) { detailMsg(errorMessage(err), 'error'); }
            return;
        }
        // Admin cambia la asistencia de cualquiera
        const saveBtn = e.target.closest('[data-admin-save]');
        if (saveBtn) {
            const row = saveBtn.closest('tr');
            const status = row.querySelector('select').value;
            const reason = row.querySelector('input').value.trim();
            if (status === 'absent' && !reason) return detailMsg('A reason is required when the status is Absent.', 'error');
            try {
                await api.patch(`/api/attendances/${saveBtn.dataset.adminSave}`, { status, reason: reason || undefined });
                renderDetail();
            } catch (err) { detailMsg(errorMessage(err), 'error'); }
            return;
        }
        if (e.target.closest('[data-edit-session]')) openSessionDialog(sessions.find((x) => x.id === selectedId));
        if (e.target.closest('[data-delete-session]')) askDelete();
    });

    // ---------- Admin: crear / editar sesión ----------
    const dialog = document.getElementById('session-dialog');
    const form = document.getElementById('session-form');
    const formError = document.getElementById('session-error');
    let editing = null;

    function openSessionDialog(session) {
        editing = session || null;
        form.reset();
        document.getElementById('session-title').textContent = editing ? 'Edit session' : 'New session';
        const f = form.elements;
        f.date.min = editing ? '' : toDateStr(new Date());
        if (editing) {
            f.date.value = editing.date;
            f.startTime.value = editing.startTime;
            f.location.value = editing.location;
            f.type.value = editing.type;
            f.notes.value = editing.notes || '';
            f.isPublic.checked = editing.isPublic;
        } else {
            f.location.value = 'Campos de Fútbol Ganapanes';
        }
        setStatus(formError, '');
        dialog.showModal();
    }

    document.getElementById('new-session').addEventListener('click', () => openSessionDialog(null));
    document.getElementById('session-cancel').addEventListener('click', () => dialog.close());

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus(formError, '');
        const f = form.elements;
        const values = {
            date: f.date.value, startTime: f.startTime.value, location: f.location.value.trim(),
            type: f.type.value, notes: f.notes.value.trim(), isPublic: f.isPublic.checked
        };
        try {
            let saved;
            if (!editing) {
                saved = await api.post('/api/training-sessions', values);          // también crea la asistencia de toda la plantilla
            } else {
                // PATCH: solo los campos que han cambiado (así no se revalida una fecha pasada sin tocarla)
                const original = { ...editing, notes: editing.notes || '' };
                const changes = Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== original[k]));
                saved = Object.keys(changes).length ? await api.patch(`/api/training-sessions/${editing.id}`, changes) : editing;
            }
            dialog.close();
            const d = parseLocal(saved.date);
            view = { year: d.getFullYear(), month: d.getMonth() };
            selectedId = saved.id;
            await loadMonth();
        } catch (err) {
            setStatus(formError, errorMessage(err), 'error');
        }
    });

    // ---------- Admin: borrar sesión ----------
    const confirmDialog = document.getElementById('confirm-dialog');
    function askDelete() { confirmDialog.showModal(); }
    document.getElementById('confirm-cancel').addEventListener('click', () => confirmDialog.close());
    document.getElementById('confirm-ok').addEventListener('click', async () => {
        confirmDialog.close();
        try {
            await api.delete(`/api/training-sessions/${selectedId}`);
            selectedId = null;
            await loadMonth();
        } catch (err) { detailMsg(errorMessage(err), 'error'); }
    });

    // ---------- Navegación de mes y filtro ----------
    const shift = (n) => { const d = new Date(view.year, view.month + n, 1); view = { year: d.getFullYear(), month: d.getMonth() }; loadMonth(); };
    document.getElementById('prev-month').addEventListener('click', () => shift(-1));
    document.getElementById('next-month').addEventListener('click', () => shift(1));
    typeFilter.addEventListener('change', loadMonth);

    loadMonth();
})();
