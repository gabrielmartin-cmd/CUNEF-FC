// models/users.js — acceso a los datos de los usuarios (ver la explicación en models/teams.js).

const data = require('../data');
const { nextId } = require('../utils');

// SQL: SELECT * FROM users WHERE email = ?
// (en la BD la columna email será COLLATE NOCASE: no distingue mayúsculas; aquí lo imitamos con toLowerCase)
const findByEmail = (email) => data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

// Siempre crea un FAN: el rol no depende de nada que mande el cliente. Devuelve el id nuevo.
// SQL: INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'fan')
function createFan({ name, email, passwordHash }) {
    const user = { user_id: nextId(data.users, 'user_id'), name, email, password_hash: passwordHash, role: 'fan', player_id: null };
    data.users.push(user);
    return user.user_id;
}

module.exports = { findByEmail, createFan };
