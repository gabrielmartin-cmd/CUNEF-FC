// smoke-test.js — "npm test". Arranca la app en un puerto libre y comprueba el contrato de la API
// (códigos de estado, Location, formato de errores, filtros, /stats...) con peticiones reales.
// Sin librerías: node:assert + fetch (Node 18+).
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';          // el logger no imprime durante los tests
const app = require('../src/app');

let base, adminToken, playerToken, passed = 0;
const failures = [];

async function call(method, path, { body, token, raw } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + path, { method, headers, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* HTML */ }
    return { status: res.status, headers: res.headers, json, text };
}

async function test(name, fn) {
    try { await fn(); passed++; console.log(`  ok  ${name}`); }
    catch (err) { failures.push(name); console.log(`  FAIL ${name}\n       ${err.message}`); }
}

const fields = (r) => r.json.errors.map((e) => e.field).sort();

const validPlayer = () => ({
    name: 'Lucas Test', shirtNumber: 31, position: 'midfielder', dob: '2006-04-10',
    height: 178, weight: 70, goals: 0, assists: 0, appearances: 0, injured: false, description: 'Smoke test player'
});

async function run() {
    console.log('\nAuth');
    await test('login admin -> token', async () => {
        const r = await call('POST', '/api/auth/login', { body: { email: 'admin@cunef.edu', password: 'cunef2026' } });
        assert.equal(r.status, 200); adminToken = r.json.token; assert.ok(adminToken);
    });
    await test('login player -> token', async () => {
        const r = await call('POST', '/api/auth/login', { body: { email: 'capi@cunef.edu', password: 'cunef2026' } });
        assert.equal(r.status, 200); playerToken = r.json.token;
    });
    await test('login with bad body -> 400 errors[]', async () => {
        const r = await call('POST', '/api/auth/login', { body: {} });
        assert.equal(r.status, 400); assert.deepEqual(fields(r), ['email', 'password']);
    });

    console.log('\nPlayers (main resource)');
    await test('GET /api/players -> 200 array', async () => {
        const r = await call('GET', '/api/players');
        assert.equal(r.status, 200); assert.ok(Array.isArray(r.json)); assert.equal(r.json.length, 18);
    });
    await test('search is case-insensitive', async () => {
        const r = await call('GET', '/api/players?search=CAP');
        assert.deepEqual(r.json.map((p) => p.name), ['Capi']);
    });
    await test('filters combine (position + injured)', async () => {
        const r = await call('GET', '/api/players?position=defender&injured=true');
        assert.deepEqual(r.json.map((p) => p.name), ['Hugo']);
    });
    await test('no match -> 200 []', async () => {
        const r = await call('GET', '/api/players?search=zzz');
        assert.equal(r.status, 200); assert.deepEqual(r.json, []);
    });
    await test('invalid filter values -> 400 errors[]', async () => {
        const r = await call('GET', '/api/players?position=striker&injured=maybe');
        assert.equal(r.status, 400); assert.deepEqual(fields(r), ['position']);   // se para en el primero
        const r2 = await call('GET', '/api/players?injured=maybe');
        assert.equal(r2.status, 400); assert.deepEqual(fields(r2), ['injured']);
    });
    await test('GET /api/players/stats -> computed summary', async () => {
        const r = await call('GET', '/api/players/stats');
        assert.equal(r.status, 200);
        assert.equal(r.json.total, 18); assert.equal(r.json.injured, 1); assert.equal(r.json.byPosition.goalkeeper, 2);
        assert.equal(r.json.leaders.goals.name, 'Capi');
    });
    await test('GET /api/players/999 -> 404, /abc -> 404', async () => {
        assert.equal((await call('GET', '/api/players/999')).status, 404);
        assert.equal((await call('GET', '/api/players/abc')).status, 404);
    });
    await test('POST without token -> 401, as player -> 403', async () => {
        assert.equal((await call('POST', '/api/players', { body: validPlayer() })).status, 401);
        assert.equal((await call('POST', '/api/players', { body: validPlayer(), token: playerToken })).status, 403);
    });
    await test('POST invalid -> 400 with ALL errors at once', async () => {
        const r = await call('POST', '/api/players', { token: adminToken, body: { name: '', shirtNumber: 150, position: 'striker', injured: 'yes' } });
        assert.equal(r.status, 400);
        for (const f of ['name', 'shirtNumber', 'position', 'injured', 'dob', 'height', 'weight', 'goals', 'assists', 'appearances'])
            assert.ok(fields(r).includes(f), `missing error for ${f}`);
    });
    await test('POST malformed JSON -> 400 errors[]', async () => {
        const r = await call('POST', '/api/players', { token: adminToken, raw: '{"name":', body: undefined });
        assert.equal(r.status, 400);
    });
    let newId;
    await test('POST valid -> 201 + Location; client id and unknown fields ignored', async () => {
        const r = await call('POST', '/api/players', { token: adminToken, body: { ...validPlayer(), id: 777, hacker: true } });
        assert.equal(r.status, 201);
        newId = r.json.id;
        assert.notEqual(newId, 777);
        assert.equal(r.headers.get('location'), `/api/players/${newId}`);
        assert.equal(r.json.hacker, undefined);
        assert.equal(r.json.teamId, 1);
    });
    await test('PUT replaces -> 200; invalid PUT -> 400; unknown id -> 404', async () => {
        const r = await call('PUT', `/api/players/${newId}`, { token: adminToken, body: { ...validPlayer(), goals: 3, injured: true } });
        assert.equal(r.status, 200); assert.equal(r.json.goals, 3); assert.equal(r.json.injured, true);
        assert.equal((await call('PUT', `/api/players/${newId}`, { token: adminToken, body: { name: 'x' } })).status, 400);
        assert.equal((await call('PUT', '/api/players/999', { token: adminToken, body: validPlayer() })).status, 404);
    });
    await test('DELETE -> 204, then GET -> 404', async () => {
        const r = await call('DELETE', `/api/players/${newId}`, { token: adminToken });
        assert.equal(r.status, 204); assert.equal(r.text, '');
        assert.equal((await call('GET', `/api/players/${newId}`)).status, 404);
    });

    console.log('\nOther resources: full CRUD');
    const cruds = [
        ['teams', { name: 'Test FC', stadium: 'Test Park', creationDate: '2020-01-01' }, { name: '' }],
        ['matches', { date: '2030-05-01T18:00', location: 'Campus', homeTeamId: 1, awayTeamId: 2, homeGoals: null, awayGoals: null, callupPublished: false }, { homeTeamId: 1, awayTeamId: 1 }],
        ['news', { title: 'Test news', information: 'Body text' }, { title: '' }],
        ['training-sessions', { date: '2030-05-02', startTime: '19:00', location: 'Ganapanes', type: 'tactical', notes: null, isPublic: true }, { type: 'yoga' }],
        ['attendances', null, { status: 'absent' }]
    ];
    for (const [res, valid, invalid] of cruds) {
        await test(`${res}: list, create, get, replace, delete, 400, 404`, async () => {
            let body = valid;
            if (res === 'attendances') {
                const s = await call('POST', '/api/training-sessions', { token: adminToken, body: cruds[3][1] });
                const p = await call('POST', '/api/players', { token: adminToken, body: { ...validPlayer(), teamId: 2 } });  // otro club: sin asistencia automática
                body = { sessionId: s.json.id, playerId: p.json.id, status: 'pending', reason: null };
            }
            const list = await call('GET', `/api/${res}`, { token: adminToken });
            assert.equal(list.status, 200); assert.ok(Array.isArray(list.json));
            const created = await call('POST', `/api/${res}`, { token: adminToken, body });
            assert.equal(created.status, 201, JSON.stringify(created.json));
            assert.equal(created.headers.get('location'), `/api/${res}/${created.json.id}`);
            const id = created.json.id;
            assert.equal((await call('GET', `/api/${res}/${id}`, { token: adminToken })).status, 200);
            const replaced = await call('PUT', `/api/${res}/${id}`, { token: adminToken, body });
            assert.equal(replaced.status, 200, JSON.stringify(replaced.json));
            const bad = await call('POST', `/api/${res}`, { token: adminToken, body: invalid });
            assert.equal(bad.status, 400); assert.ok(bad.json.errors.length >= 1);
            assert.equal((await call('DELETE', `/api/${res}/${id}`, { token: adminToken })).status, 204);
            assert.equal((await call('GET', `/api/${res}/${id}`, { token: adminToken })).status, 404);
        });
    }

    console.log('\nBusiness rules');
    await test('cannot delete CUNEF FC or a team with matches -> 409', async () => {
        assert.equal((await call('DELETE', '/api/teams/1', { token: adminToken })).status, 409);
        assert.equal((await call('DELETE', '/api/teams/2', { token: adminToken })).status, 409);
    });
    await test('player cannot edit somebody else news -> 403', async () => {
        const r = await call('PUT', '/api/news/2', { token: playerToken, body: { title: 'x', information: 'y' } });
        assert.equal(r.status, 403);
    });
    await test('invalid query on matches -> 400', async () => {
        assert.equal((await call('GET', '/api/matches?status=soon')).status, 400);
        assert.equal((await call('GET', '/api/matches?teamId=abc')).status, 400);
    });
    await test('visitor only sees public sessions', async () => {
        const r = await call('GET', '/api/training-sessions');
        assert.ok(r.json.every((s) => s.isPublic));
    });

    console.log('\nFallbacks');
    await test('unknown /api route -> JSON 404', async () => {
        const r = await call('GET', '/api/nope');
        assert.equal(r.status, 404); assert.ok(r.json.error);
    });
    await test('unknown page -> JSON 404', async () => {
        const r = await call('GET', '/nope.html');
        assert.equal(r.status, 404); assert.ok(r.json.error);
    });
    await test('static front end is served', async () => {
        const r = await call('GET', '/');
        assert.equal(r.status, 200); assert.match(r.text, /<html/i);
    });
}

const server = app.listen(0, async () => {
    base = `http://localhost:${server.address().port}`;
    const log = console.log;
    try {
        await run();
    } finally {
        server.close();
        console.log = log;
        console.log(`\n${passed} passed, ${failures.length} failed`);
        process.exitCode = failures.length ? 1 : 0;
    }
});
