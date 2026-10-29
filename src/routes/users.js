// routes/users.js — router "fino": solo conecta rutas con funciones del controlador.
// Aquí también se declara quién puede llamar a cada ruta (middleware de autenticación/rol).

const router = require('express').Router();
const { createUser } = require('../controllers/usersController');

// POST /api/users  body: { name, email, password }  -> 201 { user }
// Siempre crea un FAN. Si el cliente envía "role" (o playerId) se ignora.
router.post('/', createUser);

module.exports = router;
