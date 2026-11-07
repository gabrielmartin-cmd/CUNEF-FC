// authController.js — POST /api/auth/login: comprueba email y contraseña y devuelve un token JWT.
const bcrypt = require('bcryptjs');
const store = require('../data/store');
const { signToken } = require('../middleware/auth');
const { validateLogin } = require('../validators/userValidator');
const { HttpError, validationError } = require('../utils');

// Si el email no existe comparamos igualmente contra un hash falso: así la respuesta tarda lo mismo
// y nadie puede averiguar qué emails están registrados midiendo el tiempo.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function login(req, res) {
    const { valid, errors, data } = validateLogin(req.body);
    if (!valid) throw validationError(errors);

    const user = store.users.findByEmail(data.email);
    const ok = bcrypt.compareSync(data.password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Incorrect email or password');

    res.json({
        token: signToken(user),
        user: { id: user.user_id, name: user.name, email: user.email, role: user.role, playerId: user.player_id }
    });
}

module.exports = { login };
