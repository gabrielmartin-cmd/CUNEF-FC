// teamsController.js — lógica de los handlers de /teams y los datos de ejemplo.

// Datos de ejemplo fijos en memoria (todavía no hay base de datos).
const teams = [
  { id: 1, name: "CUNEF FC" },
  { id: 2, name: "Rival FC" },
];

// GET /teams: responde con el array completo en formato JSON (código 200 por defecto).
function listTeams(req, res) {
  res.json(teams);
}

// POST /teams: devuelve el body recibido con código 201 (Created).
// req.body solo tiene contenido porque express.json() lo ha parseado antes.
function createTeam(req, res) {
  res.status(201).json(req.body);
}

// Se exportan ambos handlers para usarlos en routes/teams.js.
module.exports = { listTeams, createTeam };
