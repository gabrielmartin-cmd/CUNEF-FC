/* ui.js — utilidades del DOM que comparten todas las páginas (se carga después de api.js).

   Regla de la práctica: los datos de la API se pintan con createElement + textContent
   (nunca con innerHTML), y se muestran con replaceChildren. textContent trata todo como texto,
   así que un nombre como "<script>" se ve tal cual y no se ejecuta (evita XSS). */
'use strict';

// el('p', { className: 'card__text' }, 'Hola')  ->  <p class="card__text">Hola</p>
// - props: propiedades del elemento (className, type, hidden...) y además:
//          dataset: { id: 7 } -> data-id="7" · attrs: { 'aria-label': '...' } -> setAttribute
// - children: textos (se añaden como texto) o elementos. null/false se ignoran.
function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key === 'attrs') for (const [a, v] of Object.entries(value)) node.setAttribute(a, v);
        else node[key] = value;
    }
    for (const child of children.flat()) {
        if (child === null || child === undefined || child === false) continue;
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
}

// ---------- Estados de carga, error y vacío ----------
// <p class="status" role="status"> que se reutiliza para los tres estados.
function setStatus(element, message, kind) {
    if (!element) return;
    element.textContent = message || '';
    element.hidden = !message;
    element.classList.toggle('status--error', kind === 'error');
}

// Patrón de todas las listas: "Loading…" -> pedir -> pintar o "vacío" -> o error.
//   await loadList({ container, statusEl, request: () => apiRequest(...), render: (item) => el(...), empty: 'No players.' })
async function loadList({ container, statusEl, request, render, empty, loading = 'Loading…' }) {
    setStatus(statusEl, loading);
    try {
        const items = await request();
        container.replaceChildren(...items.map(render));
        setStatus(statusEl, items.length ? '' : empty);
        return items;
    } catch (err) {
        container.replaceChildren();
        setStatus(statusEl, err.message, 'error');
        return null;
    }
}

// ---------- Formularios: validación en el cliente + errores junto a cada campo ----------

// Comprueba el formulario con los mismos atributos que ya tiene el HTML (required, min, max,
// maxlength, step). Los valores de esos atributos son las mismas reglas que el validador del servidor.
// Devuelve el MISMO formato que la API: [{ field, message }].
function checkForm(form) {
    const errors = [];
    for (const input of form.elements) {
        if (!input.name || input.disabled || input.type === 'checkbox') continue;
        const value = input.value.trim();
        const label = form.querySelector(`label[for="${input.id}"]`)?.textContent || input.name;
        if (input.required && value === '') { errors.push({ field: input.name, message: `${label} is required` }); continue; }
        if (value === '') continue;
        if (input.type === 'number') {
            const n = Number(value);
            if (!Number.isInteger(n)) errors.push({ field: input.name, message: `${label} must be a whole number` });
            else if (input.min !== '' && n < Number(input.min)) errors.push({ field: input.name, message: `${label} must be at least ${input.min}` });
            else if (input.max !== '' && n > Number(input.max)) errors.push({ field: input.name, message: `${label} must be at most ${input.max}` });
        }
        if (input.maxLength > 0 && value.length > input.maxLength)
            errors.push({ field: input.name, message: `${label} must be at most ${input.maxLength} characters` });
    }
    return errors;
}

// Borra los mensajes de error anteriores del formulario.
function clearFormErrors(form) {
    form.querySelectorAll('.field__error').forEach((p) => p.remove());
    form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
    setStatus(form.querySelector('[data-form-error]'), '');
}

// Pinta cada error debajo de su campo. Los que no tienen campo en el formulario van al mensaje general.
function showFormErrors(form, errors, fallbackMessage) {
    clearFormErrors(form);
    const general = [];
    for (const { field, message } of errors) {
        const input = form.elements[field];
        if (!input || !input.closest) { general.push(message); continue; }
        input.setAttribute('aria-invalid', 'true');
        const box = input.closest('.field') || input.parentElement;
        let p = box.querySelector('.field__error');
        if (!p) {
            p = el('p', { className: 'field__error', id: `${input.id}-error` });
            box.append(p);
            input.setAttribute('aria-describedby', p.id);
        }
        p.textContent = p.textContent ? `${p.textContent} ${message}` : message;
    }
    if (!errors.length && fallbackMessage) general.push(fallbackMessage);
    setStatus(form.querySelector('[data-form-error]'), general.join(' '), 'error');
    form.querySelector('[aria-invalid="true"]')?.focus();
}

// Envía un formulario: validación en el cliente -> petición -> errores del servidor junto a su campo.
//   submitForm(form, { extraCheck, request: () => apiRequest(...), onSuccess })
async function submitForm(form, { extraCheck, request, onSuccess }) {
    const errors = [...checkForm(form), ...(extraCheck ? extraCheck() : [])];
    if (errors.length) return showFormErrors(form, errors);
    clearFormErrors(form);
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    try {
        const result = await request();
        await onSuccess(result);
    } catch (err) {
        showFormErrors(form, err.errors || [], err.message);
    } finally {
        if (button) button.disabled = false;
    }
}

// ---------- Formato ----------
// 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM' -> Date en hora local (new Date('2026-10-29') sería UTC)
function parseLocal(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : new Date(NaN);
}
const formatDate = (s, opts = { year: 'numeric', month: 'long', day: 'numeric' }) => parseLocal(s).toLocaleDateString('en-US', opts);
const formatTime = (s) => (/T(\d{2}:\d{2})/.exec(s || '') || [])[1] || '';
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Número de un <input type="number">: '' -> null, '7' -> 7 (y lo que no sea número lo deja tal cual para que lo rechace el servidor)
const numberOrNull = (input) => (input.value.trim() === '' ? null : Number(input.value));

// ---------- Cabecera común: enlace Login/Logout y elementos según el rol ----------
// En el HTML:  <button data-roles="admin" hidden>New player</button>  -> solo se ve si eres admin.
// OJO: ocultar botones es solo comodidad. La seguridad real está en el servidor (401/403).
function refreshChrome() {
    const link = document.querySelector('.site-nav__link[href="login.html"], .site-nav__link[data-logout]');
    if (link) {
        const user = auth.user;
        link.textContent = user ? `Log out (${user.name})` : 'Login';
        link.setAttribute('href', user ? '#' : 'login.html');
        link.toggleAttribute('data-logout', !!user);
    }
    document.querySelectorAll('[data-roles]').forEach((node) => {
        node.hidden = !node.dataset.roles.split(/\s+/).includes(auth.role);
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-logout]')) return;
    e.preventDefault();
    auth.clear();
    location.href = 'index.html';
});

refreshChrome();     // los scripts van con defer: el HTML ya está cargado cuando se ejecuta esto
