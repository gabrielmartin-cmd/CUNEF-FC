// routes/auth.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).

const router = require('express').Router();
const { login } = require('../controllers/authController');

// POST /api/auth/login  body: { email, password }  -> 200 { token, user }
router.post('/login', login);

module.exports = router;
