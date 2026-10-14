// server.js — punto de entrada: importa la app ya configurada y la pone a escuchar.
// Es el archivo que ejecuta "npm start".

const app = require("./app");

// Puerto: usa la variable de entorno PORT si existe; si no, 3000 por defecto.
const PORT = process.env.PORT || 3000;

// Abre el puerto y empieza a aceptar peticiones HTTP. El callback se ejecuta
// una vez el servidor está escuchando y muestra la URL en el terminal.
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
