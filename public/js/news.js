/* News: lista paginada (GET /api/news) y publicar noticia (POST /api/news, solo player) */
(function () {
    'use strict';
    const { api, esc, formatDate, setStatus, errorMessage } = CUNEF;
    const LIMIT = 6;

    const list = document.getElementById('news-list');
    const statusEl = document.getElementById('news-status');
    const prev = document.getElementById('news-prev');
    const next = document.getElementById('news-next');
    const pageInfo = document.getElementById('news-page');
    const form = document.getElementById('news-form');
    const formMsg = document.getElementById('news-form-msg');
    let page = 1;

    async function load() {
        setStatus(statusEl, 'Loading news…');
        try {
            const res = await api.get('/api/news', { page, limit: LIMIT, sort: '-createdAt' });
            const pages = Math.max(1, Math.ceil(res.total / res.limit));
            list.innerHTML = res.data.map((n) => `
                <article class="card">
                    <h3>${esc(n.title)}</h3>
                    <p class="card__meta"><time datetime="${esc(n.createdAt)}">${esc(formatDate(n.createdAt.slice(0, 10)))}</time> · by ${esc(n.author.name)}</p>
                    <p class="card__text">${esc(n.information)}</p>
                </article>`).join('');
            setStatus(statusEl, res.data.length ? '' : 'No news yet.');
            pageInfo.textContent = `Page ${res.page} of ${pages}`;
            prev.disabled = res.page <= 1;
            next.disabled = res.page >= pages;
        } catch (err) {
            list.innerHTML = '';
            setStatus(statusEl, errorMessage(err), 'error');
        }
    }

    prev.addEventListener('click', () => { page--; load(); });
    next.addEventListener('click', () => { page++; load(); });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMsg.className = 'form__error';
        setStatus(formMsg, '');
        try {
            await api.post('/api/news', { title: form.elements.title.value, information: form.elements.information.value });
            form.reset();
            formMsg.className = 'form__success';
            setStatus(formMsg, 'News published.');
            page = 1;
            load();
        } catch (err) {
            setStatus(formMsg, errorMessage(err), 'error');
        }
    });

    load();
})();
