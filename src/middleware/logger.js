// logger.js — middleware propio: una línea por petición, p. ej. "GET /api/players?search=ca 200 2ms".

function logger(req, res, next) {
    if (process.env.NODE_ENV === 'test') return next();      // npm test: sin ruido en la consola
    const start = Date.now();
    // 'finish' se dispara cuando la respuesta ya se ha enviado: así podemos mostrar el código de estado.
    res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    // Pasa el control al siguiente middleware/ruta. Sin next() la petición se quedaría colgada.
    next();
}

module.exports = logger;
