// routes/matches.js — router "fino": solo conecta rutas con funciones del
// controlador. No contiene lógica ni toca los datos directamente.

const express = require("express");
// Importa los handlers desde el controlador.
const { listMatches, createMatch } = require("../controllers/matchesController");

// Crea un mini-router independiente que luego se monta en app.js bajo /matches.
const router = express.Router();

// GET /matches -> devuelve la lista.
router.get("/", listMatches);
// POST /matches -> crea (de momento, devuelve) el elemento enviado en el body.
router.post("/", createMatch);

// Se exporta para montarlo con app.use("/matches", matchesRouter).
module.exports = router;
