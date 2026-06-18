'use strict';

/* SoulMatch Member Scheme 1 */

const MIN_VIEWPORT_WIDTH = 320;
const MIN_VIEWPORT_HEIGHT = 480;
const CAMERA_Z = 50;
const FALLBACK_VIEW_WIDTH = 80;
const FALLBACK_VIEW_HEIGHT = 80;

const loader = document.getElementById('loader');
const appShell = document.getElementById('app');
const debugPanel = document.getElementById('debugPanel');
const colorAdjusterPanel = document.getElementById('colorAdjusterPanel');
const toggleAdjusterBtn = document.getElementById('toggleAdjusterBtn');

function showDebug(message) {
  console.warn(message);
  if (!debugPanel) return;
  debugPanel.textContent = message;
  debugPanel.classList.add('show');
}

function escapeHTML(text) {
  return String(text || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

window.addEventListener('load', () => {
  setTimeout(() => {
    loader?.classList.add('hide');
    appShell?.classList.add('show');
  }, 1200);
});

const pickerWrap = document.getElementById('colorPickers');

if (pickerWrap) {
  for (let i = 1; i <= 6; i++) {
    pickerWrap.insertAdjacentHTML('beforeend', `
      <div class="color-picker-group">
        <div class="color-picker-label">Color ${i}</div>
        <div class="color-picker-wrapper">
          <input type="color" class="color-picker-input" id="colorPicker${i}" data-color="${i}">
          <input type="text" class="color-value-display" id="colorValue${i}" readonly>
          <button class="copy-btn" data-copy="${i}">Copy</button>
        </div>
      </div>
    `);
  }
}

function safeNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getViewportSize() {
  const width = safeNumber(window.innerWidth, document.documentElement.clientWidth || MIN_VIEWPORT_WIDTH);
  const height = safeNumber(window.innerHeight, document.documentElement.clientHeight || MIN_VIEWPORT_HEIGHT);

  return {
    width: Math.max(MIN_VIEWPORT_WIDTH, width),
    height: Math.max(MIN_VIEWPORT_HEIGHT, height)
  };
}

function createSafePlaneGeometry(width, height) {
  const geometry = new THREE.PlaneBufferGeometry(
    safeNumber(width, FALLBACK_VIEW_WIDTH),
    safeNumber(height, FALLBACK_VIEW_HEIGHT),
    1,
    1
  );

  geometry.computeBoundingSphere();
  return geometry;
}

function runSelfTests() {
  createSafePlaneGeometry(80, 50).dispose();
  createSafePlaneGeometry(0, 0).dispose();
  createSafePlaneGeometry(Number.NaN, Number.NaN).dispose();
}

class TouchTexture {
  constructor() {
    this.size = 64;
    this.width = this.height = this.size;
    this.maxAge = 64;
    this.radius = 0.25 * this.size;
    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.Texture(this.canvas);
    this.clear();
  }

  clear() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  addTouch(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;

    let force = 0;
    let vx = 0;
    let vy = 0;

    if (this.last) {
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (!Number.isFinite(d) || d <= 0) return;

      vx = dx / d;
      vy = dy / d;
      force = Math.min((dx * dx + dy * dy) * 20000, 2.0);
    }

    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(point) {
    const pos = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height
    };

    let intensity = 1;

    if (point.age < this.maxAge * 0.3) {
      intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }

    intensity *= point.force;

    const radius = this.radius;
    const offset = this.size * 5;
    const color = `${((point.vx + 1) / 2) * 255},${((point.vy + 1) / 2) * 255},${intensity * 255}`;

    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;
    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgba(255,0,0,1)';
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  update() {
    this.clear();

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      const f = p.force * this.speed * (1 - p.age / this.maxAge);

      p.x += p.vx * f;
      p.y += p.vy * f;
      p.age++;

      if (p.age > this.maxAge) this.trail.splice(i, 1);
      else this.drawPoint(p);
    }

    this.texture.needsUpdate = true;
  }
}

class LiquidApp {
  constructor() {
    if (!window.THREE) {
      showDebug('Three.js failed to load.');
      return;
    }

    runSelfTests();

    const viewport = getViewportSize();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: false
    });

    this.renderer.setSize(viewport.width, viewport.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    document.body.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'webGLApp';

    this.camera = new THREE.PerspectiveCamera(45, viewport.width / viewport.height, 0.1, 10000);
    this.camera.position.z = CAMERA_Z;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.touchTexture = new TouchTexture();

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
      uColor1: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
      uColor2: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
      uColor3: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
      uColor4: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
      uColor5: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
      uColor6: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
      uSpeed: { value: 1.5 },
      uIntensity: { value: 1.8 },
      uTouchTexture: { value: this.touchTexture.texture },
      uGrainIntensity: { value: 0.08 },
      uDarkNavy: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
      uGradientSize: { value: 0.45 },
      uColor1Weight: { value: 0.5 },
      uColor2Weight: { value: 1.8 }
    };

    this.schemes = {
      1: ['#F15A22', '#0A0E27', '#F15A22', '#0A0E27', '#F15A22', '#0A0E27'],
      2: ['#FF6C50', '#40E0D0', '#FF6C50', '#40E0D0', '#FF6C50', '#40E0D0'],
      3: ['#F15A22', '#0A0E27', '#40E0D0', '#F15A22', '#0A0E27', '#40E0D0'],
      4: ['#F26633', '#2D6B6D', '#D1AF9C', '#F26633', '#2D6B6D', '#D1AF9C'],
      5: ['#F15A22', '#004238', '#F15A22', '#000000', '#F15A22', '#000000']
    };

    this.initMesh();
    this.setScheme(1);
    this.bind();
    this.tick();
  }

  hexToVec(hex) {
    const safeHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
    const n = parseInt(safeHex.slice(1), 16);

    return new THREE.Vector3(
      ((n >> 16) & 255) / 255,
      ((n >> 8) & 255) / 255,
      (n & 255) / 255
    );
  }

  vecToHex(v) {
    const h = (n) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0');
    return `#${h(v.x)}${h(v.y)}${h(v.z)}`.toUpperCase();
  }

  getViewSize() {
    const viewport = getViewportSize();
    const aspect = viewport.width / viewport.height;
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(CAMERA_Z * Math.tan(fovInRadians / 2) * 2);
    const width = height * aspect;

    return {
      width: safeNumber(width, FALLBACK_VIEW_WIDTH),
      height: safeNumber(height, FALLBACK_VIEW_HEIGHT)
    };
  }

  initMesh() {
    const viewSize = this.getViewSize();
    const geometry = createSafePlaneGeometry(viewSize.width, viewSize.height);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vUv = uv;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uColor4;
        uniform vec3 uColor5;
        uniform vec3 uColor6;
        uniform float uSpeed;
        uniform float uIntensity;
        uniform sampler2D uTouchTexture;
        uniform float uGrainIntensity;
        uniform vec3 uDarkNavy;
        uniform float uGradientSize;
        uniform float uColor1Weight;
        uniform float uColor2Weight;
        varying vec2 vUv;

        float grain(vec2 uv, float time) {
          vec2 g = uv * max(uResolution, vec2(1.0)) * 0.5;
          float v = fract(sin(dot(g + time, vec2(12.9898, 78.233))) * 43758.5453);
          return v * 2.0 - 1.0;
        }

        vec3 gradient(vec2 uv, float t) {
          vec2 c1 = vec2(0.5 + sin(t * uSpeed * 0.4) * 0.4, 0.5 + cos(t * uSpeed * 0.5) * 0.4);
          vec2 c2 = vec2(0.5 + cos(t * uSpeed * 0.6) * 0.5, 0.5 + sin(t * uSpeed * 0.45) * 0.5);
          vec2 c3 = vec2(0.5 + sin(t * uSpeed * 0.35) * 0.45, 0.5 + cos(t * uSpeed * 0.55) * 0.45);
          vec2 c4 = vec2(0.5 + cos(t * uSpeed * 0.5) * 0.4, 0.5 + sin(t * uSpeed * 0.4) * 0.4);
          vec2 c5 = vec2(0.5 + sin(t * uSpeed * 0.7) * 0.35, 0.5 + cos(t * uSpeed * 0.6) * 0.35);
          vec2 c6 = vec2(0.5 + cos(t * uSpeed * 0.45) * 0.5, 0.5 + sin(t * uSpeed * 0.65) * 0.5);
          float r = max(uGradientSize, 0.01);
          vec3 color = vec3(0.0);
          color += uColor1 * (1.0 - smoothstep(0.0, r, length(uv - c1))) * uColor1Weight;
          color += uColor2 * (1.0 - smoothstep(0.0, r, length(uv - c2))) * uColor2Weight;
          color += uColor3 * (1.0 - smoothstep(0.0, r, length(uv - c3))) * uColor1Weight;
          color += uColor4 * (1.0 - smoothstep(0.0, r, length(uv - c4))) * uColor2Weight;
          color += uColor5 * (1.0 - smoothstep(0.0, r, length(uv - c5))) * uColor1Weight;
          color += uColor6 * (1.0 - smoothstep(0.0, r, length(uv - c6))) * uColor2Weight;
          color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
          float lum = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(lum), color, 1.35);
          color = pow(max(color, vec3(0.0)), vec3(0.92));
          float b = length(color);
          color = mix(uDarkNavy, color, max(b * 1.2, 0.15));
          return clamp(color, vec3(0.0), vec3(1.0));
        }

        void main() {
          vec2 uv = vUv;
          vec4 touch = texture2D(uTouchTexture, uv);
          float vx = -(touch.r * 2.0 - 1.0);
          float vy = -(touch.g * 2.0 - 1.0);
          float intensity = clamp(touch.b, 0.0, 1.0);
          uv += vec2(vx, vy) * 0.8 * intensity;
          float d = length(uv - vec2(0.5));
          uv += sin(d * 20.0 - uTime * 3.0) * 0.04 * intensity;
          vec3 color = gradient(uv, uTime);
          color += grain(uv, uTime) * uGrainIntensity;
          gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
      `
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  setScheme(index) {
    const scheme = this.schemes[index] || this.schemes[1];

    scheme.forEach((hex, idx) => {
      this.uniforms[`uColor${idx + 1}`].value.copy(this.hexToVec(hex));
    });

    updatePickers();
  }

  bind() {
    window.addEventListener('resize', () => this.onResize());

    window.addEventListener('mousemove', (event) => {
      const viewport = getViewportSize();
      this.touchTexture.addTouch({
        x: event.clientX / viewport.width,
        y: 1 - event.clientY / viewport.height
      });
    });

    window.addEventListener('touchmove', (event) => {
      const touch = event.touches[0];
      if (!touch) return;

      const viewport = getViewportSize();

      this.touchTexture.addTouch({
        x: touch.clientX / viewport.width,
        y: 1 - touch.clientY / viewport.height
      });
    }, { passive: true });
  }

  onResize() {
    const viewport = getViewportSize();

    this.camera.aspect = viewport.width / viewport.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(viewport.width, viewport.height, false);
    this.uniforms.uResolution.value.set(viewport.width, viewport.height);

    const viewSize = this.getViewSize();
    const nextGeometry = createSafePlaneGeometry(viewSize.width, viewSize.height);

    this.mesh.geometry.dispose();
    this.mesh.geometry = nextGeometry;
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.touchTexture.update();
    this.uniforms.uTime.value += delta;
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.tick());
  }
}

let app;

function updatePickers() {
  if (!app || !app.uniforms) return;

  for (let i = 1; i <= 6; i++) {
    const picker = document.getElementById(`colorPicker${i}`);
    const display = document.getElementById(`colorValue${i}`);

    if (!picker || !display) continue;

    const hex = app.vecToHex(app.uniforms[`uColor${i}`].value);

    picker.value = hex;
    display.value = hex;
  }
}

function boot() {
  try {
    app = new LiquidApp();
  } catch (error) {
    showDebug(`SoulMatch preview error:\n${error.message}`);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

document.querySelectorAll('.color-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const scheme = Number(btn.dataset.scheme);

    if (scheme === 1) window.location.href = '../member-scheme1/';
    if (scheme === 2) window.location.href = '../member-scheme2-cities-map/';
    if (scheme === 3) window.location.href = '../member-scheme3-profiles/';
    if (scheme === 4) window.location.href = '../member-scheme4-memories/';
    if (scheme === 5) window.location.href = '../scheme5/';
  });
});

toggleAdjusterBtn?.addEventListener('click', () => {
  colorAdjusterPanel?.classList.add('open');
  if (toggleAdjusterBtn) toggleAdjusterBtn.style.display = 'none';
  updatePickers();
});

document.getElementById('closeAdjusterBtn')?.addEventListener('click', () => {
  colorAdjusterPanel?.classList.remove('open');
  if (toggleAdjusterBtn) toggleAdjusterBtn.style.display = 'block';
});

for (let i = 1; i <= 6; i++) {
  document.getElementById(`colorPicker${i}`)?.addEventListener('input', (event) => {
    if (!app) return;

    const vector = app.hexToVec(event.target.value);

    app.uniforms[`uColor${i}`].value.copy(vector);
    document.getElementById(`colorValue${i}`).value = event.target.value.toUpperCase();
  });
}

document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const value = document.getElementById(`colorValue${btn.dataset.copy}`)?.value || '';

    navigator.clipboard?.writeText(value);
    btn.textContent = 'Copied';

    setTimeout(() => {
      btn.textContent = 'Copy';
    }, 1100);
  });
});

document.getElementById('exportAllBtn')?.addEventListener('click', () => {
  const colors = [1, 2, 3, 4, 5, 6].map((i) => document.getElementById(`colorValue${i}`)?.value || '');
  navigator.clipboard?.writeText(colors.join('\n'));
});

const cursor = document.getElementById('customCursor');

document.addEventListener('mousemove', (event) => {
  if (!cursor) return;

  cursor.style.left = `${event.clientX}px`;
  cursor.style.top = `${event.clientY}px`;
  cursor.style.borderWidth = '2.5px';
});

document.querySelectorAll('button, input').forEach((element) => {
  element.addEventListener('mouseenter', () => {
    if (!cursor) return;

    cursor.style.width = '54px';
    cursor.style.height = '54px';
    cursor.style.borderWidth = '3px';
  });

  element.addEventListener('mouseleave', () => {
    if (!cursor) return;

    cursor.style.width = '40px';
    cursor.style.height = '40px';
    cursor.style.borderWidth = '2px';
  });
});

/* =========================
   REAL USER CHAT ONLY
   ========================= */

const CHAT_SERVER = 'http://localhost:3001';

const chatOpenBtn = document.getElementById('chatOpenBtn');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const matchChat = document.getElementById('matchChat');
const chatMessages = document.getElementById('chatMessages');
const chatText = document.getElementById('chatText');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatPerson = document.getElementById('chatPerson');
const imageInput = document.getElementById('chatImageInput');
const imageLimitText = document.getElementById('imageLimitText');
const gifBtn = document.getElementById('gifBtn');
const chatStatus = document.getElementById('chatStatus');
const typingStatus = document.getElementById('typingStatus');
const matchList = document.getElementById('matchList');
const currentUserBox = document.getElementById('currentUserBox');
const gifPicker = document.getElementById('gifPicker');

let socket = null;
let socketReady = false;
let selectedUser = null;

function makeId() {
  return 'user_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getCurrentUser() {
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('soulmatch_current_user') || 'null');
  } catch {
    user = null;
  }

  if (!user) {
    const name =
      localStorage.getItem('soulmatch_user_name') ||
      localStorage.getItem('soulmatch_name') ||
      localStorage.getItem('name') ||
      'User ' + Math.floor(Math.random() * 9999);

    user = {
      id: localStorage.getItem('soulmatch_user_id') || makeId(),
      name,
      city: localStorage.getItem('soulmatch_city') || 'Soul City'
    };

    localStorage.setItem('soulmatch_current_user', JSON.stringify(user));
    localStorage.setItem('soulmatch_user_id', user.id);
  }

  return user;
}

const currentUser = getCurrentUser();

function setChatStatus(text) {
  if (chatStatus) chatStatus.textContent = text;
}

function getRoomId() {
  if (!selectedUser) return null;
  return [currentUser.id, selectedUser.id].sort().join('_');
}

function updateCurrentUserUI() {
  if (!currentUserBox) return;

  currentUserBox.innerHTML = `
    Logged as: <b>${escapeHTML(currentUser.name)}</b>
    <br>
    <small>${escapeHTML(currentUser.id)}</small>
  `;
}

async function registerCurrentUser() {
  try {
    await fetch(`${CHAT_SERVER}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentUser)
    });
  } catch {
    setChatStatus('Backend not connected');
  }
}

