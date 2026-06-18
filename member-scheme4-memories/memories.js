'use strict';

const memoryList = document.getElementById('memoryList');
const clearBtn = document.getElementById('clearMemories');

const STORAGE_KEY = 'soul_memory_route';

let route = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let userMarker = null;
let routeLine = null;

const map = L.map('memoryMap', {
  zoomControl: false
}).setView([42.6817, 26.3229], 13);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

function saveRoute() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(route));
}

function getRangeDays(range) {
  if (range === '0-6') return [0, 6];
  if (range === '6-12') return [6, 12];
  if (range === '12-23') return [12, 23];
  if (range === '23-100') return [23, 100];
  if (range === '100+') return [100, Infinity];
  return [0, Infinity];
}

function filterRoute(range = '0-6') {
  const now = Date.now();
  const [min, max] = getRangeDays(range);

  return route.filter(item => {
    const days = (now - item.time) / 86400000;
    return days >= min && days <= max;
  });
}

function addMemoryPoint(lat, lng, accuracy) {
  const last = route[route.length - 1];

  if (last) {
    const sameArea =
      Math.abs(last.lat - lat) < 0.00015 &&
      Math.abs(last.lng - lng) < 0.00015;

    if (sameArea) return;
  }

  route.push({
    lat,
    lng,
    title: 'Live activity',
    city: 'Current area',
    range: 'now',
    text: `Saved movement point. Accuracy ~${Math.round(accuracy || 0)}m.`,
    status: 'tracking',
    time: Date.now()
  });

  route = route.slice(-500);
  saveRoute();
}

function renderRoute(range = '0-6') {
  const memories = filterRoute(range);

  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }

  const points = memories.map(m => [m.lat, m.lng]);

  if (points.length > 1) {
    routeLine = L.polyline(points, {
      weight: 4,
      opacity: 0.85
    }).addTo(map);
  }

  memories.forEach(m => {
    if (m._marker) return;

    m._marker = L.circleMarker([m.lat, m.lng], {
      radius: 7,
      weight: 2,
      fillOpacity: 0.9
    }).addTo(map).bindPopup(`
      <b>${m.title}</b><br>
      ${m.city}<br>
      ${new Date(m.time).toLocaleString()}
    `);
  });

  memoryList.innerHTML = memories.slice().reverse().map(m => `
    <div class="memory">
      <b>${m.title}</b>
      <span>${m.city} · ${m.range}</span>
      <p>${m.text}</p>
      <small>${m.status} · ${new Date(m.time).toLocaleString()}</small>
    </div>
  `).join('') || '<p>No memories yet. Allow location and start moving.</p>';
}

function startTracking() {
  if (!navigator.geolocation) {
    memoryList.innerHTML = '<p>GPS is not supported on this device.</p>';
    return;
  }

  navigator.geolocation.watchPosition(
    position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      if (!userMarker) {
        userMarker = L.marker([lat, lng])
          .addTo(map)
          .bindPopup('You are here');

        map.setView([lat, lng], 16);
      } else {
        userMarker.setLatLng([lat, lng]);
      }

      addMemoryPoint(lat, lng, accuracy);

      const activeRange =
        document.querySelector('.filters button.active')?.dataset.range || '0-6';

      renderRoute(activeRange);
    },
    () => {
      memoryList.innerHTML = '<p>Allow location permission to start Memory Map tracking.</p>';
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    }
  );
}

document.querySelectorAll('.filters button[data-range]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filters button[data-range]')
      .forEach(btn => btn.classList.remove('active'));

    button.classList.add('active');
    renderRoute(button.dataset.range);
  });
});

clearBtn.addEventListener('click', () => {
  route = [];
  saveRoute();
  location.reload();
});

renderRoute('0-6');
startTracking();
