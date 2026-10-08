const tasks = [
  { id: 1, title: "Write the API skeleton", done: false, userId: 1 },
  { id: 2, title: "Test with curl", done: false, userId: 1 },
];

function listTasks(req, res) {
  res.json(tasks);
}

function createTask(req, res) {
  res.status(201).json(req.body);
}

module.exports = { listTasks, createTask };