async function loadRealUsers() {
  if (!matchList) return;

  try {
    const res = await fetch(`${CHAT_SERVER}/users`);
    const users = await res.json();

    const otherUsers = users.filter((u) => u.id !== currentUser.id);

    if (!otherUsers.length) {
      matchList.innerHTML = `
        <div class="empty-users">
          Няма други регистрирани users още.
          <br>
          <small>Отвори сайта от друг телефон/browser, за да се появи втори user.</small>
        </div>
      `;
      selectedUser = null;
      if (chatPerson) chatPerson.textContent = 'Select a real user';
      if (chatText) chatText.placeholder = 'No user selected';
      return;
    }

    matchList.innerHTML = otherUsers.map((u, index) => `
      <button
        class="match-item ${index === 0 ? 'active' : ''}"
        data-user-id="${escapeHTML(u.id)}"
        data-name="${escapeHTML(u.name)}"
        data-city="${escapeHTML(u.city || 'Soul City')}"
      >
        ${escapeHTML(u.name)}
      </button>
    `).join('');

    selectedUser = otherUsers[0];
    if (chatPerson) chatPerson.textContent = `${selectedUser.name} · ${selectedUser.city || 'Soul City'}`;
    if (chatText) chatText.placeholder = `Message ${selectedUser.name}...`;

    bindUserButtons();
    loadMessages();
  } catch {
    matchList.innerHTML = `
      <div class="empty-users">
        Backend не е пуснат.
        <br>
        <small>Стартирай backend на localhost:3001.</small>
      </div>
    `;
  }
}

