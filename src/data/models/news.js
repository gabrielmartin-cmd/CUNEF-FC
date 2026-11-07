// models/news.js — acceso a los datos de las noticias (ver la explicación en models/teams.js).

const data = require('../data');
const { byColumns, nextId } = require('../utils');

// Equivale al JOIN con users: añade el nombre del autor (author_name).
function withAuthor(n) {
    const author = data.users.find((u) => u.user_id === n.author_id);
    return { ...n, author_name: author ? author.name : null };
}

// SQL: SELECT n.*, u.name AS author_name FROM news n JOIN users u ON u.user_id = n.author_id
//      ORDER BY <sort.column> <sort.dir>, n.news_id <sort.dir> LIMIT ? OFFSET ?   (+ COUNT(*) para el total)
function list({ sort, limit, offset }) {
    const rows = [...data.news].sort(byColumns([sort.column, sort.dir], ['news_id', sort.dir]));   // [...] copia: no desordenar data.news
    return { rows: rows.slice(offset, offset + limit).map(withAuthor), total: rows.length };
}

// SQL: (el mismo SELECT con JOIN de list) WHERE n.news_id = ?
function findById(id) {
    const n = data.news.find((x) => x.news_id === id);
    return n && withAuthor(n);
}

// Devuelve el id nuevo. created_at = ahora, en UTC ('YYYY-MM-DDTHH:MM:SSZ').
// SQL: INSERT INTO news (title, information, author_id) VALUES (?, ?, ?)   (created_at lo pone la BD por defecto)
function create({ title, information, authorId }) {
    const row = {
        news_id: nextId(data.news, 'news_id'), title, information, author_id: authorId,
        created_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z')
    };
    data.news.push(row);
    return row.news_id;
}

module.exports = { list, findById, create };
