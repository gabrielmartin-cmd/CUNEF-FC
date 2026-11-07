// routes/teams.js — /api/teams. Leer es público; escribir, solo admin.
const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const c = require('../controllers/teamsController');

router.get('/', c.listTeams);
router.get('/:id', c.getTeam);
router.post('/', requireRole('admin'), c.createTeam);
router.put('/:id', requireRole('admin'), c.replaceTeam);
router.delete('/:id', requireRole('admin'), c.deleteTeam);

module.exports = router;
