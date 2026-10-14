// tasksController.js — lógica de los handlers de /tasks y los datos de ejemplo.
// Es la pieza que se sustituirá en la Sesión 18 (CRUD) y la 22 (base de datos).

// Datos de ejemplo fijos en memoria (todavía no hay base de datos).
// Cada tarea pertenece a un usuario mediante userId.
const tasks = [
  { id: 1, title: "Write the API skeleton", done: false, userId: 1 },
  { id: 2, title: "Test with curl", done: false, userId: 1 },
];

// GET /tasks: responde con el array completo en formato JSON (código 200 por defecto).
function listTasks(req, res) {
  res.json(tasks);
}

// POST /tasks: devuelve el body recibido con código 201 (Created).
// req.body solo tiene contenido porque express.json() lo ha parseado antes.
function createTask(req, res) {
  res.status(201).json(req.body);
}

// Se exportan ambos handlers para usarlos en routes/tasks.js.
module.exports = { listTasks, createTask };
