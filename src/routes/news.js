// routes/news.js — /api/news. Leer es público; publicar, players y admin.
// Editar/borrar: también players y admin, y el controlador comprueba que seas el autor (o admin).
const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const c = require('../controllers/newsController');

router.get('/', c.listNews);
router.get('/:id', c.getNews);
router.post('/', requireRole('player', 'admin'), c.createNews);
router.put('/:id', requireRole('player', 'admin'), c.replaceNews);
router.delete('/:id', requireRole('player', 'admin'), c.deleteNews);

module.exports = router;
