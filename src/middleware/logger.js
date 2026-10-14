// logger.js — middleware propio que registra cada petición recibida.

// Todo middleware recibe (req, res, next).
function logger(req, res, next) {
  // Imprime una línea por petición con el método HTTP y la URL, p. ej. "GET /tasks".
  console.log(`${req.method} ${req.url}`);
  // Pasa el control al siguiente middleware/ruta. Sin next() la petición
  // se quedaría colgada y el cliente nunca recibiría respuesta.
  next();
}

// Se exporta para registrarlo en app.js con app.use(logger).
module.exports = logger;
