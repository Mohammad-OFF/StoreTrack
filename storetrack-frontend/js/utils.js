/**
 * Initializes a mobile hamburger menu.
 * @param {string} buttonSelector - The CSS selector for the hamburger button.
 * @param {string} menuSelector - The CSS selector for the menu to be toggled.
 */
export function initMobileMenu(buttonSelector, menuSelector) {
  const button = document.querySelector(buttonSelector);
  const menu = document.querySelector(menuSelector);

  if (button && menu) {
    button.addEventListener('click', () => {
      menu.classList.toggle('active');
      button.classList.toggle('active');
    });
  }
}

export function showToast(message, type, position = 'bottom') {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('⚠️ #toast not found in DOM');
    return;
  }
  toast.textContent = message;
  toast.className = `toast ${type} animate-slide-in`;
  if (position === 'top') {
    toast.style.top = '1rem';
    toast.style.bottom = 'auto';
    toast.style.right = '1rem';
  } else {
    toast.style.bottom = '1rem';
    toast.style.top = 'auto';
    toast.style.right = '1rem';
  }
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.className = `toast ${type} animate-slide-out`;
    setTimeout(() => {
      toast.classList.add('hidden');
      // Reset position styles to avoid conflicts
      toast.style.top = '';
      toast.style.bottom = '';
    }, 300);
  }, 3000);
}

export function showLoading(show) {
  const loading = document.getElementById('loading');
  if (!loading) {
    console.warn('⚠️ #loading not found in DOM');
    return;
  }
  // Only show loading on pages that require data fetching
  const path = window.location.pathname;
  const fetchPages = ['index.html', 'notification.html', 'order_history.html'];
  if (show && !fetchPages.some((page) => path.endsWith(page))) {
    return; // Skip showing loading on home.html and add.html
  }
  loading.style.display = show ? 'flex' : 'none';
}

export function initDarkMode() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  const isDark = localStorage.getItem('theme') === 'dark';
  document.body.classList.toggle('dark', isDark);
  themeToggle.querySelector('i').className = isDark
    ? 'fas fa-sun'
    : 'fas fa-moon';
  themeToggle.querySelector('span').textContent = isDark
    ? 'Toggle Light Mode'
    : 'Toggle Dark Mode';
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDarkNow = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
    themeToggle.querySelector('i').className = isDarkNow
      ? 'fas fa-sun'
      : 'fas fa-moon';
    themeToggle.querySelector('span').textContent = isDarkNow
      ? 'Toggle Light Mode'
      : 'Toggle Dark Mode';
  });
}
