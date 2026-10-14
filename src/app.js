const express = require("express");
const logger = require("./middleware/logger");
const tasksRouter = require("./routes/tasks");

const app = express();

app.use(express.json());
app.use(logger);

app.get("/", (req, res) => {
  res.json({
    message: "CUNEF FC API",
    endpoints: ["/health", "/echo/:msg", "/tasks", "/boom"],
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/echo/:msg", (req, res) => {
  res.json({ echo: req.params.msg });
});

app.use("/tasks", tasksRouter);

app.get("/boom", (req, res) => {
  throw new Error("Boom! Deliberate error to test the error handler");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

module.exports = app;
