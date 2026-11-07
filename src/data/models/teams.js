// models/teams.js — acceso a los datos de los equipos.
//
// Los "modelos" son la ÚNICA parte de la app que sabe dónde están guardados los datos.
// Hoy leen y modifican los arrays de data.js. Cuando haya base de datos, se reescribe el
// cuerpo de cada función con la consulta SQL que tiene encima en el comentario y el resto
// de la app (rutas, controladores, frontend) no cambia.
// Devuelven filas con los nombres de columna de la BD (team_id, name...); los controladores
// las convierten al formato de la API.

const data = require('../data');

// SQL: SELECT * FROM teams WHERE team_id = ?
const findById = (id) => data.teams.find((t) => t.team_id === id);

// SQL: SELECT * FROM teams
const findAll = () => data.teams;

module.exports = { findById, findAll };
