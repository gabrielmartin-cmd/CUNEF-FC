/* news.js — página News.
   GET /api/news                lista (más nuevas primero)
   POST /api/news               publicar (player o admin)
   PUT / DELETE /api/news/:id   editar / borrar (el autor o el admin; el servidor lo comprueba) */
(function () {
    'use strict';

    const list = document.getElementById('news-list');
    const statusEl = document.getElementById('news-status');
    const form = document.getElementById('news-form');
    const formMsg = document.getElementById('news-form-msg');
    const submitBtn = document.getElementById('news-submit');
    const cancelBtn = document.getElementById('news-cancel');
    let news = [];
    let editingId = null;

    // Solo se ofrecen los botones a quien el servidor dejaría: el autor o el admin.
    const canChange = (n) => auth.role === 'admin' || (auth.role === 'player' && n.author.id === auth.user.id);

    function newsCard(n) {
        return el('article', { className: 'card' },
            el('h3', {}, n.title),
            el('p', { className: 'card__meta' },
                el('time', { dateTime: n.createdAt }, formatDate(n.createdAt.slice(0, 10))), ` · by ${n.author.name || 'unknown'}`),
            el('p', { className: 'card__text' }, n.information),
            canChange(n) && el('div', { className: 'card__actions' },
                el('button', { type: 'button', className: 'btn--outline btn--small', dataset: { edit: n.id } }, 'Edit'),
                el('button', { type: 'button', className: 'btn--danger btn--small', dataset: { delete: n.id } }, 'Delete')));
    }

    async function loadNews() {
        news = (await loadList({
            container: list, statusEl, loading: 'Loading news…', empty: 'No news yet.',
            request: () => apiRequest('GET', '/api/news?sort=-createdAt'), render: newsCard
        })) || [];
    }

    function setEditing(item) {
        editingId = item ? item.id : null;
        form.reset();
        clearFormErrors(form);
        setStatus(formMsg, '');
        if (item) {
            form.elements.title.value = item.title;
            form.elements.information.value = item.information;
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            form.elements.title.focus();
        }
        document.getElementById('post-title').textContent = item ? 'Edit news' : 'Post news';
        submitBtn.textContent = item ? 'Save changes' : 'Publish';
        cancelBtn.hidden = !item;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const body = { title: form.elements.title.value.trim(), information: form.elements.information.value.trim() };
        const wasEditing = editingId !== null;
        submitForm(form, {
            request: () => (wasEditing ? apiRequest('PUT', `/api/news/${editingId}`, body) : apiRequest('POST', '/api/news', body)),
            onSuccess: async () => {
                setEditing(null);
                setStatus(formMsg, wasEditing ? 'News updated.' : 'News published.');
                await loadNews();
            }
        });
    });

    cancelBtn.addEventListener('click', () => setEditing(null));

    list.addEventListener('click', async (e) => {
        const edit = e.target.closest('[data-edit]');
        if (edit) return setEditing(news.find((n) => n.id === Number(edit.dataset.edit)));

        const del = e.target.closest('[data-delete]');
        if (!del) return;
        const item = news.find((n) => n.id === Number(del.dataset.delete));
        if (!confirm(`Delete "${item.title}"?`)) return;
        try {
            await apiRequest('DELETE', `/api/news/${item.id}`);
            if (editingId === item.id) setEditing(null);
            await loadNews();
        } catch (err) {
            setStatus(statusEl, err.message, 'error');
        }
    });

    loadNews();
})();
