// authController.js — lógica de los handlers de Inicio de sesión (JWT).
// Las rutas (routes/auth.js) solo conectan URL + middleware con estas funciones.

const bcrypt = require('bcryptjs');
const Users = require('../models/users');
const { signToken } = require('../middleware/auth');
const { badRequest, HttpError, requireBody } = require('../utils');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Hash falso para gastar el mismo tiempo cuando el email no existe (evita adivinar emails por timing)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// POST /api/auth/login  body: { email, password }  -> 200 { token, user }
function login(req, res) {
    // 1. Validar lo que llega. Nunca te fíes del cliente: puede mandar cualquier cosa.
    const { email, password } = requireBody(req);
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) throw badRequest('A valid email is required');
    if (typeof password !== 'string' || password === '') throw badRequest('Password is required');

    // 2. Buscar al usuario por email. Devuelve el usuario o undefined si no existe.
    const user = Users.findByEmail(email.trim());
    // 3. Comprobar la contraseña. No se "descifra" el hash (es imposible): bcrypt calcula el hash
    //    de la contraseña recibida y lo compara con el guardado.
    const ok = bcrypt.compareSync(password, user ? user.password_hash : DUMMY_HASH);
    // Mismo mensaje si falla el email o la contraseña: así no damos pistas a un atacante.
    if (!user || !ok) throw new HttpError(401, 'Incorrect email or password');

    // 4. Login correcto: devolvemos el token (la "pulsera" que demuestra quién eres y tu rol)
    //    y los datos básicos del usuario para que el front pueda pintar su nombre y rol.
    res.json({
        token: signToken(user),
        user: { id: user.user_id, name: user.name, email: user.email, role: user.role, playerId: user.player_id }
    });
}

module.exports = { login };
