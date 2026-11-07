// routes/matches.js — /api/matches y su convocatoria. Leer es público; escribir, solo admin.
const router = require('express').Router();
const { optionalAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/matchesController');

router.get('/', c.listMatches);                           // ?status=upcoming|played&teamId=&sort=&limit=
router.get('/:id', c.getMatch);
router.post('/', requireRole('admin'), c.createMatch);
router.put('/:id', requireRole('admin'), c.replaceMatch);
router.delete('/:id', requireRole('admin'), c.deleteMatch);

// Convocatoria: optionalAuth porque el admin ve también la que aún no está publicada.
router.get('/:id/callup', optionalAuth, c.getCallup);
router.put('/:id/callup', requireRole('admin'), c.saveCallup);

module.exports = router;
