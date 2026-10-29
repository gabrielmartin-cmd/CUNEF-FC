// Errores HTTP, paginación, ordenación y validadores reutilizables.

// Un Error normal de JavaScript + el código HTTP que hay que responder.
// En un controlador basta con:  throw notFound('Player not found');
// Express captura el throw y lo pasa al gestor de errores del final de app.js, que responde
// con res.status(err.status).json({ error: err.message }). Así no repetimos ese código en cada ruta.
// Códigos que usamos: 400 datos mal enviados · 401 no has hecho login · 403 tu rol no puede
// hacer eso · 404 no existe · 409 conflicto (p. ej. email ya registrado).
class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
const badRequest = (msg, details) => new HttpError(400, msg, details);
const notFound = (msg = 'Not found') => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

// ---- Fechas (hora local del servidor) ----
const pad = (n) => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function isValidDate(s) {                                   // YYYY-MM-DD real
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
const isValidTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

// ---- Números ----
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;

// Convierte "12" -> 12; devuelve null si no es un entero positivo (para :id y query ids)
function toId(v) {
    if (typeof v !== 'string' && typeof v !== 'number') return null;
    return /^\d+$/.test(String(v)) && Number(v) > 0 ? Number(v) : null;
}

// ---- Query params ----
// ?page=&limit=  (Tabla 5). Valores inválidos -> 400.
function parsePaging(query, { defLimit = 20, maxLimit = 100 } = {}) {
    let page = 1, limit = defLimit;
    if (query.page !== undefined) {
        if (!/^\d+$/.test(query.page) || Number(query.page) < 1) throw badRequest('page must be an integer ≥ 1');
        page = Number(query.page);
    }
    if (query.limit !== undefined) {
        if (!/^\d+$/.test(query.limit) || Number(query.limit) < 1 || Number(query.limit) > maxLimit)
            throw badRequest(`limit must be an integer between 1 and ${maxLimit}`);
        limit = Number(query.limit);
    }
    return { page, limit, offset: (page - 1) * limit };
}

// ?sort=-goals  -> { column: 'goals', dir: 'DESC' }. `allowed` es una lista blanca
// {nombreApi: columnaSQL}: nunca se concatena texto del cliente en el SQL.
function parseSort(raw, allowed, fallback) {
    const value = raw === undefined ? fallback : raw;
    if (typeof value !== 'string') throw badRequest('Invalid sort');
    const desc = value.startsWith('-');
    const key = desc ? value.slice(1) : value;
    if (!Object.prototype.hasOwnProperty.call(allowed, key))
        throw badRequest(`sort must be one of: ${Object.keys(allowed).join(', ')} (prefix with - for descending)`);
    return { column: allowed[key], dir: desc ? 'DESC' : 'ASC' };
}

function parseEnumQuery(value, allowed, name) {
    if (value === undefined) return null;
    if (!allowed.includes(value)) throw badRequest(`${name} must be one of: ${allowed.join(', ')}`);
    return value;
}

function parseDateQuery(value, name) {
    if (value === undefined) return null;
    if (!isValidDate(value)) throw badRequest(`${name} must be a valid date (YYYY-MM-DD)`);
    return value;
}

const paged = (data, { page, limit }, total) => ({ data, page, limit, total });

// ---- Body ----
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function requireBody(req) {
    if (!isPlainObject(req.body)) throw badRequest('A JSON body is required');
    return req.body;
}

// ---- Arrays en memoria (los usan src/models/ mientras no haya base de datos) ----

// Siguiente id libre de un array, como hace AUTOINCREMENT en una BD.  nextId(data.news, 'news_id')
const nextId = (rows, key) => rows.reduce((max, r) => Math.max(max, r[key]), 0) + 1;

// Comparador para array.sort() que imita "ORDER BY col1 DESC, col2 ASC" de SQL:
//   rows.sort(byColumns(['goals', 'DESC'], ['player_name', 'ASC']))
// null va primero en ASC (como en SQLite).
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
// Devuelve cuántas ha borrado.
function removeWhere(rows, predicate) {
    let removed = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
        if (predicate(rows[i])) { rows.splice(i, 1); removed++; }
    }
    return removed;
}

module.exports = {
    HttpError, badRequest, notFound, conflict,
    todayStr, isValidDate, isValidTime, isNonNegInt, toId,
    parsePaging, parseSort, parseEnumQuery, parseDateQuery, paged,
    isPlainObject, requireBody, pad,
    nextId, byColumns, removeWhere
};
