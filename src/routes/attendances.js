// routes/attendances.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { listAttendances, updateAttendance } = require('../controllers/attendancesController');

// GET /api/attendances?sessionId=&playerId=&status=&from=&to=&page=&limit=
// Mismo endpoint para player y admin: el servidor filtra por el playerId del token.
router.get('/', requireAuth, listAttendances);

// PATCH /api/attendances/:id   body: { status, reason }   (dueño o Admin)
router.patch('/:id', requireAuth, updateAttendance);

module.exports = router;
