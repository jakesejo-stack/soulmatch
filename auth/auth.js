'use strict';

const $ = (s) => document.querySelector(s);
const statusEl = $('#authStatus');

const USERS_KEY = 'soulmatch_users';
const SESSION_KEY = 'soulmatch_session';

function setStatus(msg, error = false) {
  if (!statusEl) return;
  statusEl.textContent = msg || '';
  statusEl.classList.toggle('error', error);
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveSession(user) {
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem('soulmatchLoggedIn', 'true');
  localStorage.setItem('soulmatchUserEmail', user.email);
  localStorage.setItem('soulmatchUserName', user.name);
}

function goNext(type) {
  setTimeout(() => {
    window.location.href = '../member-onboarding/index.html?auth=' + type;
  }, 500);
}

function emailClean(v) {
  return String(v || '').trim().toLowerCase();
}

document.querySelectorAll('.switcher button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.switcher button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const panel = document.getElementById(btn.dataset.panel);
    panel?.classList.add('active');
    setStatus('');

    setTimeout(() => {
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  });
});

$('#registerBtn')?.addEventListener('click', () => {
  const name = ($('#registerName')?.value || '').trim();
  const email = emailClean($('#registerEmail')?.value);
  const password = $('#registerPassword')?.value || '';
  const confirm = $('#registerConfirm')?.value || '';

  if (!name) return setStatus('Напиши име.', true);
  if (!email || !email.includes('@')) return setStatus('Напиши валиден email.', true);
  if (password.length < 6) return setStatus('Паролата трябва да е поне 6 символа.', true);
  if (password !== confirm) return setStatus('Паролите не съвпадат.', true);

  const users = getUsers();

  if (users.some(u => u.email === email)) {
    return setStatus('Този email вече е регистриран. Влез с Login.', true);
  }

  const user = {
    id: 'sm_' + Date.now(),
    name,
    email,
    password,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  saveSession(user);

  setStatus('Регистрацията е успешна. Отварям SoulMatch...');
  goNext('register');
});

$('#loginBtn')?.addEventListener('click', () => {
  const email = emailClean($('#loginEmail')?.value);
  const password = $('#loginPassword')?.value || '';

  if (!email || !password) return setStatus('Попълни email и password.', true);

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) return setStatus('Грешен email/password или първо се регистрирай.', true);

  saveSession(user);
  setStatus('Успешен login. Отварям SoulMatch...');
  goNext('login');
});

document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('focus', () => {
    setTimeout(() => {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
  });
});