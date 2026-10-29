// routes/trainingSessions.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).

const router = require('express').Router();
const { optionalAuth, requireRole } = require('../middleware/auth');
const { listSessions, createSession, updateSession, deleteSession } = require('../controllers/trainingSessionsController');

// GET /api/training-sessions?from=&to=&type=&sort=&page=&limit=
// Visitantes y fans: solo sesiones públicas. Player y Admin: todas.
router.get('/', optionalAuth, listSessions);

// POST /api/training-sessions   (Admin)
// Al crear la sesión se crea una asistencia "pending" para TODA la plantilla (misma transacción).
router.post('/', requireRole('admin'), createSession);

// PATCH /api/training-sessions/:id   (Admin)
router.patch('/:id', requireRole('admin'), updateSession);

// DELETE /api/training-sessions/:id   (Admin) -> 204. Sus asistencias se borran en cascada.
router.delete('/:id', requireRole('admin'), deleteSession);

module.exports = router;
