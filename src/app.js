// app.js — construye la aplicación Express. NO arranca el servidor (eso lo hace server.js),
// así los tests pueden importar la app sin abrir un puerto.
//
// Orden (importa, Express los recorre de arriba abajo):
//   1. middleware (JSON, logger, cabeceras)
//   2. express.static -> la web de public/
//   3. routers de la API bajo /api/<recurso>
//   4. 404 en JSON para cualquier ruta que nadie haya atendido
//   5. gestor de errores, el ÚLTIMO

const path = require('path');
const express = require('express');
const logger = require('./middleware/logger');

const app = express();

// ---------- 1. Middleware ----------
// Parsea los cuerpos JSON y los deja en req.body. El límite evita bodies gigantes.
app.use(express.json({ limit: '50kb' }));
// Una línea por petición: "GET /api/players 200 3ms"
app.use(logger);
// Cabeceras de seguridad básicas en todas las respuestas.
app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
    next();
});

// CORS solo para desarrollo: deja que la web abierta con doble clic (origen "null", file://) o con
// Live Server (http://127.0.0.1:5500) pida datos a esta API. Desde http://localhost:3000 no hace falta.
app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin === 'null' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '')) {
        res.set({
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Expose-Headers': 'Location',
            Vary: 'Origin'
        });
        if (req.method === 'OPTIONS') return res.status(204).end();     // "preflight" del navegador
    }
    next();
});

// ---------- 2. Front end ----------
// Sirve public/ (index.html, css, js...) en http://localhost:3000. Va ANTES de la API porque es lo
// más pedido y no choca con ella: ningún archivo de public/ empieza por /api.
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- 3. API: un router por recurso ----------
app.use('/api/players', require('./routes/players'));            // recurso PRINCIPAL
app.use('/api/teams', require('./routes/teams'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/news', require('./routes/news'));
app.use('/api/training-sessions', require('./routes/trainingSessions'));
app.use('/api/attendances', require('./routes/attendances'));
// Extra (no son recursos con CRUD): clasificación calculada, login y registro.
app.use('/api/standings', require('./routes/standings'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// ---------- 4. 404 en JSON ----------
// Si ninguna ruta ni ningún archivo de public/ ha respondido, la ruta no existe.
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---------- 5. Gestor de errores (4 parámetros = Express sabe que es de errores) ----------
// Todos los throw de los controladores acaban aquí. Siempre responde JSON y NUNCA envía la traza.
app.use((err, req, res, next) => {
    // JSON mal escrito en el body (lo detecta express.json)
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ errors: [{ field: 'body', message: 'The body is not valid JSON' }] });
    }
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err.stack);          // la traza solo en el terminal del servidor
    if (status === 400 && Array.isArray(err.errors)) return res.status(400).json({ errors: err.errors });
    // En un 500 no se enseña el mensaje interno al cliente.
    res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : err.message });
});

module.exports = app;