function bindUserButtons() {
  document.querySelectorAll('.match-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.match-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      selectedUser = {
        id: btn.dataset.userId,
        name: btn.dataset.name,
        city: btn.dataset.city
      };

      if (chatPerson) chatPerson.textContent = `${selectedUser.name} · ${selectedUser.city}`;
      if (chatText) chatText.placeholder = `Message ${selectedUser.name}...`;

      if (gifPicker) gifPicker.classList.remove('open');

      loadMessages();
    });
  });
}

function connectSocket() {
  if (!window.io) {
    setChatStatus('Socket.io missing');
    return;
  }

  socket = io(CHAT_SERVER, {
    transports: ['websocket', 'polling']
  });

  socket.on('connect', async () => {
    socketReady = true;
    setChatStatus('Online · real users only');

    await registerCurrentUser();
    await loadRealUsers();
  });

  socket.on('disconnect', () => {
    socketReady = false;
    setChatStatus('Offline');
  });

  socket.on('connect_error', () => {
    socketReady = false;
    setChatStatus('Backend not connected');
  });

  socket.on('usersUpdated', () => {
    loadRealUsers();
  });

  socket.on('newMessage', (message) => {
    const roomId = getRoomId();
    if (!roomId || message.roomId !== roomId) return;
    renderMessage(message);
  });

  socket.on('typing', (data) => {
    if (!typingStatus || !selectedUser) return;
    if (data.userId === currentUser.id) return;
    if (data.roomId !== getRoomId()) return;

    typingStatus.textContent = `${selectedUser.name} is typing...`;

    setTimeout(() => {
      typingStatus.textContent = '';
    }, 1200);
  });
}

