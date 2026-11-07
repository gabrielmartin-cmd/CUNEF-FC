// newsValidator.js — valida el body de POST y PUT /api/news.
// El autor NO se valida aquí: sale del token de quien publica, nunca del body.
const { createValidator } = require('./rules');

function validateNews(body) {
    const v = createValidator(body);

    v.text('title', { max: 120 });
    v.text('information', { max: 2000 });

    return v.result();
}

module.exports = { validateNews };
