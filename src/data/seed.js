// data.js — datos de ejemplo EN MEMORIA. De momento hacen el papel de la base de datos.
//
// Cada array es una "tabla" y cada objeto es una "fila". Los nombres de las propiedades
// (player_id, player_name, team_id...) son los mismos que tendrán las columnas de la futura BD,
// así el día que la añadamos solo cambian los archivos de src/models/ (los controladores no).
//
// IMPORTANTE: al estar en memoria, todo lo que se cambie desde la web (noticias nuevas, cuentas
// de fan, estadísticas...) se PIERDE al reiniciar el servidor. "npm start" usa node --watch,
// que reinicia el servidor cada vez que guardas un archivo: los datos vuelven a ser estos.
//
// Para cambiar los datos de ejemplo: edita estos arrays y guarda.
// Solo src/models/*.js debe leer o modificar estos arrays (nunca los controladores).

const bcrypt = require('bcryptjs');
const { OWN_TEAM_ID } = require('./config');
const { todayStr } = require('./utils');

const PASSWORD = 'cunef2026';   // SOLO desarrollo: contraseña de todos los usuarios de ejemplo

// Las fechas son relativas a hoy para que "próximos partidos" y "próximos entrenos" siempre tengan datos.
// dateStr(5) = dentro de 5 días ('YYYY-MM-DD') · dateStr(-3) = hace 3 días.
function dayOffset(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
const dateStr = (n) => todayStr(dayOffset(n));
const dateTime = (n, hhmm) => `${dateStr(n)}T${hhmm}`;
const isoUtc = (n, hh = 12) => { const d = dayOffset(n); d.setHours(hh, 0, 0, 0); return d.toISOString().replace(/\.\d+Z$/, 'Z'); };

// ---- teams (CUNEF FC debe ser el id OWN_TEAM_ID = 1)
const teams = [
    { team_id: 1, name: 'CUNEF FC', stadium: 'Campos de Fútbol Ganapanes', creation_date: '2025-06-01' },
    { team_id: 2, name: 'ICADE', stadium: 'Campus ICADE', creation_date: '2010-09-01' },
    { team_id: 3, name: 'Universidad Politécnica', stadium: 'Campus Universidad Politécnica', creation_date: '2008-09-01' },
    { team_id: 4, name: 'Universidad Francisco Victoria', stadium: 'Campus Francisco Victoria', creation_date: '2012-09-01' },
    { team_id: 5, name: 'Universidad de Comillas', stadium: 'Campus Comillas', creation_date: '2009-09-01' },
    { team_id: 6, name: 'ESIC', stadium: 'Campus ESIC', creation_date: '2011-09-01' },
    { team_id: 7, name: 'IE', stadium: 'Campus IE', creation_date: '2013-09-01' }
];

// ---- players (todos de CUNEF FC). position: goalkeeper | defender | fullback | midfielder | forward
//      status: available | injured · height en cm · weight en kg · dob = fecha de nacimiento
const p = (player_id, player_name, shirt_number, position, dob, height, weight, goals, assists, appearances, status, description) =>
    ({ player_id, player_name, shirt_number, position, dob, height, weight, goals, assists, appearances, status, description, team_id: OWN_TEAM_ID });
const players = [
    p(1, 'Antony', 1, 'goalkeeper', '2008-03-14', 186, 80, 0, 0, 9, 'available', 'An exceptional goalkeeper known for his shot-stopping ability and clutch performances.'),
    p(2, 'Rubén', 13, 'goalkeeper', '2006-07-02', 183, 77, 0, 0, 1, 'available', 'Reliable second goalkeeper with great command of the area.'),
    p(3, 'Dani', 2, 'defender', '2005-11-20', 184, 78, 0, 1, 10, 'available', 'Commanding centre-back who leads the defensive line.'),
    p(4, 'Álex', 3, 'fullback', '2006-01-09', 177, 70, 1, 3, 9, 'available', 'Left fullback with endless stamina.'),
    p(5, 'Marcos', 4, 'defender', '2005-05-30', 188, 83, 2, 0, 10, 'available', 'Aerial threat on both boxes.'),
    p(6, 'Hugo', 5, 'defender', '2006-09-12', 181, 74, 0, 0, 6, 'injured', 'Composed ball-playing defender.'),
    p(7, 'Nico', 6, 'midfielder', '2005-02-18', 176, 69, 2, 4, 10, 'available', 'Holding midfielder who breaks up play.'),
    p(8, 'Iván', 8, 'midfielder', '2006-04-25', 174, 68, 3, 5, 10, 'available', 'Box-to-box engine of the team.'),
    p(9, 'Sergio', 10, 'midfielder', '2005-08-07', 178, 71, 6, 7, 10, 'available', 'Creative playmaker with an eye for the final pass.'),
    p(10, 'Leo', 14, 'midfielder', '2006-12-01', 172, 66, 1, 2, 7, 'available', 'Energetic winger turned midfielder.'),
    p(11, 'Adri', 16, 'midfielder', '2007-06-16', 175, 67, 0, 1, 5, 'available', 'Promising academy midfielder.'),
    p(12, 'Gabo', 22, 'fullback', '2007-02-11', 179, 72, 3, 8, 10, 'available', 'A relentless fullback known for his speed and vision on the field.'),
    p(13, 'Capi', 9, 'forward', '2005-10-05', 181, 75, 15, 4, 10, 'available', "A talented forward and the team's captain, known for his leadership and goal-scoring ability."),
    p(14, 'Pau', 11, 'forward', '2006-03-22', 175, 69, 6, 3, 9, 'available', 'Quick forward who stretches defences.'),
    p(15, 'Bruno', 7, 'forward', '2005-07-19', 177, 70, 5, 5, 9, 'available', 'Left-footed winger with a great dribble.'),
    p(16, 'Raúl', 17, 'forward', '2007-01-28', 180, 73, 2, 1, 6, 'available', 'Strong target man off the bench.'),
    p(17, 'Mateo', 19, 'forward', '2007-05-03', 173, 65, 1, 2, 4, 'available', 'Young striker with a bright future.'),
    p(18, 'Jorge', 20, 'forward', '2006-11-14', 182, 76, 1, 0, 3, 'available', 'Physical forward, strong in the air.')
];

// ---- users: AQUÍ SE DECIDEN LOS ROLES (fan | player | admin).
// La API nunca deja elegir rol: el registro (POST /api/users) siempre crea un fan.
// Un player debe tener player_id (su ficha de jugador) para saber qué asistencias son suyas.
// La contraseña se guarda como hash bcrypt, nunca en claro.
const hash = bcrypt.hashSync(PASSWORD, 10);
const users = [
    { user_id: 1, name: 'Admin CUNEF FC', email: 'admin@cunef.edu', password_hash: hash, role: 'admin', player_id: null },
    { user_id: 2, name: 'Capi', email: 'capi@cunef.edu', password_hash: hash, role: 'player', player_id: 13 },
    { user_id: 3, name: 'Gabo', email: 'gabo@cunef.edu', password_hash: hash, role: 'player', player_id: 12 },
    { user_id: 4, name: 'Aficionado', email: 'fan@cunef.edu', password_hash: hash, role: 'fan', player_id: null }
];

// ---- matches. home_goals/away_goals = null -> partido aún no jugado ("upcoming").
// location = estadio del equipo local. match_date = 'YYYY-MM-DDTHH:MM' (hora local).
const m = (match_id, day, time, home_team_id, away_team_id, home_goals = null, away_goals = null, callup_published = 0) => ({
    match_id, home_team_id, away_team_id, match_date: dateTime(day, time),
    location: teams.find((t) => t.team_id === home_team_id).stadium,
    home_goals, away_goals, callup_published
});
const matches = [
    // jugados
    m(1, -56, '16:00', 1, 7, 4, 0), m(2, -56, '12:00', 2, 5, 2, 1),
    m(3, -49, '16:00', 4, 1, 2, 2), m(4, -49, '12:00', 3, 6, 1, 1),
    m(5, -42, '16:00', 1, 6, 3, 1), m(6, -42, '12:00', 7, 3, 0, 3),
    m(7, -35, '16:00', 1, 5, 2, 1), m(8, -35, '12:00', 2, 6, 3, 0),
    m(9, -28, '16:00', 3, 1, 1, 2), m(10, -28, '12:00', 4, 2, 1, 1),
    m(11, -21, '16:00', 1, 2, 1, 1), m(12, -21, '12:00', 6, 7, 2, 0),
    // próximos (el 13 es el próximo de CUNEF y ya tiene la convocatoria publicada)
    m(13, 5, '16:00', 1, 4, null, null, 1), m(14, 5, '12:00', 2, 6),
    m(15, 12, '18:30', 3, 1), m(16, 12, '12:00', 7, 5),
    m(17, 19, '15:00', 1, 5)
];

// ---- callups: convocatoria del partido 13 (11 titulares + 5 suplentes). role: starter | substitute
const starters = [1, 12, 3, 5, 4, 7, 8, 9, 13, 14, 15];   // Antony, Gabo, Dani, Marcos, Álex, Nico, Iván, Sergio, Capi, Pau, Bruno
const substitutes = [2, 10, 11, 16, 17];                   // Rubén, Leo, Adri, Raúl, Mateo
const callups = [
    ...starters.map((player_id) => ({ match_id: 13, player_id, role: 'starter' })),
    ...substitutes.map((player_id) => ({ match_id: 13, player_id, role: 'substitute' }))
].map((c, i) => ({ callup_id: i + 1, ...c }));

// ---- training_sessions. type: tactical | physical | recovery · is_public: 1 = la ven también visitantes y fans
const s = (session_id, day, start_time, location, type, notes, is_public) =>
    ({ session_id, session_date: dateStr(day), start_time, location, type, notes, is_public, created_by: 1 });
const trainingSessions = [
    s(1, -3, '19:00', 'Campos de Fútbol Ganapanes', 'recovery', 'Light jog, stretching and ice baths after the weekend.', 0),
    s(2, 1, '19:00', 'Campos de Fútbol Ganapanes', 'tactical', 'Pressing triggers and set pieces ahead of the next match.', 1),
    s(3, 3, '18:30', 'Gimnasio CUNEF', 'physical', 'Strength circuit + speed work. Bring gym clothes.', 0),
    s(4, 7, '19:00', 'Campos de Fútbol Ganapanes', 'tactical', 'Open session: build-up play against a low block.', 1),
    s(5, 10, '19:00', 'Campos de Fútbol Ganapanes', 'recovery', 'Recovery session the day before the away match.', 0)
];

// ---- attendances: una por jugador y sesión. status: pending | confirmed | absent | injured
// Se generan con un bucle (5 sesiones x 18 jugadores = 90 filas) en vez de escribirlas a mano.
const attendances = [];
for (const session of trainingSessions) {
    for (const player of players) {
        let status = 'pending', reason = null;
        if (session.session_id === 1) status = player.status === 'injured' ? 'injured' : 'confirmed';  // sesión pasada: ya resuelta
        if (session.session_id === 2) {                                                                // un poco de variedad en la próxima
            if (['Capi', 'Gabo', 'Sergio', 'Nico'].includes(player.player_name)) status = 'confirmed';
            if (player.player_name === 'Leo') { status = 'absent'; reason = 'Exam on Friday morning'; }
            if (player.player_name === 'Hugo') status = 'injured';
        }
        attendances.push({ attendance_id: attendances.length + 1, session_id: session.session_id, player_id: player.player_id, status, reason });
    }
}

// ---- news (autores = users con rol player). created_at en UTC: 'YYYY-MM-DDTHH:MM:SSZ'
const news = [
    { news_id: 1, title: 'Capi injury update', information: 'Our captain Capi suffered a minor muscle strain in the last match. Medical staff report he should be back to full training by next week.', author_id: 2, created_at: isoUtc(-14) },
    { news_id: 2, title: 'Outstanding performance vs Universidad Francisco Victoria', information: 'Antony delivered a goalkeeping masterclass with 8 crucial saves in our recent draw. Despite the result, the squad showed impressive defensive coordination.', author_id: 3, created_at: isoUtc(-12) },
    { news_id: 3, title: 'Team party after the victory', information: 'The squad celebrated the 3-1 victory against ESIC with a memorable team gathering in Madrid. Photos show the players in high spirits.', author_id: 2, created_at: isoUtc(-10) },
    { news_id: 4, title: 'Gabo’s surprise DJ set at university event', information: 'Fullback Gabo surprised everyone by spinning tracks at the CUNEF University cultural event last weekend. The crowd loved his mix!', author_id: 2, created_at: isoUtc(-7) },
    { news_id: 5, title: 'Capi graduates with honours', information: 'Team captain Capi completed his Business degree with distinction. His professors praised his dedication to both academics and athletics.', author_id: 3, created_at: isoUtc(-5) },
    { news_id: 6, title: 'Training this week: open session', information: 'Wednesday’s tactical session is open to everyone. Come and support the team at Campos de Fútbol Ganapanes!', author_id: 3, created_at: isoUtc(-1) }
];

module.exports = { teams, players, users, matches, callups, trainingSessions, attendances, news, PASSWORD };
