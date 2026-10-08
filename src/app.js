const express = require("express");
const logger = require("./middleware/logger");
const tasksRouter = require("./routes/tasks");

const app = express();

app.use(express.json());
app.use(logger);

app.get("/", (req, res) => {
  res.json({ message: "CUNEF FC API", endpoints: ["/tasks"] });
});

app.use("/tasks", tasksRouter);

module.exports = app;
