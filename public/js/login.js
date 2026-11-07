/* login.js — Login / Sign up.
   POST /api/auth/login  -> { token, user }   (el token se guarda en localStorage, ver api.js)
   POST /api/users       -> crea siempre un "fan" (no se envía ningún rol) */
(function () {
    'use strict';

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const already = document.getElementById('already-signed-in');
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Alterna entre el formulario de login y el de registro.
    function show(mode) {
        loginForm.hidden = mode !== 'login';
        signupForm.hidden = mode !== 'signup';
        (mode === 'login' ? loginForm.elements.email : signupForm.elements.name).focus();
    }
    document.getElementById('show-signup').addEventListener('click', () => show('signup'));
    document.getElementById('show-login').addEventListener('click', () => show('login'));

    if (auth.user) {
        already.hidden = false;
        already.replaceChildren('You are signed in as ', el('strong', {}, auth.user.name),
            ` (${auth.user.role}). Use “Log out” in the menu to switch account.`);
    }

    const emailCheck = (form) => {
        const v = form.elements.email.value.trim();
        return v && !EMAIL_RE.test(v) ? [{ field: 'email', message: 'Enter a valid email address' }] : [];
    };

    async function signIn(email, password) {
        const { token, user } = await apiRequest('POST', '/api/auth/login', { email, password });
        auth.save(token, user);
        location.href = 'index.html';
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();             // evita que el navegador recargue la página al enviar el form
        const f = loginForm.elements;
        submitForm(loginForm, {
            extraCheck: () => emailCheck(loginForm),
            request: () => signIn(f.email.value.trim(), f.password.value),
            onSuccess: () => {}
        });
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = signupForm.elements;
        const extra = () => [
            ...emailCheck(signupForm),
            ...(f.password.value.length > 0 && f.password.value.length < 8 ? [{ field: 'password', message: 'At least 8 characters' }] : [])
        ];
        submitForm(signupForm, {
            extraCheck: extra,
            request: async () => {
                await apiRequest('POST', '/api/users', { name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value });
                await signIn(f.email.value.trim(), f.password.value);     // tras crear la cuenta, entra directamente
            },
            onSuccess: () => {}
        });
    });
})();
