// routes/teams.js — router "fino": solo conecta rutas con funciones del
// controlador. No contiene lógica ni toca los datos directamente.

const express = require("express");
// Importa los handlers desde el controlador.
const { listTeams, createTeam } = require("../controllers/teamsController");

// Crea un mini-router independiente que luego se monta en app.js bajo /teams.
const router = express.Router();

// GET /teams -> devuelve la lista.
router.get("/", listTeams);
// POST /teams -> crea (de momento, devuelve) el elemento enviado en el body.
router.post("/", createTeam);

// Se exporta para montarlo con app.use("/teams", teamsRouter).
module.exports = router;
