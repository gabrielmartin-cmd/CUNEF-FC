// newsController.js — lógica de los handlers de Noticias del club.
// Las rutas (routes/news.js) solo conectan URL + middleware con estas funciones.

const News = require('../models/news');
const { badRequest, requireBody, parsePaging, parseSort, paged } = require('../utils');

const SORTS = { createdAt: 'created_at' };

const mapNews = (r) => ({
    id: r.news_id,
    title: r.title,
    information: r.information,
    createdAt: r.created_at,
    author: { id: r.author_id, name: r.author_name }
});

// GET /api/news?sort=-createdAt&page=&limit=   (público)
function listNews(req, res) {
    const sort = parseSort(req.query.sort, SORTS, '-createdAt');
    const paging = parsePaging(req.query, { defLimit: 10, maxLimit: 50 });
    const { rows, total } = News.list({ sort, limit: paging.limit, offset: paging.offset });
    res.json(paged(rows.map(mapNews), paging, total));
}

// POST /api/news  body: { title, information }   (solo Player). El autor sale del token.
function createNews(req, res) {
    const { title, information } = requireBody(req);
    if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 120)
        throw badRequest('title is required (1 to 120 characters)');
    if (typeof information !== 'string' || information.trim().length < 1 || information.trim().length > 2000)
        throw badRequest('information is required (1 to 2000 characters)');

    const id = News.create({ title: title.trim(), information: information.trim(), authorId: req.user.userId });
    res.status(201).json(mapNews(News.findById(id)));
}

module.exports = { listNews, createNews };
