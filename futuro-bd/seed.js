// Datos de ejemplo. Ejecutar:  npm run seed   (BORRA y recrea el contenido de la base de datos)
// Las fechas son relativas a hoy para que "próximos partidos" y "próximos entrenos" siempre tengan datos.
//
// Este es el sitio para EDITAR LOS DATOS INICIALES: cambia un nombre, un dorsal, añade un equipo
// o un usuario en los arrays de abajo, guarda y vuelve a ejecutar "npm run seed".
// Cuidado: el seed BORRA todo lo que se haya creado desde la web (noticias, cuentas de fan...).
// Para cambiar un dato suelto sin perder lo demás, usa la web/API o un visor de SQLite.
const bcrypt = require('bcryptjs');
const { db, transaction } = require('./db');
const { OWN_TEAM_ID } = require('./config');
const { todayStr, pad } = require('./utils');

const PASSWORD = 'cunef2026';   // SOLO desarrollo

function dayOffset(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
const dateStr = (n) => todayStr(dayOffset(n));
const dateTime = (n, hhmm) => `${dateStr(n)}T${hhmm}`;
const isoUtc = (n, hh = 12) => { const d = dayOffset(n); d.setHours(hh, 0, 0, 0); return d.toISOString().replace(/\.\d+Z$/, 'Z'); };

function seed() {
    transaction(() => {
        // Orden inverso a las dependencias (FK)
        for (const t of ['callups', 'attendances', 'news', 'training_sessions', 'users', 'matches', 'players', 'teams'])
            db.exec(`DELETE FROM ${t}`);
        db.exec(`DELETE FROM sqlite_sequence`);

        // ---- Teams (CUNEF FC debe ser id = OWN_TEAM_ID = 1)
        const teams = [
            ['CUNEF FC', 'Campos de Fútbol Ganapanes', '2025-06-01'],
            ['ICADE', 'Campus ICADE', '2010-09-01'],
            ['Universidad Politécnica', 'Campus Universidad Politécnica', '2008-09-01'],
            ['Universidad Francisco Victoria', 'Campus Francisco Victoria', '2012-09-01'],
            ['Universidad de Comillas', 'Campus Comillas', '2009-09-01'],
            ['ESIC', 'Campus ESIC', '2011-09-01'],
            ['IE', 'Campus IE', '2013-09-01']
        ];
        const insTeam = db.prepare('INSERT INTO teams (name, stadium, creation_date) VALUES (?, ?, ?)');
        for (const t of teams) insTeam.run(...t);
        const T = Object.fromEntries(teams.map((t, i) => [t[0], i + 1]));
        if (T['CUNEF FC'] !== OWN_TEAM_ID) throw new Error('CUNEF FC debe tener team_id = OWN_TEAM_ID');

        // ---- Players: [nombre, dorsal, posición, dob, altura, peso, goles, asist., partidos, estado, descripción]
        const players = [
            ['Antony', 1, 'goalkeeper', '2008-03-14', 186, 80, 0, 0, 9, 'available', 'An exceptional goalkeeper known for his shot-stopping ability and clutch performances.'],
            ['Rubén', 13, 'goalkeeper', '2006-07-02', 183, 77, 0, 0, 1, 'available', 'Reliable second goalkeeper with great command of the area.'],
            ['Dani', 2, 'defender', '2005-11-20', 184, 78, 0, 1, 10, 'available', 'Commanding centre-back who leads the defensive line.'],
            ['Álex', 3, 'fullback', '2006-01-09', 177, 70, 1, 3, 9, 'available', 'Left fullback with endless stamina.'],
            ['Marcos', 4, 'defender', '2005-05-30', 188, 83, 2, 0, 10, 'available', 'Aerial threat on both boxes.'],
            ['Hugo', 5, 'defender', '2006-09-12', 181, 74, 0, 0, 6, 'injured', 'Composed ball-playing defender.'],
            ['Nico', 6, 'midfielder', '2005-02-18', 176, 69, 2, 4, 10, 'available', 'Holding midfielder who breaks up play.'],
            ['Iván', 8, 'midfielder', '2006-04-25', 174, 68, 3, 5, 10, 'available', 'Box-to-box engine of the team.'],
            ['Sergio', 10, 'midfielder', '2005-08-07', 178, 71, 6, 7, 10, 'available', 'Creative playmaker with an eye for the final pass.'],
            ['Leo', 14, 'midfielder', '2006-12-01', 172, 66, 1, 2, 7, 'available', 'Energetic winger turned midfielder.'],
            ['Adri', 16, 'midfielder', '2007-06-16', 175, 67, 0, 1, 5, 'available', 'Promising academy midfielder.'],
            ['Gabo', 22, 'fullback', '2007-02-11', 179, 72, 3, 8, 10, 'available', 'A relentless fullback known for his speed and vision on the field.'],
            ['Capi', 9, 'forward', '2005-10-05', 181, 75, 15, 4, 10, 'available', "A talented forward and the team's captain, known for his leadership and goal-scoring ability."],
            ['Pau', 11, 'forward', '2006-03-22', 175, 69, 6, 3, 9, 'available', 'Quick forward who stretches defences.'],
            ['Bruno', 7, 'forward', '2005-07-19', 177, 70, 5, 5, 9, 'available', 'Left-footed winger with a great dribble.'],
            ['Raúl', 17, 'forward', '2007-01-28', 180, 73, 2, 1, 6, 'available', 'Strong target man off the bench.'],
            ['Mateo', 19, 'forward', '2007-05-03', 173, 65, 1, 2, 4, 'available', 'Young striker with a bright future.'],
            ['Jorge', 20, 'forward', '2006-11-14', 182, 76, 1, 0, 3, 'available', 'Physical forward, strong in the air.']
        ];
        const insPlayer = db.prepare(`INSERT INTO players
            (player_name, shirt_number, position, dob, height, weight, goals, assists, appearances, status, description, team_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const p of players) insPlayer.run(...p, OWN_TEAM_ID);
        const P = Object.fromEntries(players.map((p, i) => [p[0], i + 1]));

        // ---- Users (role y player_id solo se asignan aquí, "directamente en la BD", como dice el Word)
        // La API NO permite elegir rol: POST /api/users siempre crea un fan. Así nadie puede
        // registrarse como admin desde la web. Los admin y player se crean aquí.
        // Para añadir otro jugador con cuenta: insUser.run('Nombre', 'email@cunef.edu', hash, 'player', P.NombreJugador);
        // hashSync convierte 'cunef2026' en un hash bcrypt (el 10 es el "coste": cuánto tarda en calcularse).
        const hash = bcrypt.hashSync(PASSWORD, 10);
        const insUser = db.prepare('INSERT INTO users (name, email, password_hash, role, player_id) VALUES (?, ?, ?, ?, ?)');
        insUser.run('Admin CUNEF FC', 'admin@cunef.edu', hash, 'admin', null);
        insUser.run('Capi', 'capi@cunef.edu', hash, 'player', P.Capi);
        insUser.run('Gabo', 'gabo@cunef.edu', hash, 'player', P.Gabo);
        insUser.run('Aficionado', 'fan@cunef.edu', hash, 'fan', null);
        const U = { admin: 1, capi: 2, gabo: 3 };

        // ---- Matches
        const insMatch = db.prepare(
            'INSERT INTO matches (home_team_id, away_team_id, match_date, location, home_goals, away_goals) VALUES (?, ?, ?, ?, ?, ?)');
        const stadium = (name) => teams.find((t) => t[0] === name)[1];
        const played = [
            [-56, '16:00', 'CUNEF FC', 'IE', 4, 0], [-56, '12:00', 'ICADE', 'Universidad de Comillas', 2, 1],
            [-49, '16:00', 'Universidad Francisco Victoria', 'CUNEF FC', 2, 2], [-49, '12:00', 'Universidad Politécnica', 'ESIC', 1, 1],
            [-42, '16:00', 'CUNEF FC', 'ESIC', 3, 1], [-42, '12:00', 'IE', 'Universidad Politécnica', 0, 3],
            [-35, '16:00', 'CUNEF FC', 'Universidad de Comillas', 2, 1], [-35, '12:00', 'ICADE', 'ESIC', 3, 0],
            [-28, '16:00', 'Universidad Politécnica', 'CUNEF FC', 1, 2], [-28, '12:00', 'Universidad Francisco Victoria', 'ICADE', 1, 1],
            [-21, '16:00', 'CUNEF FC', 'ICADE', 1, 1], [-21, '12:00', 'ESIC', 'IE', 2, 0]
        ];
        for (const [d, t, h, a, hg, ag] of played) insMatch.run(T[h], T[a], dateTime(d, t), stadium(h), hg, ag);
        const upcoming = [
            [5, '16:00', 'CUNEF FC', 'Universidad Francisco Victoria'], [5, '12:00', 'ICADE', 'ESIC'],
            [12, '18:30', 'Universidad Politécnica', 'CUNEF FC'], [12, '12:00', 'IE', 'Universidad de Comillas'],
            [19, '15:00', 'CUNEF FC', 'Universidad de Comillas']
        ];
        for (const [d, t, h, a] of upcoming) insMatch.run(T[h], T[a], dateTime(d, t), stadium(h), null, null);
        // Primer partido próximo de CUNEF: convocatoria ya publicada
        const nextMatchId = db.prepare(`SELECT match_id FROM matches WHERE home_goals IS NULL AND home_team_id = ? ORDER BY match_date LIMIT 1`).get(OWN_TEAM_ID).match_id;
        const insCall = db.prepare('INSERT INTO callups (match_id, player_id, role) VALUES (?, ?, ?)');
        for (const n of ['Antony', 'Gabo', 'Dani', 'Marcos', 'Álex', 'Nico', 'Iván', 'Sergio', 'Capi', 'Pau', 'Bruno']) insCall.run(nextMatchId, P[n], 'starter');
        for (const n of ['Rubén', 'Leo', 'Adri', 'Raúl', 'Mateo']) insCall.run(nextMatchId, P[n], 'substitute');
        db.prepare('UPDATE matches SET callup_published = 1 WHERE match_id = ?').run(nextMatchId);

        // ---- Training sessions (+ asistencias "pending" para toda la plantilla)
        const insSes = db.prepare(`INSERT INTO training_sessions (session_date, start_time, location, type, notes, is_public, created_by)
                                   VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const sessions = [
            [-3, '19:00', 'Campos de Fútbol Ganapanes', 'recovery', 'Light jog, stretching and ice baths after the weekend.', 0],
            [1, '19:00', 'Campos de Fútbol Ganapanes', 'tactical', 'Pressing triggers and set pieces ahead of the next match.', 1],
            [3, '18:30', 'Gimnasio CUNEF', 'physical', 'Strength circuit + speed work. Bring gym clothes.', 0],
            [7, '19:00', 'Campos de Fútbol Ganapanes', 'tactical', 'Open session: build-up play against a low block.', 1],
            [10, '19:00', 'Campos de Fútbol Ganapanes', 'recovery', 'Recovery session the day before the away match.', 0]
        ];
        const insAtt = db.prepare(`INSERT INTO attendances (session_id, player_id, status, reason) VALUES (?, ?, ?, ?)`);
        sessions.forEach(([d, t, loc, type, notes, pub], i) => {
            const sid = Number(insSes.run(dateStr(d), t, loc, type, notes, pub, U.admin).lastInsertRowid);
            for (const p of players) {
                let st = 'pending', reason = null;
                if (d < 0) st = p[9] === 'injured' ? 'injured' : 'confirmed';        // sesión pasada: ya resuelta
                if (i === 1) {                                                        // un poco de variedad en la próxima
                    if (['Capi', 'Gabo', 'Sergio', 'Nico'].includes(p[0])) st = 'confirmed';
                    if (p[0] === 'Leo') { st = 'absent'; reason = 'Exam on Friday morning'; }
                    if (p[0] === 'Hugo') st = 'injured';
                }
                insAtt.run(sid, P[p[0]], st, reason);
            }
        });

        // ---- News (autores = users con rol player)
        const insNews = db.prepare('INSERT INTO news (title, information, author_id, created_at) VALUES (?, ?, ?, ?)');
        [
            ['Capi injury update', 'Our captain Capi suffered a minor muscle strain in the last match. Medical staff report he should be back to full training by next week.', U.capi, -14],
            ['Outstanding performance vs Universidad Francisco Victoria', 'Antony delivered a goalkeeping masterclass with 8 crucial saves in our recent draw. Despite the result, the squad showed impressive defensive coordination.', U.gabo, -12],
            ['Team party after the victory', 'The squad celebrated the 3-1 victory against ESIC with a memorable team gathering in Madrid. Photos show the players in high spirits.', U.capi, -10],
            ['Gabo’s surprise DJ set at university event', 'Fullback Gabo surprised everyone by spinning tracks at the CUNEF University cultural event last weekend. The crowd loved his mix!', U.capi, -7],
            ['Capi graduates with honours', 'Team captain Capi completed his Business degree with distinction. His professors praised his dedication to both academics and athletics.', U.gabo, -5],
            ['Training this week: open session', 'Wednesday’s tactical session is open to everyone. Come and support the team at Campos de Fútbol Ganapanes!', U.gabo, -1]
        ].forEach(([title, info, author, d]) => insNews.run(title, info, author, isoUtc(d)));
    });
}

module.exports = { seed, PASSWORD };

if (require.main === module) {
    seed();
    console.log('Base de datos recreada con datos de ejemplo.');
    console.log(`  admin@cunef.edu / ${PASSWORD}   (admin)`);
    console.log(`  capi@cunef.edu  / ${PASSWORD}   (player, Capi)`);
    console.log(`  gabo@cunef.edu  / ${PASSWORD}   (player, Gabo)`);
    console.log(`  fan@cunef.edu   / ${PASSWORD}   (fan)`);
}
