// config.js — configuración central de la app: TODOS los "ajustes" en un solo sitio.
// Cada valor se puede cambiar con una variable de entorno (process.env.X) sin tocar el código.
// Ejemplo en PowerShell:  $env:PORT = 4000; npm start
// Si la variable no existe se usa el valor por defecto que va detrás del ||.

// NODE_ENV=production indica que la app está publicada de verdad (no en tu ordenador).
const isProd = process.env.NODE_ENV === 'production';

// En producción NO dejamos arrancar con el secreto de ejemplo: cualquiera que lo conozca
// (está en GitHub) podría fabricar tokens falsos y hacerse pasar por admin.
if (isProd && !process.env.JWT_SECRET) {
    throw new Error('Define JWT_SECRET antes de arrancar en producción.');
}

module.exports = {
    PORT: Number(process.env.PORT) || 3000,
    // Clave secreta con la que el servidor FIRMA los tokens de sesión (ver middleware/auth.js).
    // Solo la conoce el servidor; por eso nadie puede modificar un token sin que se note.
    JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-change-me',
    // Cuánto dura una sesión: pasadas 8 horas el token deja de valer y hay que volver a hacer login.
    JWT_EXPIRES_IN: '8h',
    OWN_TEAM_ID: Number(process.env.OWN_TEAM_ID) || 1,   // "nuestro club" (Home, plantilla, convocatorias)
    isProd
};
