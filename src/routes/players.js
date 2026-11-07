// routes/players.js — router "fino": solo conecta cada URL con su permiso y su controlador.
// Montado en app.js como /api/players.  Leer es público; crear, cambiar y borrar es solo para el admin.
const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const c = require('../controllers/playersController');

router.get('/', c.listPlayers);                           // ?search=&position=&injured=&sort=&limit=
router.get('/stats', c.getStats);                         // ANTES de /:id, si no Express leería "stats" como un id
router.get('/:id', c.getPlayer);
router.post('/', requireRole('admin'), c.createPlayer);
router.put('/:id', requireRole('admin'), c.replacePlayer);
router.delete('/:id', requireRole('admin'), c.deletePlayer);

module.exports = router;
