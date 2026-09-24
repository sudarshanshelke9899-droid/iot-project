document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('torrent_token');
  // If already logged in, redirect to dashboard
  if (token) {
    window.location.href = '/dashboard';
    return;
  }

  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const alertBox = document.getElementById('alertBox');
  const alertMessage = document.getElementById('alertMessage');
  const alertIcon = document.getElementById('alertIcon');

  const showAlert = (message, type = 'error') => {
    alertBox.classList.remove('hidden', 'bg-red-50', 'border-red-200', 'text-red-700', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
    if (type === 'error') {
      alertBox.classList.add('bg-red-50', 'border-red-200', 'text-red-700');
      alertIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
      alertBox.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
      alertIcon.setAttribute('data-lucide', 'check-circle-2');
    }
    alertMessage.textContent = message;
    if (window.lucide) lucide.createIcons();
  };

  const hideAlert = () => {
    alertBox.classList.add('hidden');
  };

  // Tab switching
  tabLoginBtn.addEventListener('click', () => {
    hideAlert();
    tabLoginBtn.classList.add('bg-white', 'text-brand-700', 'shadow-sm');
    tabLoginBtn.classList.remove('text-slate-600');
    tabRegisterBtn.classList.remove('bg-white', 'text-brand-700', 'shadow-sm');
    tabRegisterBtn.classList.add('text-slate-600');

    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  tabRegisterBtn.addEventListener('click', () => {
    hideAlert();
    tabRegisterBtn.classList.add('bg-white', 'text-brand-700', 'shadow-sm');
    tabRegisterBtn.classList.remove('text-slate-600');
    tabLoginBtn.classList.remove('bg-white', 'text-brand-700', 'shadow-sm');
    tabLoginBtn.classList.add('text-slate-600');

    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  // Login submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>Authenticating...</span>
    `;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      localStorage.setItem('torrent_token', data.token);
      localStorage.setItem('torrent_user', JSON.stringify(data.user));
      showAlert('Login successful! Redirecting...', 'success');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 700);

    } catch (err) {
      showAlert(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In to Dashboard</span><i data-lucide="arrow-right" class="w-4 h-4 ml-1"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  });

  // Register submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const submitBtn = document.getElementById('registerSubmitBtn');

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>Creating Account...</span>
    `;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('torrent_token', data.token);
      localStorage.setItem('torrent_user', JSON.stringify(data.user));
      showAlert('Account created successfully! Redirecting...', 'success');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 700);

    } catch (err) {
      showAlert(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Create Account</span><i data-lucide="check-circle" class="w-4 h-4 ml-1"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  });
});
