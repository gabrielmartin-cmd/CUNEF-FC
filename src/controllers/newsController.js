// newsController.js — lógica de /api/news.
// Publican los players y el admin. Editar o borrar: solo el autor de la noticia o el admin.
const store = require('../data/store');
const { validateNews } = require('../validators/newsValidator');
const { toId, notFound, forbidden, validationError, parseLimitQuery, parseSort } = require('../utils');

const SORTS = { createdAt: 'created_at', title: 'title' };

const mapNews = (r) => ({
    id: r.news_id,
    title: r.title,
    information: r.information,
    createdAt: r.created_at,
    author: { id: r.author_id, name: r.author_name }
});

function findOr404(rawId) {
    const id = toId(rawId);
    const row = id && store.news.findById(id);
    if (!row) throw notFound('News not found');
    return row;
}

function validateBody(body) {
    const { valid, errors, data } = validateNews(body);
    if (!valid) throw validationError(errors);
    return data;
}

// El permiso se mira en el token (req.user), nunca en el body.
function requireAuthorOrAdmin(req, row) {
    if (req.user.role !== 'admin' && row.author_id !== req.user.userId) throw forbidden('Only the author or an admin can change this news');
}

// GET /api/news?sort=&limit=
function listNews(req, res) {
    const sort = parseSort(req.query.sort, SORTS, '-createdAt');
    const limit = parseLimitQuery(req.query.limit, 50);
    res.json(store.news.list({ sort, limit }).map(mapNews));
}

// GET /api/news/:id
function getNews(req, res) {
    res.json(mapNews(findOr404(req.params.id)));
}

// POST /api/news
function createNews(req, res) {
    const id = store.news.create(validateBody(req.body), req.user.userId);
    res.status(201).location(`/api/news/${id}`).json(mapNews(store.news.findById(id)));
}

// PUT /api/news/:id
function replaceNews(req, res) {
    const current = findOr404(req.params.id);
    requireAuthorOrAdmin(req, current);
    store.news.replace(current.news_id, validateBody(req.body));
    res.json(mapNews(store.news.findById(current.news_id)));
}

// DELETE /api/news/:id
function deleteNews(req, res) {
    const current = findOr404(req.params.id);
    requireAuthorOrAdmin(req, current);
    store.news.remove(current.news_id);
    res.status(204).end();
}

module.exports = { listNews, getNews, createNews, replaceNews, deleteNews };
