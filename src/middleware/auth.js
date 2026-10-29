// Autenticación (JWT) y autorización por rol.
// El token lleva { userId, role, playerId }: los permisos se comprueban SIEMPRE
// contra el token, nunca contra lo que venga en el body (regla del Word).
//
// Dos palabras que se confunden:
//   AUTENTICACIÓN = ¿quién eres?          -> lo resuelve el token (401 si no hay o no vale).
//   AUTORIZACIÓN  = ¿puedes hacer esto?   -> lo resuelve el rol   (403 si tu rol no puede).
//
// ¿Qué es un JWT (JSON Web Token)? Un texto con 3 partes separadas por puntos:
//   cabecera . datos (payload) . firma
// Los datos se pueden LEER (no están cifrados), pero la firma se calcula con JWT_SECRET,
// que solo conoce el servidor. Si alguien cambia "role":"fan" por "role":"admin", la firma
// ya no cuadra y jwt.verify() lo rechaza. Por eso podemos fiarnos del rol que viene en el token.
//
// Flujo completo:
//   1. login correcto -> el servidor crea el token con signToken() y se lo devuelve al navegador.
//   2. el navegador lo guarda (localStorage, ver frontend/js/api.js) y lo manda en cada petición
//      en la cabecera:  Authorization: Bearer <token>
//   3. en las rutas protegidas, estos middleware leen esa cabecera, verifican el token y dejan
//      los datos del usuario en req.user para que el controlador los use.
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { HttpError } = require('../utils');

// Crea el token a partir de una fila de la tabla users. Solo metemos lo imprescindible
// (nunca la contraseña ni el hash: recuerda que el payload se puede leer).
function signToken(user) {
    return jwt.sign(
        { userId: user.user_id, role: user.role, playerId: user.player_id ?? null },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// Los tres middleware de abajo van de menos a más estricto. Se ponen en las rutas así:
//   router.get('/', optionalAuth, handler)              -> cualquiera; req.user puede ser null
//   router.get('/', requireAuth, handler)               -> hace falta login (cualquier rol)
//   router.patch('/:id', requireRole('admin'), handler) -> hace falta login Y ser admin

// Rutas públicas que cambian según quién llame: si hay token lo lee, si no, req.user = null.
// Ejemplo: GET /api/training-sessions enseña solo las públicas a visitantes/fans y todas a player/admin.
function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (!header) { req.user = null; return next(); }           // sin token: visitante
    const [scheme, token] = header.split(' ');                 // "Bearer abc.def.ghi" -> ["Bearer", "abc.def.ghi"]
    if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Invalid Authorization header'));
    try {
        // verify comprueba la firma y la caducidad; si algo falla, lanza un error.
        const p = jwt.verify(token, JWT_SECRET);
        req.user = { userId: p.userId, role: p.role, playerId: p.playerId ?? null };
        next();                                                // todo bien: sigue al siguiente middleware/controlador
    } catch {
        next(new HttpError(401, 'Invalid or expired token'));  // next(error) salta directo al gestor de errores
    }
}

// 401 si no hay sesión
// Reutiliza optionalAuth y, además, exige que haya usuario.
function requireAuth(req, res, next) {
    optionalAuth(req, res, (err) => {
        if (err) return next(err);
        if (!req.user) return next(new HttpError(401, 'Authentication required'));
        next();
    });
}

// 401 si no hay sesión, 403 si el rol no está permitido
// Es una función que DEVUELVE un middleware: requireRole('admin') o requireRole('player', 'admin').
// "...roles" recoge todos los argumentos en un array, p. ej. ['player', 'admin'].
const requireRole = (...roles) => (req, res, next) => {
    requireAuth(req, res, (err) => {
        if (err) return next(err);
        if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do this'));
        next();
    });
};

// Nota: el rol viaja DENTRO del token. Si cambias el rol de alguien en data.js, no se nota
// hasta que esa persona cierre sesión y vuelva a entrar (o caduque su token a las 8 h).
module.exports = { signToken, optionalAuth, requireAuth, requireRole };
