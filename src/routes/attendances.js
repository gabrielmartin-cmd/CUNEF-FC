// routes/attendances.js — /api/attendances. Hace falta login: un player ve y cambia las suyas; el admin, todas.
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/attendancesController');

router.get('/', requireAuth, c.listAttendances);          // ?sessionId=&playerId=&status=&from=&to=
router.get('/:id', requireAuth, c.getAttendance);
router.post('/', requireRole('admin'), c.createAttendance);
router.put('/:id', requireAuth, c.replaceAttendance);
router.delete('/:id', requireRole('admin'), c.deleteAttendance);

module.exports = router;
