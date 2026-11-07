// usersController.js — POST /api/users: registro. Siempre crea un "fan" (nadie puede elegir su rol).
const bcrypt = require('bcryptjs');
const store = require('../data/store');
const { validateSignup } = require('../validators/userValidator');
const { conflict, validationError } = require('../utils');

function createUser(req, res) {
    const { valid, errors, data } = validateSignup(req.body);
    if (!valid) throw validationError(errors);
    if (store.users.findByEmail(data.email)) throw conflict('That email is already registered');

    const hash = bcrypt.hashSync(data.password, 10);       // nunca se guarda la contraseña en claro
    const id = store.users.createFan({ name: data.name, email: data.email, passwordHash: hash });

    res.status(201).json({ id, name: data.name, email: data.email, role: 'fan', playerId: null });
}

module.exports = { createUser };
