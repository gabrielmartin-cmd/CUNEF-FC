// usersController.js — lógica de los handlers de Registro de usuarios (siempre crea un fan).
// Las rutas (routes/users.js) solo conectan URL + middleware con estas funciones.

const bcrypt = require('bcryptjs');
const Users = require('../models/users');
const { badRequest, conflict, requireBody } = require('../utils');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/users  body: { name, email, password }  -> 201 { user }
// Siempre crea un FAN. Si el cliente envía "role" (o playerId) se ignora.
// Fíjate: solo sacamos name, email y password del body. Aunque alguien mande
// { "role": "admin" } desde Postman, ese campo no se lee nunca -> no hay forma de "auto-ascenderse".
function createUser(req, res) {
    const { name, email, password } = requireBody(req);

    // Validaciones (Tabla 4): si algo no cuadra, throw -> el gestor de errores responde 400.
    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100)
        throw badRequest('name is required (1 to 100 characters)');
    if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim()))
        throw badRequest('A valid email is required');
    // bcrypt solo usa los primeros 72 bytes; limitamos para que no haya sorpresas
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72)
        throw badRequest('password is required (minimum 8 characters, maximum 72 bytes)');

    const cleanEmail = email.trim();
    // 409 Conflict si el email ya existe.
    if (Users.findByEmail(cleanEmail)) throw conflict('That email is already registered');

    // Guardamos el HASH, nunca la contraseña. Si alguien roba los datos no puede leer las contraseñas.
    const hash = bcrypt.hashSync(password, 10);
    // createFan pone el rol 'fan' a fuego: no depende de nada que mande el cliente.
    const id = Users.createFan({ name: name.trim(), email: cleanEmail, passwordHash: hash });

    // Nunca se devuelve el hash
    // 201 Created = se ha creado algo nuevo. id es el que le ha asignado el modelo.
    res.status(201).json({ id, name: name.trim(), email: cleanEmail, role: 'fan', playerId: null });
}

module.exports = { createUser };
