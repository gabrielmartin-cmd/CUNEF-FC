// playersController.js — lógica de los handlers de /players y los datos de ejemplo.

// Datos de ejemplo fijos en memoria (todavía no hay base de datos).
// Cada jugador pertenece a un equipo mediante teamId.
const players = [
  { id: 1, name: "Player One", position: "Goalkeeper", number: 1, teamId: 1 },
  { id: 2, name: "Player Two", position: "Forward", number: 9, teamId: 1 },
];

// GET /players: responde con el array completo en formato JSON (código 200 por defecto).
function listPlayers(req, res) {
  res.json(players);
}

// POST /players: devuelve el body recibido con código 201 (Created).
// req.body solo tiene contenido porque express.json() lo ha parseado antes.
function createPlayer(req, res) {
  res.status(201).json(req.body);
}

// Se exportan ambos handlers para usarlos en routes/players.js.
module.exports = { listPlayers, createPlayer };
