// models/news.js — lee y modifica data.news.
const data = require('../seed');
const { byColumns, nextId, removeWhere } = require('../../utils');

function withAuthor(n) {
    const author = data.users.find((u) => u.user_id === n.author_id);
    return { ...n, author_name: author ? author.name : null };
}

function list({ sort = { column: 'created_at', dir: 'DESC' }, limit = null } = {}) {
    const rows = [...data.news].sort(byColumns([sort.column, sort.dir], ['news_id', sort.dir]));   // [...] copia
    return (limit ? rows.slice(0, limit) : rows).map(withAuthor);
}

function findById(id) {
    const n = data.news.find((x) => x.news_id === id);
    return n && withAuthor(n);
}

// authorId lo pone el controlador a partir del token, nunca del body.
function create({ title, information }, authorId) {
    const row = {
        news_id: nextId(data.news, 'news_id'), title, information, author_id: authorId,
        created_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z')
    };
    data.news.push(row);
    return row.news_id;
}

// PUT cambia el contenido; el autor y la fecha de creación se conservan.
function replace(id, { title, information }) {
    Object.assign(data.news.find((x) => x.news_id === id), { title, information });
}

const remove = (id) => removeWhere(data.news, (n) => n.news_id === id) > 0;

module.exports = { list, findById, create, replace, remove };
