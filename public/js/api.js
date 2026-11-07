/* CUNEF FC · cliente de la API (se carga en TODAS las páginas antes del script de la página).
   Expone un único objeto global: window.CUNEF

   Por qué existe: antes los datos estaban escritos a mano en el HTML. Ahora el HTML es una
   "plantilla" y cada página pide los datos al servidor con fetch() y los pinta.
   Ejemplo (squad.js):  const res = await CUNEF.api.get('/api/players', { sort: '-goals' });
   Puedes ver esas peticiones en el navegador: F12 -> pestaña Red/Network.

   La función (function () { ... })() se ejecuta al momento y sirve para que las variables de
   dentro no se mezclen con las de otros scripts; solo sale fuera lo que metemos en window.CUNEF. */
(function () {
    'use strict';

    // Si abres el front desde el propio servidor (http://localhost:3000) las rutas son relativas.
    // Si lo abres con otro servidor (p. ej. Live Server en :5500) se apunta al backend en :3000.
    // También puedes forzarlo antes de cargar este script:  window.CUNEF_API_BASE = 'https://mi-api.com'
    const BASE = window.CUNEF_API_BASE ?? (location.port === '3000' ? '' : 'http://localhost:3000');
    const OWN_TEAM_ID = 1;                       // CUNEF FC (mismo valor que OWN_TEAM_ID del backend)
    const STORAGE_KEY = 'cunef.session';

    // ---------- Sesión (token + datos básicos del usuario) ----------
    // localStorage es lo más sencillo para clase. Ojo: un fallo XSS podría leer el token; por eso
    // TODO lo que viene de la API se escapa con esc() antes de pintarlo.
    // localStorage = pequeño almacén del navegador que no se borra al recargar ni al cerrar la pestaña.
    // Puedes verlo en F12 -> Aplicación/Application -> Local Storage -> clave "cunef.session".
    // Si no hay sesión guardada, el rol es 'visitor' (alguien que no ha hecho login).
    const store = {
        read() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } },
        write(v) { try { v ? localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) : localStorage.removeItem(STORAGE_KEY); } catch { /* modo privado */ } }
    };
    const auth = {
        get token() { return store.read()?.token ?? null; },
        get user() { return store.read()?.user ?? null; },
        get role() { return auth.user?.role ?? 'visitor'; },
        save(token, user) { store.write({ token, user }); },
        clear() { store.write(null); }
    };

    // ---------- fetch con manejo de errores ----------
    class ApiError extends Error {
        constructor(status, message) { super(message); this.status = status; }
    }

    // Función central: TODAS las peticiones al servidor pasan por aquí. Se encarga de:
    //   - añadir los ?parámetros a la URL,
    //   - convertir el body a JSON,
    //   - adjuntar el token (si hay sesión) para que el servidor sepa quién eres y qué rol tienes,
    //   - convertir las respuestas de error (4xx/5xx) en un ApiError con el mensaje del servidor.
    async function request(method, path, { query, body } = {}) {
        const url = new URL(BASE + path, location.href);
        for (const [k, v] of Object.entries(query || {})) {
            if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
        }
        const headers = {};
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const token = auth.token;
        // Esta cabecera es la que leen optionalAuth/requireAuth/requireRole en src/middleware/auth.js
        if (token) headers.Authorization = `Bearer ${token}`;

        let res;
        try {
            res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
        } catch {
            throw new ApiError(0, 'Cannot reach the server. Is the backend running? (npm start in the backend folder)');
        }
        if (res.status === 204) return null;

        let data = null;
        try { data = await res.json(); } catch { /* sin cuerpo */ }

        if (!res.ok) {
            // Token caducado o inválido: se borra y se repite la petición como visitante
            if (res.status === 401 && token && !path.startsWith('/api/auth/')) {
                auth.clear();
                refreshChrome();
                return request(method, path, { query, body });
            }
            throw new ApiError(res.status, data?.error || res.statusText || 'Request failed');
        }
        return data;
    }

    const api = {
        get: (path, query) => request('GET', path, { query }),
        post: (path, body) => request('POST', path, { body }),
        put: (path, body) => request('PUT', path, { body }),
        patch: (path, body) => request('PATCH', path, { body }),
        delete: (path) => request('DELETE', path)
    };

    // ---------- Utilidades de pintado ----------
    // Escapa texto antes de meterlo en innerHTML (evita XSS con datos de la API)
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM' -> Date en hora local (new Date('2026-10-29') sería UTC)
    function parseLocal(s) {
        const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || '');
        return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : new Date(NaN);
    }
    const formatDate = (s, opts = { year: 'numeric', month: 'long', day: 'numeric' }) => parseLocal(s).toLocaleDateString('en-US', opts);
    const formatTime = (s) => (/T(\d{2}:\d{2})/.exec(s || '') || [])[1] || s || '';
    const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
    const pad = (n) => String(n).padStart(2, '0');
    const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    function setStatus(el, message, kind) {
        if (!el) return;
        el.textContent = message || '';
        el.hidden = !message;
        el.classList.toggle('status--error', kind === 'error');
    }
    const errorMessage = (err) => (err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong');

    // ---------- Cabecera común: enlace Login/Logout y elementos según rol ----------
    // OJO: ocultar botones según el rol es solo comodidad. La seguridad real está en el servidor.
    // (Cualquiera puede abrir F12 y quitar el "hidden" o editar su localStorage para poner
    // role:"admin"; aun así el servidor le responderá 403, porque comprueba el token firmado.)
    // En el HTML se marca así:  <button data-roles="admin" hidden>New session</button>
    // -> ese botón solo se muestra si el rol actual está en la lista de data-roles.
    function refreshChrome() {
        const link = document.querySelector('.site-nav__link[href="login.html"], .site-nav__link[data-logout]');
        if (link) {
            const user = auth.user;
            if (user) {
                link.textContent = `Log out (${user.name})`;
                link.setAttribute('data-logout', '');
                link.setAttribute('href', '#');
            } else {
                link.textContent = 'Login';
                link.removeAttribute('data-logout');
                link.setAttribute('href', 'login.html');
            }
        }
        document.querySelectorAll('[data-roles]').forEach((el) => {
            el.hidden = !el.dataset.roles.split(/\s+/).includes(auth.role);
        });
    }

    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-logout]');
        if (!link) return;
        e.preventDefault();
        auth.clear();
        location.href = 'index.html';
    });

    window.CUNEF = { api, auth, ApiError, OWN_TEAM_ID, esc, parseLocal, formatDate, formatTime, capitalize, pad, toDateStr, setStatus, errorMessage, refreshChrome };
    document.addEventListener('DOMContentLoaded', refreshChrome);
})();
