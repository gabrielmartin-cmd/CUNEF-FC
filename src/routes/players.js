// routes/players.js — router "fino": solo conecta rutas con funciones del
// controlador. No contiene lógica ni toca los datos directamente.

const express = require("express");
// Importa los handlers desde el controlador.
const { listPlayers, createPlayer } = require("../controllers/playersController");

// Crea un mini-router independiente que luego se monta en app.js bajo /players.
const router = express.Router();

// GET /players -> devuelve la lista.
router.get("/", listPlayers);
// POST /players -> crea (de momento, devuelve) el elemento enviado en el body.
router.post("/", createPlayer);

// Se exporta para montarlo con app.use("/players", playersRouter).
module.exports = router;
