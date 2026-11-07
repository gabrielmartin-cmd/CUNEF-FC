/* training.js — página Training: calendario de sesiones y asistencia.
   training-sessions: GET /api/training-sessions?from=&to=&type= · POST · PUT /:id · DELETE /:id (admin)
   attendances:       GET /api/attendances?sessionId= | ?from=&to=
                      PUT /:id (el player la suya, el admin cualquiera) · POST · DELETE /:id (admin)
   Visitante/fan: solo sesiones públicas · Player: todas + su asistencia · Admin: gestión completa */
(function () {
    'use strict';

    const role = auth.role;
    const isAdmin = role === 'admin';
    const isPlayer = role === 'player' && !!auth.user?.playerId;
    const privileged = role === 'player' || isAdmin;
    const STATUS_BADGE = { confirmed: 'badge--ok', absent: 'badge--loss', injured: 'badge--injured', pending: 'badge--muted' };
    const STATUSES = ['pending', 'confirmed', 'absent', 'injured'];   // mismos valores que attendanceValidator.js

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

    const badge = (status, extra = '') => el('span', { className: `badge ${STATUS_BADGE[status] || ''}` }, capitalize(status) + extra);
    const hasStarted = (s) => parseLocal(`${s.date}T${s.startTime}`) <= new Date();
    const attendanceBody = (a, status, reason) => ({ sessionId: a.sessionId, playerId: a.playerId, status, reason: reason || null });

    if (!privileged) {
        const n = document.getElementById('training-notice');
        n.hidden = false;
        n.replaceChildren('You are seeing the ', el('strong', {}, 'public'), ' sessions. ',
            el('a', { href: 'login.html' }, 'Log in'), ' as a player to see the full schedule and confirm your attendance.');
    }

    // ---------- Calendario (agenda por días) ----------
    async function loadMonth() {
        const first = new Date(view.year, view.month, 1);
        const last = new Date(view.year, view.month + 1, 0);
        monthLabel.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        setStatus(listStatus, 'Loading sessions…');
        const range = { from: toDateStr(first), to: toDateStr(last) };
        try {
            sessions = await apiRequest('GET', '/api/training-sessions' + query({ ...range, type: typeFilter.value, sort: 'date' }));
            if (isPlayer) {
                const att = await apiRequest('GET', '/api/attendances' + query(range));
                myAtt = new Map(att.map((a) => [a.sessionId, a]));
            }
            if (!sessions.some((s) => s.id === selectedId)) selectedId = null;
            renderList();
            renderDetail();
            setStatus(listStatus, sessions.length ? '' : 'No sessions this month.');
        } catch (err) {
            sessions = [];
            listEl.replaceChildren();
            setStatus(listStatus, err.message, 'error');
        }
    }

    function sessionItem(s) {
        return el('li', {}, el('button', { type: 'button', className: 'session-item', dataset: { session: s.id }, attrs: { 'aria-pressed': String(s.id === selectedId) } },
            el('span', { className: 'session-item__time' }, s.startTime),
            el('span', { className: 'session-item__main' },
                el('span', { className: 'badge' }, capitalize(s.type)),
                privileged && !s.isPublic && el('span', { className: 'badge badge--muted' }, 'Private'),
                isPlayer && myAtt.get(s.id) && badge(myAtt.get(s.id).status)),
            el('span', { className: 'session-item__where' }, s.location)));
    }

    function renderList() {
        const byDay = new Map();
        for (const s of sessions) byDay.set(s.date, [...(byDay.get(s.date) || []), s]);
        listEl.replaceChildren(...[...byDay.entries()].map(([date, items]) => el('section', { className: 'agenda__day' },
            el('h3', { className: 'agenda__date' }, formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })),
            el('ul', {}, items.map(sessionItem)))));
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
    const notice = (...content) => el('p', { className: 'notice' }, ...content);

    async function renderDetail() {
        const s = sessions.find((x) => x.id === selectedId);
        const token = ++detailToken;
        if (!s) return detailEl.replaceChildren(el('p', { className: 'status' }, 'Select a session to see its notes and attendance.'));

        const area = el('div', { id: 'attendance-area' }, el('p', { className: 'status' }, 'Loading attendance…'));
        detailEl.replaceChildren(el('div', { className: 'session-detail' },
            el('header', {},
                el('p', { className: 'eyebrow' }, `${formatDate(s.date, { weekday: 'long', month: 'long', day: 'numeric' })} · ${s.startTime}`),
                el('h2', {}, `${capitalize(s.type)} session`)),
            el('dl', { className: 'details details--flush' },
                el('div', { className: 'details__row' }, el('dt', {}, 'Location'), el('dd', {}, s.location)),
                el('div', { className: 'details__row' }, el('dt', {}, 'Visibility'), el('dd', {}, s.isPublic ? 'Public' : 'Players only'))),
            el('div', {}, el('h3', {}, 'Notes'), el('p', { className: 'card__text' }, s.notes || 'No notes for this session.')),
            isAdmin && el('div', { className: 'card__actions' },
                el('button', { type: 'button', className: 'btn--outline btn--small', dataset: { editSession: '' } }, 'Edit session'),
                el('button', { type: 'button', className: 'btn--danger btn--small', dataset: { deleteSession: '' } }, 'Delete session')),
            el('p', { id: 'detail-msg', attrs: { role: 'status' }, hidden: true }),
            area));

        if (role === 'visitor') {
            area.replaceChildren(notice(el('a', { href: 'login.html' }, 'Log in'), ' as a player to see and confirm your attendance.'));
        } else if (role === 'fan') {
            area.replaceChildren(notice('Attendance is managed by the players and the coaching staff.'));
        } else if (isAdmin) {
            try {
                const [rows, players] = await Promise.all([
                    apiRequest('GET', '/api/attendances' + query({ sessionId: s.id })),
                    apiRequest('GET', '/api/players?sort=name')
                ]);
                if (token === detailToken) area.replaceChildren(adminAttendance(s, rows, players));
            } catch (err) {
                if (token === detailToken) area.replaceChildren(el('p', { className: 'status status--error' }, err.message));
            }
        } else if (!isPlayer) {
            area.replaceChildren(notice('Your account is not linked to a player yet. Ask an admin to link it.'));
        } else {
            area.replaceChildren(playerAttendance(s, myAtt.get(s.id)));
        }
    }

    // --- Player: su propia asistencia
    function playerAttendance(s, att) {
        if (!att) return notice('You have no attendance record for this session.');
        const box = el('div', { className: 'session-detail' },
            el('h3', {}, 'Your attendance'),
            el('p', {}, badge(att.status), ' ', att.reason && el('span', { className: 'card__meta' }, `“${att.reason}”`)));
        if (hasStarted(s)) {
            box.append(notice('This session has already started: attendance is closed.'));
        } else {
            box.append(
                el('div', { className: 'field' },
                    el('label', { htmlFor: 'att-reason' }, 'Reason (required if you cannot attend)'),
                    el('textarea', { id: 'att-reason', maxLength: 300, value: att.reason || '' })),
                el('div', { className: 'card__actions' },
                    el('button', { type: 'button', dataset: { att: att.id, status: 'confirmed' } }, 'I’ll be there'),
                    el('button', { type: 'button', className: 'btn--outline', dataset: { att: att.id, status: 'absent' } }, 'I can’t attend')));
        }
        return box;
    }

    // --- Admin: toda la plantilla (PUT por fila, DELETE por fila, POST para añadir a alguien)
    function adminAttendance(s, rows, players) {
        const counts = Object.fromEntries(STATUSES.map((st) => [st, rows.filter((r) => r.status === st).length]));
        const statusSelect = (value, label) => {
            const select = el('select', { attrs: { 'aria-label': label } }, STATUSES.map((st) => el('option', { value: st }, capitalize(st))));
            select.value = value;
            return select;
        };

        const body = el('tbody', {}, rows.map((r) => el('tr', { dataset: { row: r.id } },
            el('td', {}, r.playerName),
            el('td', {}, statusSelect(r.status, `Status of ${r.playerName}`)),
            el('td', {}, el('input', { type: 'text', maxLength: 300, value: r.reason || '', attrs: { 'aria-label': `Reason for ${r.playerName}` } })),
            el('td', {}, el('div', { className: 'card__actions' },
                el('button', { type: 'button', className: 'btn--small', dataset: { adminSave: r.id } }, 'Save'),
                el('button', { type: 'button', className: 'btn--danger btn--small', dataset: { adminDelete: r.id } }, 'Remove'))))));

        // Jugadores que todavía no tienen asistencia en esta sesión (p. ej. fichajes nuevos)
        const missing = players.filter((p) => p.teamId === OWN_TEAM_ID && !rows.some((r) => r.playerId === p.id));
        const addForm = missing.length > 0 && el('div', { className: 'toolbar' },
            el('div', { className: 'toolbar__group' },
                el('label', { htmlFor: 'add-player' }, 'Add player'),
                el('select', { id: 'add-player' }, missing.map((p) => el('option', { value: p.id }, p.name)))),
            el('button', { type: 'button', className: 'btn--small', dataset: { adminAdd: s.id } }, 'Add as pending'));

        return el('div', { className: 'session-detail' },
            el('h3', {}, 'Squad attendance'),
            el('div', { className: 'attendance-summary' }, STATUSES.map((st) => badge(st, ` · ${counts[st]}`))),
            rows.length ? el('div', { className: 'table-wrap', tabIndex: 0, attrs: { role: 'region', 'aria-label': 'Squad attendance' } },
                el('table', { className: 'simple-table' },
                    el('thead', {}, el('tr', {},
                        el('th', { scope: 'col' }, 'Player'), el('th', { scope: 'col' }, 'Status'),
                        el('th', { scope: 'col' }, 'Reason'), el('th', { scope: 'col' }, el('span', { className: 'visually-hidden' }, 'Actions')))),
                    body))
                : notice('Nobody is registered for this session yet.'),
            addForm);
    }

    function detailMsg(text, kind) {
        const msg = detailEl.querySelector('#detail-msg');
        if (!msg) return;
        msg.className = kind === 'error' ? 'form__error' : 'form__success';
        setStatus(msg, text, kind);
    }

    detailEl.addEventListener('click', async (e) => {
        // Player confirma / justifica (PUT con el objeto completo)
        const attBtn = e.target.closest('[data-att]');
        if (attBtn) {
            const att = myAtt.get(selectedId);
            const status = attBtn.dataset.status;
            const reason = detailEl.querySelector('#att-reason').value.trim();
            if (status === 'absent' && !reason) return detailMsg('Please write a reason if you cannot attend.', 'error');
            try {
                const updated = await apiRequest('PUT', `/api/attendances/${att.id}`, attendanceBody(att, status, status === 'absent' ? reason : null));
                myAtt.set(updated.sessionId, updated);
                renderList();
                renderDetail();
            } catch (err) { detailMsg(err.message, 'error'); }
            return;
        }
        // Admin: guardar una fila
        const saveBtn = e.target.closest('[data-admin-save]');
        if (saveBtn) {
            const row = saveBtn.closest('tr');
            const status = row.querySelector('select').value;
            const reason = row.querySelector('input').value.trim();
            if (status === 'absent' && !reason) return detailMsg('A reason is required when the status is Absent.', 'error');
            try {
                const current = await apiRequest('GET', `/api/attendances/${saveBtn.dataset.adminSave}`);
                await apiRequest('PUT', `/api/attendances/${current.id}`, attendanceBody(current, status, reason));
                renderDetail();
            } catch (err) { detailMsg(err.message, 'error'); }
            return;
        }
        // Admin: quitar a un jugador de la sesión
        const delBtn = e.target.closest('[data-admin-delete]');
        if (delBtn) {
            if (!confirm('Remove this player from the session?')) return;
            try {
                await apiRequest('DELETE', `/api/attendances/${delBtn.dataset.adminDelete}`);
                renderDetail();
            } catch (err) { detailMsg(err.message, 'error'); }
            return;
        }
        // Admin: añadir a un jugador
        const addBtn = e.target.closest('[data-admin-add]');
        if (addBtn) {
            const playerId = Number(detailEl.querySelector('#add-player').value);
            try {
                await apiRequest('POST', '/api/attendances', { sessionId: Number(addBtn.dataset.adminAdd), playerId, status: 'pending', reason: null });
                renderDetail();
            } catch (err) { detailMsg(err.message, 'error'); }
            return;
        }
        if (e.target.closest('[data-edit-session]')) openSessionDialog(sessions.find((x) => x.id === selectedId));
        if (e.target.closest('[data-delete-session]')) confirmDialog.showModal();
    });

    // ---------- Admin: crear / editar sesión ----------
    const dialog = document.getElementById('session-dialog');
    const form = document.getElementById('session-form');
    let editing = null;

    function openSessionDialog(session) {
        editing = session || null;
        form.reset();
        clearFormErrors(form);
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
        dialog.showModal();
    }

    document.getElementById('new-session').addEventListener('click', () => openSessionDialog(null));
    document.getElementById('session-cancel').addEventListener('click', () => dialog.close());

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = form.elements;
        const body = {
            date: f.date.value, startTime: f.startTime.value, location: f.location.value.trim(),
            type: f.type.value, notes: f.notes.value.trim() || null, isPublic: f.isPublic.checked
        };
        submitForm(form, {
            extraCheck: () => (!editing && body.date && body.date < toDateStr(new Date())
                ? [{ field: 'date', message: 'A new session cannot be in the past' }] : []),
            request: () => (editing
                ? apiRequest('PUT', `/api/training-sessions/${editing.id}`, body)
                : apiRequest('POST', '/api/training-sessions', body)),        // POST también crea la asistencia de la plantilla
            onSuccess: async (saved) => {
                dialog.close();
                const d = parseLocal(saved.date);
                view = { year: d.getFullYear(), month: d.getMonth() };
                selectedId = saved.id;
                await loadMonth();
            }
        });
    });

    // ---------- Admin: borrar sesión ----------
    const confirmDialog = document.getElementById('confirm-dialog');
    document.getElementById('confirm-cancel').addEventListener('click', () => confirmDialog.close());
    document.getElementById('confirm-ok').addEventListener('click', async () => {
        confirmDialog.close();
        try {
            await apiRequest('DELETE', `/api/training-sessions/${selectedId}`);
            selectedId = null;
            await loadMonth();
        } catch (err) { detailMsg(err.message, 'error'); }
    });

    // ---------- Navegación de mes y filtro (el filtro de tipo lo aplica el servidor) ----------
    const shift = (n) => { const d = new Date(view.year, view.month + n, 1); view = { year: d.getFullYear(), month: d.getMonth() }; loadMonth(); };
    document.getElementById('prev-month').addEventListener('click', () => shift(-1));
    document.getElementById('next-month').addEventListener('click', () => shift(1));
    typeFilter.addEventListener('change', loadMonth);

    loadMonth();
})();
