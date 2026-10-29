// routes/matches.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).

const router = require('express').Router();
const { optionalAuth, requireRole } = require('../middleware/auth');
const { listMatches, getCallup, saveCallup, updateMatch } = require('../controllers/matchesController');

// GET /api/matches?status=upcoming|played&teamId=&sort=&page=&limit=   (público)
// teamId es un extra útil: "solo los partidos de mi club" (Home/Season).
router.get('/', listMatches);

// GET /api/matches/:id/callup
// Visitantes/fans/players: 404 hasta que se publique. Admin: siempre.
router.get('/:id/callup', optionalAuth, getCallup);

// PUT /api/matches/:id/callup   body: { players: [{ playerId, role }] }   (Admin)
// Sustituye la lista ENTERA (por eso PUT y no PATCH).
router.put('/:id/callup', requireRole('admin'), saveCallup);

// PATCH /api/matches/:id   body: { callupPublished: true|false }   (Admin)
router.patch('/:id', requireRole('admin'), updateMatch);

module.exports = router;
