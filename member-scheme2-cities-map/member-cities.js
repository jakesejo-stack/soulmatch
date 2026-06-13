"use strict";
const cities = [
  { name: "Sofia", img: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1800&q=85" },
  { name: "Plovdiv", img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85" },
  { name: "Varna", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e8?auto=format&fit=crop&w=1800&q=85" },
  { name: "Burgas", img: "https://images.unsplash.com/photo-1494783367193-149034c05d0b?auto=format&fit=crop&w=1800&q=85" },
  { name: "Stara Zagora", img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85" },
  { name: "Sliven", img: "../assets/cities/sliven-panorama.png" },
  { name: "Ruse", img: "https://thumbs.dreamstime.com/z/city-center-street-view-ruse-bulgaria-city-centre-ruse-bulgaria-pedestrian-street-view-summer-198656949.jpg" },
  { name: "Veliko Tarnovo", img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85" },
  { name: "Live Map", img: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1800&q=85", live: true }
];

const slider = document.getElementById("citySlider");
const nav = document.getElementById("cityNav");
let cur = 0;

cities.forEach((c, i) => {
  const s = document.createElement("div");
  s.className = "city-slide";
  s.style.left = `${i * 100}%`;
  s.style.backgroundImage = `url('${c.img}')`;
  s.innerHTML = c.live
    ? `<div class="city-letter">⌖</div><div class="city-word scroll-cta"><div>LIVE MAP</div><button id="slideScrollBtn" type="button">Tap to enter AR</button></div>`
    : `<div class="city-letter">${c.name[0]}</div><div class="city-word">${c.name}</div>`;
  slider.appendChild(s);
  const li = document.createElement("li");
  li.title = c.name;
  li.onclick = () => go(i);
  nav.appendChild(li);
});

function go(i) {
  cur = Math.max(0, Math.min(cities.length - 1, i));
  slider.style.transform = `translate3d(-${cur * 100}%,0,0)`;
  [...nav.children].forEach((li, n) => li.classList.toggle("active", n === cur));
}
go(0);

function scrollMap() {
  document.body.classList.add("map-activated");
  setTimeout(() => document.body.classList.remove("map-activated"), 1150);
  document.getElementById("liveMapSection").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => window.SoulARMap?.focusEngine?.(), 750);
}

document.getElementById("rightBtn").onclick = () => cur === cities.length - 1 ? scrollMap() : go(cur + 1);
document.getElementById("leftBtn").onclick = () => go(cur - 1);
document.getElementById("mapFloatCta")?.addEventListener("click", scrollMap);
document.addEventListener("click", (e) => { if (e.target.id === "slideScrollBtn") scrollMap(); });

document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (e.key === "ArrowRight") document.getElementById("rightBtn").click();
  if (e.key === "ArrowLeft") document.getElementById("leftBtn").click();
});

let wheelLock = false;
document.addEventListener("wheel", (e) => {
  if (scrollY > 20) return;
  if (wheelLock) return;
  wheelLock = true;
  setTimeout(() => wheelLock = false, 650);
  if (e.deltaY > 0) cur === cities.length - 1 ? scrollMap() : go(cur + 1);
  else go(cur - 1);
}, { passive: true });

let touchStartX = 0, touchStartY = 0;
document.querySelector(".city-cont")?.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
document.querySelector(".city-cont")?.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dy) > 80 && dy < 0) return scrollMap();
  if (Math.abs(dx) > 55) dx < 0 ? document.getElementById("rightBtn").click() : document.getElementById("leftBtn").click();
}, { passive: true });

const mapSection = document.getElementById("liveMapSection");
const observer = new IntersectionObserver((entries) => {
  document.body.classList.toggle("map-visible", entries.some(e => e.isIntersecting));
}, { threshold: .18 });
observer.observe(mapSection);

const UPDATES_KEY = "soulmatch_live_updates";
function getLocalUpdates(){
  try { return JSON.parse(localStorage.getItem(UPDATES_KEY) || "[]"); } catch { return []; }
}
function saveLocalUpdates(updates){ localStorage.setItem(UPDATES_KEY, JSON.stringify(updates)); }
function renderUpdates(updates){
  const list = document.getElementById("updatesList");
  list.innerHTML = (updates || []).map(u => `
    <div class="update-card">
      <b>${u.city || "Around"}</b> · ${u.visibility || "24h"} · ${u.status || "local"}<br>
      ${u.text}<br>
      <small>${new Date(u.createdAt).toLocaleString()}</small>
    </div>`).join("") || "<p>No live updates yet.</p>";
}
async function loadUpdates(range = "24h") {
  try {
    const r = await fetch("/api/live-updates?range=" + encodeURIComponent(range));
    if (!r.ok) throw new Error("No API");
    const d = await r.json();
    renderUpdates(d.updates || []);
  } catch (error) {
    const now = Date.now();
    const maxAge = range === "7d" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    renderUpdates(getLocalUpdates().filter(u => now - new Date(u.createdAt).getTime() <= maxAge));
  }
}

document.getElementById("show24Btn").onclick = () => loadUpdates("24h");
document.getElementById("show7Btn").onclick = () => loadUpdates("7d");
document.getElementById("updateForm").onsubmit = async (e) => {
  e.preventDefault();
  const text = document.getElementById("updateText").value.trim();
  if (!text) return;
  const visibility = document.getElementById("updateVisibility").value;
  const location = window.SoulARMap?.getPublicLocation?.() || null;
  const body = { text, visibility, location, city: location ? "Around my live area" : "Around me", status: "pending/local", createdAt: new Date().toISOString() };
  try {
    const r = await fetch("/api/live-updates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error("No API");
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || "Post failed");
  } catch {
    const updates = getLocalUpdates();
    updates.unshift(body);
    saveLocalUpdates(updates.slice(0, 50));
  }
  document.getElementById("updateText").value = "";
  loadUpdates(visibility);
};

loadUpdates();
