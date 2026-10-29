// routes/teams.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).

const router = require('express').Router();
const { getTeam } = require('../controllers/teamsController');

// GET /api/teams/:id  -> datos del club (Home)
router.get('/:id', getTeam);

module.exports = router;
