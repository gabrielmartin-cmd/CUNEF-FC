// Prueba de humo de la API contra las reglas del Word. Uso: npm test
// Arranca la app con los datos de ejemplo de src/data.js (en memoria) y lanza peticiones reales.
const { PASSWORD } = require('../src/data');
const app = require('../src/app');

let passed = 0, failed = 0;
const server = app.listen(0, async () => {
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = async (method, url, { token, body } = {}) => {
        const res = await fetch(base + url, {
            method,
            headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        return { status: res.status, json: text ? JSON.parse(text) : null };
    };
    const check = (name, cond, extra = '') => { cond ? passed++ : failed++; console.log(`${cond ? '  ok ' : ' FAIL'}  ${name}${cond ? '' : '  ' + extra}`); };
    const expectStatus = async (name, promise, status) => { const r = await promise; check(name, r.status === status, `got ${r.status} ${JSON.stringify(r.json)}`); return r; };
    const login = async (email) => (await call('POST', '/auth/login', { body: { email, password: PASSWORD } })).json.token;

    try {
        const admin = await login('admin@cunef.edu'), capi = await login('capi@cunef.edu'), fan = await login('fan@cunef.edu');
        const t = (n) => { const d = new Date(); d.setDate(d.getDate() + n); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

        console.log('Público');
        let r = await expectStatus('GET /teams/1', call('GET', '/teams/1'), 200); check('  stadium', r.json.stadium.includes('Ganapanes'));
        await expectStatus('GET /teams/999 -> 404', call('GET', '/teams/999'), 404);
        r = await expectStatus('GET /matches?status=upcoming', call('GET', '/matches?status=upcoming&teamId=1'), 200);
        check('  paginado {data,page,limit,total}', Array.isArray(r.json.data) && r.json.page === 1 && r.json.limit === 20 && r.json.total === 3);
        check('  upcoming ordenado por fecha asc', r.json.data[0].date < r.json.data[1].date);
        r = await call('GET', '/matches?status=played&teamId=1'); check('GET /matches?status=played ordenado desc', r.json.data[0].date > r.json.data[1].date && r.json.data.every((m) => m.result));
        await expectStatus('GET /matches?status=x -> 400', call('GET', '/matches?status=x'), 400);
        await expectStatus('GET /matches?limit=101 -> 400', call('GET', '/matches?limit=101'), 400);
        r = await call('GET', '/players?sort=-goals&limit=1'); check('GET /players top scorer = Capi', r.json.data[0].name === 'Capi' && r.json.total === 18);
        await expectStatus('GET /players?sort=password -> 400', call('GET', '/players?sort=password'), 400);
        r = await call('GET', "/players?position=goalkeeper"); check('GET /players?position=goalkeeper', r.json.total === 2);
        await expectStatus('GET /players/1', call('GET', '/players/1'), 200);
        await expectStatus('GET /players/abc -> 404', call('GET', '/players/abc'), 404);
        r = await call('GET', '/standings'); check('GET /standings (7 equipos, CUNEF 1º)', r.json.length === 7 && r.json[0].team === 'CUNEF FC' && r.json[0].points === 14, JSON.stringify(r.json[0]));
        r = await call('GET', '/news?page=1&limit=3'); check('GET /news paginado, más nuevas primero', r.json.data.length === 3 && r.json.data[0].createdAt > r.json.data[1].createdAt && r.json.total === 6);

        console.log('Auth y usuarios');
        await expectStatus('login sin password -> 400', call('POST', '/auth/login', { body: { email: 'a@b.es' } }), 400);
        await expectStatus('login incorrecto -> 401', call('POST', '/auth/login', { body: { email: 'admin@cunef.edu', password: 'nope-nope' } }), 401);
        r = await expectStatus('sign up -> 201 fan (role ignorado)', call('POST', '/users', { body: { name: 'Nuevo', email: 'nuevo@cunef.edu', password: 'password1', role: 'admin', playerId: 1 } }), 201);
        check('  es fan y no devuelve hash', r.json.role === 'fan' && !('password' in r.json) && !('password_hash' in r.json));
        await expectStatus('sign up email repetido -> 409', call('POST', '/users', { body: { name: 'X', email: 'NUEVO@cunef.edu', password: 'password1' } }), 409);
        await expectStatus('sign up password corta -> 400', call('POST', '/users', { body: { name: 'X', email: 'x@cunef.edu', password: '123' } }), 400);
        await expectStatus('sign up email inválido -> 400', call('POST', '/users', { body: { name: 'X', email: 'nope', password: 'password1' } }), 400);

        console.log('Players (PATCH)');
        await expectStatus('PATCH sin token -> 401', call('PATCH', '/players/1', { body: { stats: { goals: 1, assists: 1, appearances: 1 } } }), 401);
        await expectStatus('PATCH como player -> 403', call('PATCH', '/players/1', { token: capi, body: { stats: { goals: 1, assists: 1, appearances: 1 } } }), 403);
        await expectStatus('PATCH stats negativas -> 400', call('PATCH', '/players/1', { token: admin, body: { stats: { goals: -1, assists: 1, appearances: 1 } } }), 400);
        await expectStatus('PATCH sin stats -> 400', call('PATCH', '/players/1', { token: admin, body: {} }), 400);
        await expectStatus('PATCH teamId inexistente -> 404', call('PATCH', '/players/1', { token: admin, body: { stats: { goals: 0, assists: 0, appearances: 9 }, teamId: 99 } }), 404);
        await expectStatus('PATCH jugador inexistente -> 404', call('PATCH', '/players/99', { token: admin, body: { stats: { goals: 0, assists: 0, appearances: 9 } } }), 404);
        r = await expectStatus('PATCH admin ok', call('PATCH', '/players/13', { token: admin, body: { stats: { goals: 16, assists: 4, appearances: 11 } } }), 200);
        check('  stats actualizadas', r.json.stats.goals === 16);

        console.log('News');
        await expectStatus('POST news sin token -> 401', call('POST', '/news', { body: { title: 'a', information: 'b' } }), 401);
        await expectStatus('POST news como fan -> 403', call('POST', '/news', { token: fan, body: { title: 'a', information: 'b' } }), 403);
        await expectStatus('POST news título vacío -> 400', call('POST', '/news', { token: capi, body: { title: '', information: 'b' } }), 400);
        r = await expectStatus('POST news como player -> 201', call('POST', '/news', { token: capi, body: { title: 'Hola', information: 'Texto', author_id: 3 } }), 201);
        check('  autor = el del token (Capi)', r.json.author.name === 'Capi');

        console.log('Training sessions');
        r = await call('GET', '/training-sessions'); check('visitante solo ve públicas', r.json.data.length === 2 && r.json.data.every((s) => s.isPublic));
        r = await call('GET', '/training-sessions', { token: fan }); check('fan solo ve públicas', r.json.data.length === 2);
        r = await call('GET', '/training-sessions', { token: capi }); check('player ve todas (futuras)', r.json.data.length === 4);
        r = await call('GET', `/training-sessions?from=${t(-10)}&to=${t(0)}`, { token: admin }); check('from/to incluye la pasada', r.json.data.length === 1);
        await expectStatus('from inválido -> 400', call('GET', '/training-sessions?from=2026-13-45'), 400);
        await expectStatus('type inválido -> 400', call('GET', '/training-sessions?type=x'), 400);
        const body = { date: t(2), startTime: '18:00', location: 'Ganapanes', type: 'physical', notes: 'x', isPublic: false };
        await expectStatus('POST session como player -> 403', call('POST', '/training-sessions', { token: capi, body }), 403);
        await expectStatus('POST session fecha pasada -> 400', call('POST', '/training-sessions', { token: admin, body: { ...body, date: t(-1) } }), 400);
        await expectStatus('POST session hora mala -> 400', call('POST', '/training-sessions', { token: admin, body: { ...body, startTime: '25:00' } }), 400);
        await expectStatus('POST session type malo -> 400', call('POST', '/training-sessions', { token: admin, body: { ...body, type: 'yoga' } }), 400);
        await expectStatus('POST session isPublic no booleano -> 400', call('POST', '/training-sessions', { token: admin, body: { ...body, isPublic: 'si' } }), 400);
        r = await expectStatus('POST session admin -> 201', call('POST', '/training-sessions', { token: admin, body }), 201);
        const sid = r.json.id;
        r = await call('GET', `/attendances?sessionId=${sid}&limit=100`, { token: admin });
        check('  crea 18 asistencias pending para toda la plantilla', r.json.total === 18 && r.json.data.every((a) => a.status === 'pending'));
        await expectStatus('PATCH session vacío -> 400', call('PATCH', `/training-sessions/${sid}`, { token: admin, body: {} }), 400);
        r = await expectStatus('PATCH session ok', call('PATCH', `/training-sessions/${sid}`, { token: admin, body: { location: 'Gimnasio' } }), 200);
        check('  campo cambiado, resto intacto', r.json.location === 'Gimnasio' && r.json.type === 'physical');
        await expectStatus('PATCH session inexistente -> 404', call('PATCH', '/training-sessions/999', { token: admin, body: { location: 'x' } }), 404);

        console.log('Attendances');
        await expectStatus('GET attendances sin token -> 401', call('GET', '/attendances'), 401);
        await expectStatus('GET attendances fan -> 403', call('GET', '/attendances', { token: fan }), 403);
        r = await call('GET', `/attendances?sessionId=${sid}&playerId=1`, { token: capi });
        check('player siempre recibe solo las suyas (ignora ?playerId=)', r.json.total === 1 && r.json.data[0].playerName === 'Capi');
        const capiAtt = r.json.data[0].id;
        r = await call('GET', `/attendances?sessionId=${sid}&playerId=1`, { token: admin }); check('admin sí filtra por playerId', r.json.total === 1 && r.json.data[0].playerName === 'Antony');
        const otherAtt = r.json.data[0].id;
        await expectStatus('PATCH ajena como player -> 403', call('PATCH', `/attendances/${otherAtt}`, { token: capi, body: { status: 'confirmed' } }), 403);
        await expectStatus('PATCH injured como player -> 403', call('PATCH', `/attendances/${capiAtt}`, { token: capi, body: { status: 'injured' } }), 403);
        await expectStatus('PATCH status inválido -> 400', call('PATCH', `/attendances/${capiAtt}`, { token: capi, body: { status: 'maybe' } }), 400);
        await expectStatus('PATCH absent sin reason -> 400', call('PATCH', `/attendances/${capiAtt}`, { token: capi, body: { status: 'absent' } }), 400);
        await expectStatus('PATCH reason >300 -> 400', call('PATCH', `/attendances/${capiAtt}`, { token: capi, body: { status: 'absent', reason: 'x'.repeat(301) } }), 400);
        r = await expectStatus('PATCH absent con reason -> 200', call('PATCH', `/attendances/${capiAtt}`, { token: capi, body: { status: 'absent', reason: 'Examen' } }), 200);
        check('  guardado', r.json.status === 'absent' && r.json.reason === 'Examen');
        r = await expectStatus('PATCH confirmed -> 200 (limpia reason)', call('PATCH', `/attendances/${capiAtt}`, { token: capi, body: { status: 'confirmed', reason: 'ignorada' } }), 200);
        check('  reason vacío', r.json.reason === null);
        await expectStatus('PATCH admin puede marcar injured a otro', call('PATCH', `/attendances/${otherAtt}`, { token: admin, body: { status: 'injured' } }), 200);
        r = await call('GET', '/attendances?status=injured&limit=100', { token: admin }); check('GET attendances?status=injured', r.json.data.every((a) => a.status === 'injured') && r.json.total >= 2);
        // sesión ya empezada -> 409 para el jugador (la de hace 3 días)
        r = await call('GET', `/attendances?from=${t(-5)}&to=${t(-1)}`, { token: capi });
        await expectStatus('PATCH sesión ya empezada -> 409', call('PATCH', `/attendances/${r.json.data[0].id}`, { token: capi, body: { status: 'confirmed' } }), 409);
        await expectStatus('PATCH inexistente -> 404', call('PATCH', '/attendances/9999', { token: admin, body: { status: 'confirmed' } }), 404);
        await expectStatus('DELETE session como player -> 403', call('DELETE', `/training-sessions/${sid}`, { token: capi }), 403);
        await expectStatus('DELETE session admin -> 204', call('DELETE', `/training-sessions/${sid}`, { token: admin }), 204);
        r = await call('GET', `/attendances?sessionId=${sid}`, { token: admin }); check('  asistencias borradas en cascada', r.json.total === 0);
        await expectStatus('DELETE otra vez -> 404', call('DELETE', `/training-sessions/${sid}`, { token: admin }), 404);

        console.log('Call-ups');
        r = await call('GET', '/matches?status=upcoming&teamId=1'); const [m1, m2] = r.json.data;
        check('partido 1 con convocatoria publicada, partido 2 no', m1.callupPublished === true && m2.callupPublished === false);
        r = await expectStatus('GET callup publicada (visitante) -> 200', call('GET', `/matches/${m1.id}/callup`), 200);
        check('  11 titulares + 5 suplentes', r.json.filter((p) => p.role === 'starter').length === 11 && r.json.length === 16);
        await expectStatus('GET callup no publicada (visitante) -> 404', call('GET', `/matches/${m2.id}/callup`), 404);
        await expectStatus('GET callup no publicada (player) -> 404', call('GET', `/matches/${m2.id}/callup`, { token: capi }), 404);
        await expectStatus('GET callup no publicada (admin) -> 200', call('GET', `/matches/${m2.id}/callup`, { token: admin }), 200);
        await expectStatus('GET callup partido inexistente -> 404', call('GET', '/matches/999/callup'), 404);
        const ids = (...n) => n.map((playerId, i) => ({ playerId, role: i < 11 ? 'starter' : 'substitute' }));
        const good = ids(1, 3, 4, 5, 7, 8, 9, 12, 13, 14, 15, 2, 10, 11);   // 11 titulares + 3 suplentes (Hugo=6 fuera)
        await expectStatus('PUT callup como player -> 403', call('PUT', `/matches/${m2.id}/callup`, { token: capi, body: { players: good } }), 403);
        await expectStatus('PUT sin players -> 400', call('PUT', `/matches/${m2.id}/callup`, { token: admin, body: {} }), 400);
        await expectStatus('PUT 10 titulares -> 400', call('PUT', `/matches/${m2.id}/callup`, { token: admin, body: { players: good.slice(1) } }), 400);
        await expectStatus('PUT repetidos -> 400', call('PUT', `/matches/${m2.id}/callup`, { token: admin, body: { players: [...good, { playerId: 1, role: 'substitute' }] } }), 400);
        await expectStatus('PUT role inválido -> 400', call('PUT', `/matches/${m2.id}/callup`, { token: admin, body: { players: [...good.slice(0, 13), { playerId: 18, role: 'captain' }] } }), 400);
        await expectStatus('PUT >20 jugadores -> 400', call('PUT', `/matches/${m2.id}/callup`, { token: admin, body: { players: Array.from({ length: 21 }, (_, i) => ({ playerId: i + 1, role: i < 11 ? 'starter' : 'substitute' })) } }), 400);
        await expectStatus('PUT jugador inexistente -> 404', call('PUT', `/matches/${m2.id}/callup`, { token: admin, body: { players: [...good.slice(0, 13), { playerId: 999, role: 'substitute' }] } }), 404);
        const withInjured = good.map((p) => (p.playerId === 15 ? { playerId: 6, role: 'starter' } : p));   // 6 = Hugo lesionado
        await expectStatus('PUT lesionado titular -> 409', call('PUT', `/matches/${m2.id}/callup`, { token: admin, body: { players: withInjured } }), 409);
        const played = (await call('GET', '/matches?status=played&teamId=1')).json.data[0];
        await expectStatus('PUT partido ya jugado -> 409', call('PUT', `/matches/${played.id}/callup`, { token: admin, body: { players: good } }), 409);
        await expectStatus('PATCH publicar sin guardar (0 titulares) -> 409', call('PATCH', `/matches/${m2.id}`, { token: admin, body: { callupPublished: true } }), 409);
        await expectStatus('PATCH callupPublished no booleano -> 400', call('PATCH', `/matches/${m2.id}`, { token: admin, body: { callupPublished: 'yes' } }), 400);
        await expectStatus('PATCH publicar como player -> 403', call('PATCH', `/matches/${m2.id}`, { token: capi, body: { callupPublished: true } }), 403);
        r = await expectStatus('PUT callup válida (con lesionado de suplente) -> 200', call('PUT', `/matches/${m2.id}/callup`, { token: admin, body: { players: [...good, { playerId: 6, role: 'substitute' }] } }), 200);
        check('  guardada', r.json.length === 15);
        r = await expectStatus('PATCH publicar -> 200', call('PATCH', `/matches/${m2.id}`, { token: admin, body: { callupPublished: true } }), 200);
        check('  callupPublished = true', r.json.callupPublished === true);
        await expectStatus('GET callup ya pública (visitante) -> 200', call('GET', `/matches/${m2.id}/callup`), 200);

        console.log('Varios');
        await expectStatus('endpoint inexistente -> 404', call('GET', '/nope'), 404);
        const bad = await fetch(base + '/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
        check('JSON roto -> 400', bad.status === 400);
        const leak = await fetch(base.replace('/api', '') + '/src/app.js'); check('el servidor no expone el código (/src)', leak.status === 404);
        const html = await fetch(base.replace('/api', '') + '/index.html'); check('sirve index.html', html.status === 200);
    } catch (e) { failed++; console.error('ERROR', e); }

    console.log(`\n${passed} OK, ${failed} con fallos`);
    server.close();
    process.exit(failed ? 1 : 0);
});
