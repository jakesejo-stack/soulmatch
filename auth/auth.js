'use strict';

/*
  SoulMatch Auth - Vercel/static version
  Работи без backend/server.js:
  - Register записва профила в localStorage
  - Login проверява localStorage
  - Работи на localhost и Vercel
*/

const $ = (selector) => document.querySelector(selector);
const statusEl = $('#authStatus');
const STORAGE_USERS = 'soulmatch_users_v2';
const STORAGE_SESSION = 'soulmatch_current_user_v2';

function setStatus(message = '', isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('error', Boolean(isError));
}

function readUsers() {
  try {
    const v2 = JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
    if (Array.isArray(v2)) return v2;

    // fallback from old test versions
    const v1 = JSON.parse(localStorage.getItem('soulmatch_users_v1') || '[]');
    return Array.isArray(v1) ? v1 : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  // keep compatibility with older pages
  localStorage.setItem('soulmatch_users_v1', JSON.stringify(users));
}

function normalEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function goNext(reason = 'register') {
  // next page after successful login/register
  window.location.href = `../member-onboarding/?auth=${encodeURIComponent(reason)}`;
}

function createSession(user) {
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    birthDate: user.birthDate || '',
    birthTime: user.birthTime || '',
    height: user.height || '',
    createdAt: user.createdAt || new Date().toISOString()
  };

  localStorage.setItem(STORAGE_SESSION, JSON.stringify(safeUser));
  localStorage.setItem('soulmatch_current_user_v1', JSON.stringify(safeUser));
  localStorage.setItem('soulmatchLoggedIn', 'true');
  localStorage.setItem('soulmatchUserEmail', safeUser.email);
  localStorage.setItem('soulmatchUserName', safeUser.name || safeUser.email.split('@')[0]);
}

function showPanel(panelId) {
  document.querySelectorAll('.switcher button').forEach((btn) => btn.classList.remove('active'));
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));

  const btn = document.querySelector(`.switcher button[data-panel="${panelId}"]`);
  const panel = $('#' + panelId);

  btn?.classList.add('active');
  panel?.classList.add('active');
  setStatus('');

  if (window.innerWidth <= 860) {
    setTimeout(() => panel?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 90);
  }
}

document.querySelectorAll('.switcher button').forEach((button) => {
  button.addEventListener('click', () => showPanel(button.dataset.panel));
});

$('#loginBtn')?.addEventListener('click', () => {
  const email = normalEmail($('#loginEmail')?.value);
  const password = $('#loginPassword')?.value || '';

  if (!email || !password) return setStatus('Попълни email и password.', true);

  const users = readUsers();
  const user = users.find((item) => item.email === email && item.password === password);

  if (!user) {
    return setStatus('Няма такъв профил. Първо се регистрирай.', true);
  }

  createSession(user);
  setStatus('Успешен login. Отварям SoulMatch...');
  setTimeout(() => goNext('login'), 450);
});

$('#registerBtn')?.addEventListener('click', () => {
  const name = ($('#registerName')?.value || '').trim();
  const email = normalEmail($('#registerEmail')?.value);
  const password = $('#registerPassword')?.value || '';
  const confirmPassword = $('#registerConfirm')?.value || '';
  const birthDate = $('#registerBirthDate')?.value || '';
  const birthTime = $('#registerBirthTime')?.value || '';
  const height = $('#registerHeight')?.value || '';

  if (!name) return setStatus('Напиши име.', true);
  if (!email || !email.includes('@') || !email.includes('.')) return setStatus('Напиши реален email.', true);
  if (password.length < 6) return setStatus('Паролата трябва да е поне 6 символа.', true);
  if (password !== confirmPassword) return setStatus('Паролите не съвпадат.', true);

  const numericHeight = Number(height);
  if (height && (Number.isNaN(numericHeight) || numericHeight < 1.3 || numericHeight > 1.9)) {
    return setStatus('Височината трябва да е между 1.30 и 1.90.', true);
  }

  const users = readUsers();
  if (users.some((user) => user.email === email)) {
    return setStatus('Този email вече има профил. Натисни Login.', true);
  }

  const user = {
    id: `sm_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    email,
    password,
    birthDate,
    birthTime,
    height,
    echoProgress: 0,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  createSession(user);

  setStatus('Регистрацията е успешна. Отварям onboarding...');
  setTimeout(() => goNext('register'), 550);
});

// Mobile: when keyboard opens, keep inputs visible.
document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('focus', () => {
    if (window.innerWidth <= 860) {
      setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'center' }), 220);
    }
  });
});

// If user is already saved, show a soft hint only. Do NOT redirect instantly, so testing stays easy.
try {
  const currentUser =
    JSON.parse(localStorage.getItem(STORAGE_SESSION) || 'null') ||
    JSON.parse(localStorage.getItem('soulmatch_current_user_v1') || 'null');
  if (currentUser?.email) {
    setStatus(`Запазена сесия: ${currentUser.email}. Можеш да login-неш или да направиш нов профил.`);
  }
} catch {
  setStatus('');
}

// light canvas stars
const canvas = $('#authStars');
const ctx = canvas?.getContext('2d');
let stars = [];

function resize() {
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  stars = Array.from({ length: innerWidth < 700 ? 110 : 220 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.7 + 0.25,
    v: Math.random() * 0.2 + 0.04
  }));
}

function loop() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createRadialGradient(canvas.width * 0.2, canvas.height * 0.2, 0, canvas.width * 0.45, canvas.height * 0.5, canvas.width * 0.75);
  gradient.addColorStop(0, 'rgba(255,82,190,.22)');
  gradient.addColorStop(0.55, 'rgba(56,203,255,.09)');
  gradient.addColorStop(1, 'rgba(5,7,19,1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  stars.forEach((star) => {
    star.y += star.v;
    if (star.y > canvas.height) star.y = 0;
    ctx.globalAlpha = 0.3 + Math.random() * 0.55;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  requestAnimationFrame(loop);
}

addEventListener('resize', resize);
resize();
loop();
