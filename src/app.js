// app.js — construye la aplicación Express: registra los middleware, monta las
// rutas y el gestor de errores. NO arranca el servidor (eso lo hace server.js),
// así en labs posteriores podremos testear la app sin abrir un puerto.

const express = require("express");
// Nuestro middleware propio que imprime una línea "MÉTODO URL" por petición.
const logger = require("./middleware/logger");
// Router con todas las rutas de /tasks (GET y POST).
const tasksRouter = require("./routes/tasks");

// Crea la instancia de la aplicación Express.
const app = express();

// --- Middleware a nivel de aplicación (se ejecutan en orden, antes de las rutas) ---

// Parsea los cuerpos JSON de las peticiones y los deja en req.body.
// Sin esto, req.body sería undefined en POST /tasks.
app.use(express.json());
// Registra cada petición en consola. Va antes de las rutas para que vea todas.
app.use(logger);

// --- Rutas: app.METHOD(path, handler) ---

// Ruta raíz: describe la API y lista los endpoints disponibles.
app.get("/", (req, res) => {
  res.json({
    message: "CUNEF FC API",
    endpoints: ["/health", "/echo/:msg", "/tasks", "/boom"],
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

// Monta el router de tareas bajo el prefijo /tasks: el "/" del router
// pasa a ser "/tasks" en la app.
app.use("/tasks", tasksRouter);

// Ruta que falla a propósito para demostrar que el gestor de errores funciona.
// Express captura la excepción y la pasa al middleware de errores.
app.get("/boom", (req, res) => {
  throw new Error("Boom! Deliberate error to test the error handler");
});

// --- Gestor de errores centralizado ---
// Express lo reconoce como gestor de errores porque tiene 4 parámetros
// (err, req, res, next). Debe registrarse el ÚLTIMO, después de todas las rutas,
// para capturar los errores lanzados en cualquiera de ellas.
app.use((err, req, res, next) => {
  // Muestra la traza completa en el terminal para depurar.
  console.error(err.stack);
  // Responde con el código del error si lo trae, o 500 por defecto, en JSON.
  // El servidor no se cae: la petición termina con esta respuesta.
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// Exporta la app para que server.js (y futuros tests) puedan importarla.
module.exports = app;
