// routes/tasks.js — router "fino": solo conecta rutas con funciones del
// controlador. No contiene lógica ni toca los datos directamente.

const express = require("express");
// Importa los handlers desde el controlador.
const { listTasks, createTask } = require("../controllers/tasksController");

// Crea un mini-router independiente que luego se monta en app.js bajo /tasks.
const router = express.Router();

// GET /tasks -> devuelve la lista de tareas.
router.get("/", listTasks);
// POST /tasks -> crea (de momento, devuelve) la tarea enviada en el body.
router.post("/", createTask);

// Se exporta para montarlo con app.use("/tasks", tasksRouter).
module.exports = router;
