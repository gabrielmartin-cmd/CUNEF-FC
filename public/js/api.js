/* api.js — el ÚNICO archivo que llama a fetch(). Se carga en todas las páginas antes que ui.js y
   que el script de la página.

   Uso desde una página:
       const players = await apiRequest('GET', '/api/players?search=ca');
       const created = await apiRequest('POST', '/api/players', { name: 'Lucas', ... });
       await apiRequest('DELETE', '/api/players/7');

   - La página y la API viven en el mismo servidor (http://localhost:3000), así que las rutas son relativas.
   - Si hay sesión, añade el token en la cabecera Authorization (lo leen los middleware de src/middleware/auth.js).
   - fetch NO lanza error con un 404 o un 500: por eso miramos response.ok nosotros y, si falla,
     lanzamos un ApiError con el código, el mensaje y la lista de errores por campo (en los 400). */
'use strict';

const OWN_TEAM_ID = 1;                       // CUNEF FC (mismo valor que OWN_TEAM_ID del backend)
const SESSION_KEY = 'cunef.session';

// ---------- Sesión (token + datos básicos del usuario) en localStorage ----------
// Si no hay sesión guardada, el rol es 'visitor'.
const auth = {
    read() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } },
    get token() { return auth.read()?.token ?? null; },
    get user() { return auth.read()?.user ?? null; },
    get role() { return auth.user?.role ?? 'visitor'; },
    save(token, user) { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user })); } catch { /* modo privado */ } },
    clear() { try { localStorage.removeItem(SESSION_KEY); } catch { /* modo privado */ } }
};

class ApiError extends Error {
    constructor(status, message, errors = []) {
        super(message);
        this.status = status;
        this.errors = errors;                // [{ field, message }] cuando el servidor responde 400
    }
}

async function apiRequest(method, path, body) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

    let response;
    try {
        response = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
        // Aquí solo se llega si NO hay respuesta (servidor apagado, sin red...).
        throw new ApiError(0, 'Cannot reach the server. Is it running? (npm start)');
    }

    if (response.status === 204) return null;                  // DELETE correcto: sin cuerpo

    let data = null;
    try { data = await response.json(); } catch { /* respuesta sin JSON */ }

    if (!response.ok) {
        // Token caducado o inválido: cerramos la sesión para que la página se vea como visitante.
        if (response.status === 401 && auth.token && !path.startsWith('/api/auth/')) auth.clear();
        const errors = Array.isArray(data?.errors) ? data.errors : [];
        const message = data?.error || errors.map((e) => e.message).join('. ') || `Request failed (${response.status})`;
        throw new ApiError(response.status, message, errors);
    }
    return data;
}

// Monta "?a=1&b=2" ignorando los valores vacíos.  query({ search: 'ca', position: '' }) -> "?search=ca"
function query(params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
}
