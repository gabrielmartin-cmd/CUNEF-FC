// routes/news.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).

const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const { listNews, createNews } = require('../controllers/newsController');

// GET /api/news?sort=-createdAt&page=&limit=   (público)
router.get('/', listNews);

// POST /api/news  body: { title, information }   (solo Player). El autor sale del token.
router.post('/', requireRole('player'), createNews);

module.exports = router;
