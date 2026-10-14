const express = require("express");
const { listTasks, createTask } = require("../controllers/tasksController");

const router = express.Router();

router.get("/", listTasks);
router.post("/", createTask);

module.exports = router;
