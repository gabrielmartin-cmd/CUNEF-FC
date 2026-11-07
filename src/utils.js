// utils.js — errores HTTP, lectura de query params y pequeñas utilidades para los arrays en memoria.

// ---------- Errores HTTP ----------
// Un Error normal de JavaScript + el código HTTP que hay que responder.
// En un controlador basta con:  throw notFound('Player not found');
// Express 5 captura el throw y lo pasa al gestor de errores del final de app.js.
//
// Dos formas de respuesta (las monta el gestor de errores):
//   400 (datos mal enviados)  -> { errors: [ { field, message }, ... ] }   TODOS los problemas a la vez
//   401 / 403 / 404 / 409     -> { error: "mensaje" }
class HttpError extends Error {
    constructor(status, message, errors) {
        super(message);
        this.status = status;
        this.errors = errors;        // solo en los 400: array [{ field, message }]
    }
}

// 400 con la lista completa de errores que devuelve un validador.
const validationError = (errors) => new HttpError(400, 'Validation failed', errors);
// 400 con un único error (atajo para query params y reglas sueltas).
const badRequest = (field, message) => validationError([{ field, message }]);
const notFound = (msg = 'Not found') => new HttpError(404, msg);
const forbidden = (msg = 'You do not have permission to do this') => new HttpError(403, msg);
const conflict = (msg) => new HttpError(409, msg);

// ---------- Fechas (hora local del servidor) ----------
const pad = (n) => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nowStr = (d = new Date()) => `${todayStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// 'YYYY-MM-DD' que exista de verdad (rechaza 2026-02-31)
function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
const isValidTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
// 'YYYY-MM-DDTHH:MM'
const isValidDateTime = (s) => typeof s === 'string' && s.length === 16 && s[10] === 'T'
    && isValidDate(s.slice(0, 10)) && isValidTime(s.slice(11));

// Convierte "12" -> 12; devuelve null si no es un entero positivo (para :id y query ids)
function toId(v) {
    if (typeof v !== 'string' && typeof v !== 'number') return null;
    return /^\d+$/.test(String(v)) && Number(v) > 0 ? Number(v) : null;
}

// ---------- Query params ----------
// Todos devuelven null si el parámetro no viene, y lanzan 400 { errors: [...] } si viene mal.
// Los parámetros que no conocemos se ignoran (ver "Design decisions" en el README).

function parseEnumQuery(value, allowed, name) {
    if (value === undefined) return null;
    if (!allowed.includes(value)) throw badRequest(name, `${name} must be one of: ${allowed.join(', ')}`);
    return value;
}

// ?injured=true / ?injured=false  (cualquier otra cosa -> 400)
function parseBoolQuery(value, name) {
    if (value === undefined) return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw badRequest(name, `${name} must be true or false`);
}

function parseDateQuery(value, name) {
    if (value === undefined) return null;
    if (!isValidDate(value)) throw badRequest(name, `${name} must be a valid date (YYYY-MM-DD)`);
    return value;
}

function parseIdQuery(value, name) {
    if (value === undefined) return null;
    const id = toId(value);
    if (!id) throw badRequest(name, `${name} must be a positive integer`);
    return id;
}

// ?search=texto  (máximo 50 caracteres; vacío = sin búsqueda)
function parseSearchQuery(value) {
    if (value === undefined || value === '') return null;
    if (typeof value !== 'string' || value.length > 50) throw badRequest('search', 'search must be a text of at most 50 characters');
    return value.trim().toLowerCase();
}

// ?limit=N  (opcional: si no viene, se devuelven todos)
function parseLimitQuery(value, max = 100) {
    if (value === undefined) return null;
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
        throw badRequest('limit', `limit must be an integer between 1 and ${max}`);
    return Number(value);
}

// ?sort=-goals  -> { column: 'goals', dir: 'DESC' }. `allowed` es una lista blanca
// {nombreApi: columna}: nunca usamos directamente el texto que manda el cliente.
function parseSort(raw, allowed, fallback) {
    const value = raw === undefined ? fallback : raw;
    if (typeof value !== 'string') throw badRequest('sort', 'Invalid sort');
    const desc = value.startsWith('-');
    const key = desc ? value.slice(1) : value;
    if (!Object.prototype.hasOwnProperty.call(allowed, key))
        throw badRequest('sort', `sort must be one of: ${Object.keys(allowed).join(', ')} (prefix with - for descending)`);
    return { column: allowed[key], dir: desc ? 'DESC' : 'ASC' };
}

// ---------- Arrays en memoria (los usan src/data/models/ mientras no haya base de datos) ----------

// Siguiente id libre de un array, como hace AUTOINCREMENT en una BD.  nextId(data.news, 'news_id')
const nextId = (rows, key) => rows.reduce((max, r) => Math.max(max, r[key]), 0) + 1;

// Comparador para array.sort() que imita "ORDER BY col1 DESC, col2 ASC" de SQL:
//   rows.sort(byColumns(['goals', 'DESC'], ['player_name', 'ASC']))
function byColumns(...specs) {
    return (a, b) => {
        for (const [col, dir] of specs) {
            const x = a[col], y = b[col];
            if (x === y) continue;
            const cmp = x == null ? -1 : y == null ? 1 : x < y ? -1 : 1;
            return dir === 'DESC' ? -cmp : cmp;
        }
        return 0;
    };
}

// Borra del array (sin crear uno nuevo) las filas que cumplan la condición. Equivale a DELETE ... WHERE.
function removeWhere(rows, predicate) {
    let removed = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
        if (predicate(rows[i])) { rows.splice(i, 1); removed++; }
    }
    return removed;
}

module.exports = {
    HttpError, validationError, badRequest, notFound, forbidden, conflict,
    pad, todayStr, nowStr, isValidDate, isValidTime, isValidDateTime, toId,
    parseEnumQuery, parseBoolQuery, parseDateQuery, parseIdQuery, parseSearchQuery, parseLimitQuery, parseSort,
    nextId, byColumns, removeWhere
};
