'use strict';

const navRoutes = {
  1: '../member-scheme1/',
  2: '../member-scheme2-cities-map/',
  3: '../member-scheme3-profiles/',
  4: '../member-scheme4-memories/',
  5: '../scheme5/'
};

document.querySelectorAll('.scheme-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const scheme = Number(btn.dataset.scheme);
    if (scheme === 3) return;
    window.location.href = navRoutes[scheme] || '../main/';
  });
});

const fallbackUsers = [
  { id: 'user_mira', name: 'Mira', age: 24, quote: 'I want someone who feels real.', photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=85'] },
  { id: 'user_alex', name: 'Alex', age: 27, quote: 'Deep talks over small talk.', photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=85'] },
  { id: 'user_sofia', name: 'Sofia', age: 22, quote: 'Soft heart, strong mind.', photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=85'] },
  { id: 'user_daniel', name: 'Daniel', age: 29, quote: 'Energy matters first.', photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=85'] },
  { id: 'user_eva', name: 'Eva', age: 25, quote: 'Make me laugh, then stay.', photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=85'] },
  { id: 'user_martin', name: 'Martin', age: 28, quote: 'Calm, loyal, curious.', photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=85'] },
  { id: 'user_nia', name: 'Nia', age: 23, quote: 'I read people fast.', photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85'] },
  { id: 'user_victor', name: 'Victor', age: 30, quote: 'Built for something serious.', photos: ['https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=600&q=85'] }
];

const zone = document.getElementById('stripZone');
const loadingNote = document.getElementById('loadingNote');
let hasEntered = false;

function enterPage() {
  if (hasEntered) return;
  hasEntered = true;
  document.body.classList.add('page-entered');
}

function normalizePhotoPath(photoPath) {
  if (!photoPath) return '';
  if (/^(https?:)?\/\//i.test(photoPath) || photoPath.startsWith('data:')) return photoPath;
  if (photoPath.startsWith('../') || photoPath.startsWith('./') || photoPath.startsWith('/')) return photoPath;
  return `../${photoPath.replace(/^\/+/, '')}`;
}

function flattenUserPhotos(users) {
  const cards = [];
  users.forEach((user) => {
    const photos = Array.isArray(user.photos) && user.photos.length ? user.photos : [user.photo].filter(Boolean);
    photos.forEach((photo, index) => {
      cards.push({
        id: user.id || `user_${user.name || 'profile'}_${index}`,
        name: user.name || 'SoulMatch',
        age: user.age || '',
        quote: user.quote || 'Where people connect.',
        soulType: user.soulType || '',
        echoScore: user.echoScore || '',
        height: user.height || '',
        zodiac: user.zodiac || '',
        photo: normalizePhotoPath(photo),
        photoIndex: index + 1
      });
    });
  });
  return cards.length ? cards : flattenUserPhotos(fallbackUsers);
}

async function loadUsers() {
  try {
    const response = await fetch('/api/member-profiles', { cache: 'no-store' });
    if (!response.ok) throw new Error('users.json not found');
    const data = await response.json();
    const users = Array.isArray(data) ? data : (data.users || data.profiles);
    if (!Array.isArray(users) || users.length === 0) throw new Error('users.json is empty');
    return users;
  } catch (error) {
    console.warn('Using fallback users:', error.message);
    return fallbackUsers;
  }
}

function createCard(profile) {
  const card = document.createElement('div');
  card.className = 'film-card';
  card.style.setProperty('--photo', `url('${profile.photo}')`);
  card.innerHTML = `
    <div class="profile-info">
      <strong>${profile.name}${profile.age ? `, ${profile.age}` : ''}</strong>
      <span>"${profile.quote}"</span>
      <small>${profile.soulType ? `${profile.soulType}${profile.echoScore ? ` · ${profile.echoScore}%` : ''}` : 'EchoProfile pending'}${profile.height ? ` · ${profile.height}m` : ''}${profile.zodiac ? ` · ${profile.zodiac}` : ''}</small>
      <em>Open profile</em>
    </div>
  `;

  card.addEventListener('click', (event) => {
    event.stopPropagation();

    if (!hasEntered) {
      enterPage();
      card.classList.add('is-active');
      setTimeout(() => card.classList.remove('is-active'), 850);
      return;
    }

    card.classList.add('is-active');
    setTimeout(() => card.classList.remove('is-active'), 850);

    const url = `../scheme4/?from=scheme3&userId=${encodeURIComponent(profile.id)}&person=${encodeURIComponent(profile.name)}&age=${encodeURIComponent(profile.age)}&photo=${encodeURIComponent(profile.photoIndex)}`;
    window.open(url, '_blank');
  });

  return card;
}

function createStrip(className, offset, profiles) {
  const strip = document.createElement('div');
  strip.className = `film-strip ${className}`;
  const repeated = [...profiles, ...profiles, ...profiles, ...profiles].map((profile, index) => profiles[(index + offset) % profiles.length]);
  repeated.forEach((profile) => strip.appendChild(createCard(profile)));
  zone.appendChild(strip);
}

function initLiquidBackground() {
  if (typeof THREE === 'undefined') {
    document.body.style.background = 'radial-gradient(circle at 25% 20%, rgba(255,80,190,.42), transparent 32%), radial-gradient(circle at 75% 28%, rgba(56,203,255,.28), transparent 30%), radial-gradient(circle at 50% 85%, rgba(255,138,51,.2), transparent 36%), #070712';
    return;
  }

  const canvas = document.getElementById('webGLApp');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uColorA: { value: new THREE.Color('#ff52be') },
    uColorB: { value: new THREE.Color('#7b5cff') },
    uColorC: { value: new THREE.Color('#38cbff') },
    uColorD: { value: new THREE.Color('#ff8a33') }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform vec3 uColorD;

      float blob(vec2 uv, vec2 p, float r) {
        float d = distance(uv, p);
        return smoothstep(r, 0.0, d);
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
        vec2 p = (uv - 0.5) * aspect;
        float t = uTime * 0.18;

        vec2 m = (uMouse - 0.5) * aspect;
        float a = blob(p, vec2(-0.42 + sin(t * 1.2) * 0.18, 0.25 + cos(t) * 0.12), 0.62);
        float b = blob(p, vec2(0.45 + cos(t * 1.1) * 0.16, 0.18 + sin(t * 1.35) * 0.12), 0.58);
        float c = blob(p, vec2(sin(t * 0.8) * 0.24, -0.36 + cos(t * 1.4) * 0.13), 0.70);
        float d = blob(p, m, 0.46);

        vec3 col = vec3(0.015, 0.018, 0.055);
        col += uColorA * a * 0.52;
        col += uColorB * b * 0.46;
        col += uColorC * c * 0.34;
        col += uColorD * d * 0.24;

        float wave = sin((uv.x + uv.y) * 12.0 + uTime * 0.8) * 0.035;
        col += wave;
        col = mix(col, vec3(0.02, 0.025, 0.06), 0.26);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (event) => {
    uniforms.uMouse.value.set(event.clientX / window.innerWidth, 1.0 - event.clientY / window.innerHeight);
  });

  function animate(time) {
    uniforms.uTime.value = time * 0.001;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  animate(0);
}

async function boot() {
  initLiquidBackground();
  const users = await loadUsers();
  const profiles = flattenUserPhotos(users);
  zone.innerHTML = '';
  createStrip('one', 0, profiles);
  createStrip('two', 2, profiles);
  createStrip('three', 4, profiles);
  createStrip('four', 6, profiles);
  loadingNote?.classList.add('hidden');
}

document.addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
  enterPage();
});

boot();
