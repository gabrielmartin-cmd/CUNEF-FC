// routes/trainingSessions.js — /api/training-sessions.
// optionalAuth en las lecturas: visitantes y fans ven solo las públicas; players y admin, todas.
const router = require('express').Router();
const { optionalAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/trainingSessionsController');

router.get('/', optionalAuth, c.listSessions);            // ?from=&to=&type=&sort=&limit=
router.get('/:id', optionalAuth, c.getSession);
router.post('/', requireRole('admin'), c.createSession);
router.put('/:id', requireRole('admin'), c.replaceSession);
router.delete('/:id', requireRole('admin'), c.deleteSession);

module.exports = router;