async function loadMessages() {
  if (!chatMessages) return;

  const roomId = getRoomId();

  if (!roomId) {
    chatMessages.innerHTML = `
      <div class="msg">
        Няма избран реален user.
      </div>
    `;
    return;
  }

  chatMessages.innerHTML = `<div class="msg">Loading chat...</div>`;

  if (socketReady && socket) {
    socket.emit('joinRoom', {
      roomId,
      userId: currentUser.id
    });
  }

  try {
    const res = await fetch(`${CHAT_SERVER}/messages/${roomId}`);
    const data = await res.json();

    chatMessages.innerHTML = '';

    if (!data.length) {
      chatMessages.innerHTML = `
        <div class="msg">
          Start real chat with ${escapeHTML(selectedUser.name)} 👋
          <br>
          <small>No fake bots. No fake users.</small>
        </div>
      `;
    } else {
      data.forEach(renderMessage);
    }
  } catch {
    chatMessages.innerHTML = `
      <div class="msg">
        Backend не е пуснат още.
        <br>
        <small>Пусни backend/server.js на localhost:3001.</small>
      </div>
    `;
  }

  if (imageLimitText) {
    imageLimitText.textContent = 'User-to-user chat · files · GIF picker';
  }
}

function renderMessage(m) {
  if (!chatMessages || !m) return;

  const side = m.senderId === currentUser.id ? 'me' : '';
  const time = m.createdAt
    ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  if (m.fileUrl) {
    chatMessages.insertAdjacentHTML('beforeend', `
      <div class="msg ${side}">
        ${
          m.fileType && m.fileType.startsWith('image')
            ? `<img src="${escapeHTML(m.fileUrl)}" alt="chat image">`
            : `<a href="${escapeHTML(m.fileUrl)}" target="_blank">📎 Open file</a>`
        }
        <small>${escapeHTML(time)}</small>
      </div>
    `);
  } else {
    chatMessages.insertAdjacentHTML('beforeend', `
      <div class="msg ${side}">
        ${escapeHTML(m.text)}
        <small>${escapeHTML(time)}</small>
      </div>
    `);
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
  const text = String(chatText?.value || '').trim();

  if (!text || !selectedUser) return;

  if (!socketReady || !socket) {
    alert('Backend не е пуснат.');
    return;
  }

  socket.emit('sendMessage', {
    roomId: getRoomId(),
    senderId: currentUser.id,
    receiverId: selectedUser.id,
    text
  });

  chatText.value = '';
}

async function uploadAndSend(file) {
  if (!file || !selectedUser) return;

  if (!socketReady || !socket) {
    alert('Backend не е пуснат.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${CHAT_SERVER}/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    socket.emit('sendMessage', {
      roomId: getRoomId(),
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      fileUrl: data.url,
      fileType: data.type
    });
  } catch {
    alert('Upload failed.');
  }
}

