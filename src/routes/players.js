// routes/players.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).
//
// Recorrido de una petición, p. ej. PATCH /api/players/12 (editar estadísticas):
//   app.js  -> express.json() mete el JSON en req.body -> logger -> app.use('/api/players', este router)
//   aquí    -> requireRole('admin') (¿token válido? ¿es admin?) -> updatePlayer del controlador
//   controlador -> valida, pide al modelo (src/models/players.js) que guarde el cambio y responde con res.json(...)
// Si cualquier paso lanza un error, Express salta al gestor de errores del final de app.js.

const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const { listPlayers, getPlayer, updatePlayer } = require('../controllers/playersController');

// GET /api/players?position=&sort=-goals&page=&limit=
// Sin middleware de auth: es pública, cualquiera (incluso sin login) puede ver la plantilla.
router.get('/', listPlayers);

// GET /api/players/:id
router.get('/:id', getPlayer);

// PATCH /api/players/:id  body: { stats: {goals, assists, appearances}, teamId? }   (Admin)
// Entre la URL y el controlador hay un "portero": requireRole('admin').
// Sin token -> 401. Con token de fan o player -> 403. Solo con token de admin llega a updatePlayer.
router.patch('/:id', requireRole('admin'), updatePlayer);

module.exports = router;
