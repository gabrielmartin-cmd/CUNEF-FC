const express = require("express");
const { listTasks, createTask } = require("../controllers/taskscontroller");

const router = express.Router();

router.get("/", listTasks);
router.post("/", createTask);

module.exports = router;
