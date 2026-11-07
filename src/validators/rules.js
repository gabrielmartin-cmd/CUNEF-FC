// rules.js — piezas pequeñas que usan todos los validadores (escritas a mano, sin librerías).
//
// Cómo se usan (ver playerValidator.js):
//   const v = createValidator(body);
//   v.text('name', { max: 50 });            // si falla, apunta { field: 'name', message } en v.errors
//   v.int('height', { min: 140, max: 220 });
//   return v.result();                      // { valid, errors, data }
//
// - Cada regla comprueba UN campo y, si está bien, lo copia a `data`.
// - Nunca se para en el primer error: así la respuesta 400 trae TODOS los problemas a la vez.
// - `data` solo lleva los campos que hemos comprobado: los campos desconocidos y el `id`
//   que mande el cliente se quedan fuera (no se guardan nunca).
const { isValidDate, isValidTime, isValidDateTime } = require('../utils');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function createValidator(rawBody) {
    const errors = [];
    const data = {};
    const bodyOk = isPlainObject(rawBody);
    const body = bodyOk ? rawBody : {};
    if (!bodyOk) errors.push({ field: 'body', message: 'The request body must be a JSON object' });

    const fail = (field, message) => errors.push({ field, message });
    const missing = (v) => v === undefined || v === null || v === '';

    return {
        errors,
        data,
        body,
        fail,

        // Texto: obligatorio salvo { required: false }; se guarda sin espacios al principio/final.
        text(field, { max, min = 1, required = true } = {}) {
            const v = body[field];
            if (missing(v)) {
                if (required) fail(field, `${field} is required`);
                else data[field] = null;
                return;
            }
            if (typeof v !== 'string') return fail(field, `${field} must be a text`);
            const t = v.trim();
            if (t.length < min || t.length > max) return fail(field, `${field} must be between ${min} and ${max} characters`);
            data[field] = t;
        },

        // Entero con rango. { nullable: true } acepta null (p. ej. goles de un partido no jugado).
        int(field, { min, max, required = true, nullable = false } = {}) {
            const v = body[field];
            if (v === null && nullable) { data[field] = null; return; }
            if (v === undefined || v === null) {
                if (required) fail(field, `${field} is required`);
                return;
            }
            if (!Number.isInteger(v)) return fail(field, `${field} must be an integer`);
            if (v < min || v > max) return fail(field, `${field} must be between ${min} and ${max}`);
            data[field] = v;
        },

        // Booleano: true o false de verdad (ni "true" ni 1).
        bool(field, { required = true } = {}) {
            const v = body[field];
            if (v === undefined || v === null) {
                if (required) fail(field, `${field} is required`);
                else data[field] = false;
                return;
            }
            if (typeof v !== 'boolean') return fail(field, `${field} must be true or false`);
            data[field] = v;
        },

        // Conjunto cerrado: un valor de una lista fija.
        oneOf(field, allowed, { required = true } = {}) {
            const v = body[field];
            if (missing(v)) {
                if (required) fail(field, `${field} is required`);
                return;
            }
            if (!allowed.includes(v)) return fail(field, `${field} must be one of: ${allowed.join(', ')}`);
            data[field] = v;
        },

        date(field) {         // 'YYYY-MM-DD'
            const v = body[field];
            if (missing(v)) return fail(field, `${field} is required`);
            if (!isValidDate(v)) return fail(field, `${field} must be a valid date (YYYY-MM-DD)`);
            data[field] = v;
        },

        time(field) {         // 'HH:MM'
            const v = body[field];
            if (missing(v)) return fail(field, `${field} is required`);
            if (!isValidTime(v)) return fail(field, `${field} must be a time (HH:MM)`);
            data[field] = v;
        },

        dateTime(field) {     // 'YYYY-MM-DDTHH:MM'
            const v = body[field];
            if (missing(v)) return fail(field, `${field} is required`);
            if (!isValidDateTime(v)) return fail(field, `${field} must be a date and time (YYYY-MM-DDTHH:MM)`);
            data[field] = v;
        },

        // Id de otro recurso (p. ej. teamId). Aquí solo se mira el tipo; que exista lo comprueba el controlador.
        id(field, { required = true } = {}) {
            const v = body[field];
            if (v === undefined || v === null) {
                if (required) fail(field, `${field} is required`);
                return;
            }
            if (!Number.isInteger(v) || v < 1) return fail(field, `${field} must be a positive integer`);
            data[field] = v;
        },

        result() {
            return { valid: errors.length === 0, errors, data };
        }
    };
}

module.exports = { createValidator, isPlainObject };