chatOpenBtn?.addEventListener('click', async () => {
  matchChat?.classList.add('open');
  matchChat?.setAttribute('aria-hidden', 'false');
  updateCurrentUserUI();
  await registerCurrentUser();
  await loadRealUsers();
});

chatCloseBtn?.addEventListener('click', () => {
  matchChat?.classList.remove('open');
  matchChat?.setAttribute('aria-hidden', 'true');
});

sendChatBtn?.addEventListener('click', sendMessage);

chatText?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

chatText?.addEventListener('input', () => {
  if (!socketReady || !socket || !selectedUser) return;

  socket.emit('typing', {
    roomId: getRoomId(),
    userId: currentUser.id
  });
});

document.querySelectorAll('.chat-tools [data-emoji]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!chatText) return;

    chatText.value += btn.dataset.emoji;
    chatText.focus();
  });
});

gifBtn?.addEventListener('click', () => {
  if (gifPicker) gifPicker.classList.toggle('open');
});

document.querySelectorAll('#gifPicker [data-gif]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!selectedUser) return;

    if (!socketReady || !socket) {
      alert('Backend не е пуснат.');
      return;
    }

    socket.emit('sendMessage', {
      roomId: getRoomId(),
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      fileUrl: btn.dataset.gif,
      fileType: 'image/gif'
    });

    gifPicker?.classList.remove('open');
  });
});

imageInput?.addEventListener('change', async () => {
  const file = imageInput.files?.[0];
  if (!file) return;

  await uploadAndSend(file);

  imageInput.value = '';
});

updateCurrentUserUI();
connectSocket();
