import { showToast } from './utils.js';

function setupLogin() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('login-error-message');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorMessage.classList.remove('visible');
    usernameInput.classList.remove('input-error');
    passwordInput.classList.remove('input-error');

    const data = Object.fromEntries(new FormData(loginForm));
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (response.ok) {
        // --- THESE TWO LINES WERE MISSING ---
        localStorage.setItem('userId', result.userId);
        localStorage.setItem('role', result.role);
        // ------------------------------------

        window.location.href =
          result.role === 'admin'
            ? '/admin/dashboard.html'
            : '/user/dashboard.html';
      } else {
        errorMessage.textContent = result.error;
        errorMessage.classList.add('visible');
        usernameInput.classList.add('input-error');
        passwordInput.classList.add('input-error');
        loginForm.classList.add('shake');

        setTimeout(() => {
          loginForm.classList.remove('shake');
        }, 500);
      }
    } catch (error) {
      errorMessage.textContent = 'A network error occurred. Please try again.';
      errorMessage.classList.add('visible');
    }
  });
}

function setupRegister() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(registerForm));
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        showToast(result.message, 'success');
        window.location.href = '/login.html';
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('Registration error: ' + error.message, 'error');
    }
  });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.endsWith('/login.html') || path === '/') {
    setupLogin();
  } else if (path.endsWith('/register.html')) {
    setupRegister();
  }
});
