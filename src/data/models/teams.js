// models/teams.js — lee y modifica data.teams.
const data = require('../seed');
const { byColumns, nextId, removeWhere } = require('../../utils');

const toRow = (d) => ({ name: d.name, stadium: d.stadium, creation_date: d.creationDate });

const list = () => [...data.teams].sort(byColumns(['name', 'ASC']));     // [...] copia: no desordenar data.teams

const findById = (id) => data.teams.find((t) => t.team_id === id);

function create(d) {
    const row = { team_id: nextId(data.teams, 'team_id'), ...toRow(d) };
    data.teams.push(row);
    return row.team_id;
}

function replace(id, d) {
    Object.assign(findById(id), toRow(d));
}

const remove = (id) => removeWhere(data.teams, (t) => t.team_id === id) > 0;

module.exports = { list, findById, create, replace, remove };
