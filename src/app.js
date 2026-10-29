// app.js — construye la aplicación Express: registra los middleware, monta las
// rutas y el gestor de errores. NO arranca el servidor (eso lo hace server.js),
// así en labs posteriores podremos testear la app sin abrir un puerto.

const express = require("express");
const { FRONTEND_DIR } = require("./config");
// Nuestro middleware propio que imprime una línea "MÉTODO URL" por petición.
const logger = require("./middleware/logger");
// Router con todas las rutas de /tasks (GET y POST). (Lab de sesiones anteriores)
const tasksRouter = require("./routes/tasks");
// Routers de la API real: cada uno conecta URLs con su controlador, que pide los datos a src/models/.
const teamsRouter = require("./routes/teams");
const playersRouter = require("./routes/players");
const matchesRouter = require("./routes/matches");
const standingsRouter = require("./routes/standings");
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const newsRouter = require("./routes/news");
const trainingSessionsRouter = require("./routes/trainingSessions");
const attendancesRouter = require("./routes/attendances");

// Crea la instancia de la aplicación Express.
const app = express();

// --- Middleware a nivel de aplicación (se ejecutan en orden, antes de las rutas) ---

// Parsea los cuerpos JSON de las peticiones y los deja en req.body.
// El límite evita que alguien nos mande un body gigante.
app.use(express.json({ limit: "50kb" }));
// Registra cada petición en consola. Va antes de las rutas para que vea todas.
app.use(logger);

// Cabeceras de seguridad básicas en todas las respuestas.
app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin" });
  next();
});

// CORS solo para desarrollo local: permite abrir el front con otro servidor
// (p. ej. Live Server en :5500). Si el front se sirve desde aquí, no hace falta.
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      Vary: "Origin",
    });
    if (req.method === "OPTIONS") return res.status(204).end();
  }
  next();
});

// --- Rutas: app.METHOD(path, handler) ---

// Descripción de la API: lista los endpoints disponibles. (La raíz "/" sirve la web.)
app.get("/api", (req, res) => {
  res.json({
    message: "CUNEF FC API",
    endpoints: [
      "/health", "/echo/:msg", "/tasks",
      "/api/teams", "/api/players", "/api/matches", "/api/standings", "/api/auth/login",
      "/api/users", "/api/news", "/api/training-sessions", "/api/attendances",
    ],
  });
});

// Liveness check: permite comprobar que el servidor está vivo.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ":msg" es un parámetro de ruta: el segmento de la URL se lee en req.params.msg
// (p. ej. /echo/hola -> { "echo": "hola" }).
app.get("/echo/:msg", (req, res) => {
  res.json({ echo: req.params.msg });
});

// Monta cada router bajo su prefijo: el "/" del router pasa a ser "/api/entidad" en la app.
app.use("/tasks", tasksRouter);

app.use("/api/teams", teamsRouter);
app.use("/api/players", playersRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/standings", standingsRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/news", newsRouter);
app.use("/api/training-sessions", trainingSessionsRouter);
app.use("/api/attendances", attendancesRouter);

// Cualquier otra ruta /api/... no existe: 404 en JSON (en vez de la página HTML por defecto).
app.use("/api", (req, res, next) => {
  const err = new Error("Endpoint not found");
  err.status = 404;
  next(err);
});

// Ruta que falla a propósito para demostrar que el gestor de errores funciona.
// Express captura la excepción y la pasa al middleware de errores.
app.get("/boom", (req, res) => {
  throw new Error("Boom! Deliberate error to test the error handler");
});

// --- Front-end estático: sirve la carpeta frontend/ (index.html, css, js...) ---
// Va después de las rutas de la API. Así todo vive en http://localhost:3000.
app.use(express.static(FRONTEND_DIR, { index: "index.html", dotfiles: "ignore" }));

// --- Gestor de errores centralizado ---
// Express lo reconoce como gestor de errores porque tiene 4 parámetros
// (err, req, res, next). Debe registrarse el ÚLTIMO, después de todas las rutas,
// para capturar los errores lanzados en cualquiera de ellas.
app.use((err, req, res, next) => {
  // Solo mostramos la traza completa de los errores del servidor (5xx);
  // los 4xx (validaciones, permisos...) son "normales" y no ensucian el terminal.
  if (!err.status || err.status >= 500) console.error(err.stack);
  // JSON mal formado en el body: express.json() lanza un error con status 400.
  const status = err.status || 500;
  // Responde con el código del error si lo trae, o 500 por defecto, en JSON.
  // En un 500 no se enseña el mensaje interno al cliente.
  res.status(status).json({
    error: status >= 500 && !err.expose ? "Internal Server Error" : err.message,
    details: err.details,
  });
});

// Exporta la app para que server.js (y futuros tests) puedan importarla.
module.exports = app;
