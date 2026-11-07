// userValidator.js — registro (POST /api/users) y login (POST /api/auth/login).
// No es uno de los 6 recursos con CRUD: solo da soporte al login.
const { createValidator } = require('./rules');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkEmail(v) {
    v.text('email', { max: 254 });
    if (v.data.email && !EMAIL_RE.test(v.data.email)) v.fail('email', 'email must be a valid email address');
}

function validateSignup(body) {
    const v = createValidator(body);
    v.text('name', { max: 100 });
    checkEmail(v);
    const pw = v.body.password;     // la contraseña NO se recorta con trim()
    if (typeof pw !== 'string' || pw.length < 8 || Buffer.byteLength(pw) > 72)
        v.fail('password', 'password is required (8 to 72 characters)');
    else v.data.password = pw;
    return v.result();
}

function validateLogin(body) {
    const v = createValidator(body);
    checkEmail(v);
    if (typeof v.body.password !== 'string' || v.body.password === '') v.fail('password', 'password is required');
    else v.data.password = v.body.password;
    return v.result();
}

module.exports = { validateSignup, validateLogin };
