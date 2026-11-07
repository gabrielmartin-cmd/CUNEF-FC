// store.js — la ÚNICA puerta de entrada a los datos para los controladores.
//
//   const store = require('../data/store');
//   store.players.findById(7);
//   store.players.create({ name: 'Lucas', ... });
//
// Hoy los datos viven en memoria (arrays de seed.js) y cada archivo de models/ sabe leerlos y
// modificarlos. Si mañana ponemos una base de datos (bonus: futuro-bd/), solo cambian los
// archivos de models/: este objeto mantiene los mismos nombres de funciones, así que los
// controladores, rutas y validadores no se tocan.
//
// Convención de todos los modelos:
//   list(filtros)     -> array de filas
//   findById(id)      -> fila o undefined
//   create(datos)     -> id nuevo          (datos = el `data` limpio que devuelve el validador)
//   replace(id, datos)-> nada (PUT: se sustituyen todos los campos)
//   remove(id)        -> true si existía, false si no

module.exports = {
    players: require('./models/players'),
    teams: require('./models/teams'),
    matches: require('./models/matches'),
    news: require('./models/news'),
    trainingSessions: require('./models/trainingSessions'),
    attendances: require('./models/attendances'),
    // No son recursos con CRUD: la clasificación se calcula con los partidos y users solo sirve para el login.
    standings: require('./models/standings'),
    users: require('./models/users')
};
