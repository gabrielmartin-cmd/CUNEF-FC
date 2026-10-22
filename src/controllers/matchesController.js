// matchesController.js — lógica de los handlers de /matches y los datos de ejemplo.

// Datos de ejemplo fijos en memoria (todavía no hay base de datos).
// Cada partido referencia a los equipos local y visitante por su id.
const matches = [
  { id: 1, homeTeamId: 1, awayTeamId: 2, date: "2026-10-18", homeGoals: null, awayGoals: null },
];

// GET /matches: responde con el array completo en formato JSON (código 200 por defecto).
function listMatches(req, res) {
  res.json(matches);
}

// POST /matches: devuelve el body recibido con código 201 (Created).
// req.body solo tiene contenido porque express.json() lo ha parseado antes.
function createMatch(req, res) {
  res.status(201).json(req.body);
}

// Se exportan ambos handlers para usarlos en routes/matches.js.
module.exports = { listMatches, createMatch };
