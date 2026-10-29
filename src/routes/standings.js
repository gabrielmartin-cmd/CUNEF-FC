// routes/standings.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).

const router = require('express').Router();
const { listStandings } = require('../controllers/standingsController');

// GET /api/standings -> clasificación calculada a partir de los partidos jugados (3-1-0)
router.get('/', listStandings);

module.exports = router;
