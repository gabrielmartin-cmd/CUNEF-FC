/* Login / Sign up: POST /api/auth/login y POST /api/users (siempre crea un fan) */
(function () {
    'use strict';
    // CUNEF es el objeto global que crea api.js (se carga antes que este script en login.html).
    const { api, auth, setStatus, errorMessage, esc } = CUNEF;

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const already = document.getElementById('already-signed-in');

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
        already.innerHTML = `You are signed in as <strong>${esc(auth.user.name)}</strong> (${esc(auth.user.role)}). Use “Log out” in the menu to switch account.`;
    }

    // Pide el token al servidor y lo guarda en el navegador (localStorage).
    // A partir de aquí api.js lo enviará solo en cada petición (cabecera Authorization).
    async function signIn(email, password) {
        const { token, user } = await api.post('/api/auth/login', { email, password });
        auth.save(token, user);
        location.href = 'index.html';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();             // evita que el navegador recargue la página al enviar el form
        setStatus(loginError, '');
        try {
            await signIn(loginForm.elements.email.value.trim(), loginForm.elements.password.value);
        } catch (err) {
            // p. ej. 401 "Incorrect email or password": el mensaje viene del servidor
            setStatus(loginError, errorMessage(err), 'error');
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus(signupError, '');
        const { name, email, password } = signupForm.elements;
        try {
            // No se envía ningún rol: el servidor siempre crea un fan.
            await api.post('/api/users', { name: name.value.trim(), email: email.value.trim(), password: password.value });
            await signIn(email.value.trim(), password.value);        // tras crear la cuenta, entra directamente
        } catch (err) {
            setStatus(signupError, errorMessage(err), 'error');
        }
    });
})();
