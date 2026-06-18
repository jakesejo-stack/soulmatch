"use strict";

(() => {
  const els = {
    use: document.getElementById("useLocationBtn"),
    watch: document.getElementById("watchLocationBtn"),
    stop: document.getElementById("stopWatchBtn"),
    save: document.getElementById("savePrivateLocationBtn"),
    openCamera: document.getElementById("openCameraBtn"),
    out: document.getElementById("locationOutput"),
    coords: document.getElementById("povCoords"),
    gps: document.getElementById("gpsStatus"),
    move: document.getElementById("movementStatus"),
    mapsLink: document.getElementById("mapsLink"),
    streetLink: document.getElementById("streetViewLink"),
    frame: document.getElementById("googleMapFrame"),
    povScreen: document.getElementById("povScreen"),
    cameraVideo: document.getElementById("arCameraVideo"),
    mini: document.getElementById("miniMap"),
    reset: document.getElementById("resetPovBtn"),
    avatarForm: document.getElementById("avatarForm"),
    avatarFile: document.getElementById("avatarFile"),
    avatarPreview: document.getElementById("avatarPreview"),
    avatarOutput: document.getElementById("avatarOutput"),
    section: document.getElementById("liveMapSection")
  };

  const state = {
    real: null,
    pov: null,
    heading: 0,
    watchId: null,
    stepMeters: 12,
    cameraStream: null
  };

  function fmt(n, d = 6) {
    return Number(n).toFixed(d);
  }

  function mapsUrl(lat, lng, z = 19) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=${z}&output=embed`;
  }

  function openMapsUrl(lat, lng) {
    return `https://www.google.com/maps/@${lat},${lng},19z`;
  }

  function streetUrl(lat, lng) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  }

  function approxLocation(loc) {
    if (!loc) return null;
    return {
      lat: Number(loc.lat).toFixed(4),
      lng: Number(loc.lng).toFixed(4),
      accuracy: Math.round(Number(loc.accuracy || 0))
    };
  }

  function exactLocation(loc) {
    if (!loc) return null;
    return {
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      accuracy: Math.round(Number(loc.accuracy || 0)),
      heading: loc.heading ?? null,
      speed: loc.speed ?? null,
      timestamp: loc.timestamp || Date.now()
    };
  }

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      els.out.textContent = "Camera API not supported in this browser.";
      return;
    }

    try {
      els.out.textContent = "Opening AR camera...";

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      state.cameraStream = stream;
      els.cameraVideo.srcObject = stream;
      els.povScreen.classList.add("camera-active");
      els.out.innerHTML = "<b>AR camera active.</b> HUD engine is now running.";
    } catch (err) {
      els.out.textContent = "Camera blocked or unavailable: " + err.message;
    }
  }

  function render() {
    if (!state.pov) {
      els.coords.textContent = "Waiting for coordinates...";
      return;
    }

    const { lat, lng, accuracy } = state.pov;

    els.coords.innerHTML = `
      <b>AR POV:</b> ${fmt(lat)}, ${fmt(lng)} · accuracy ~${Math.round(accuracy || 0)}m<br>
      <b>Heading:</b> ${Math.round(state.heading)}° · <b>Move:</b> WASD / arrows / touch<br>
      <b>Public:</b> ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)} approximate
    `;

    els.out.innerHTML = `
      <b>Real GPS locked:</b> ${fmt(lat)}, ${fmt(lng)} · accuracy ~${Math.round(accuracy || 0)}m<br>
      <b>AR:</b> camera view + map HUD active.
    `;

    els.gps.textContent = `GPS ${Math.round(accuracy || 0)}m`;
    els.move.textContent = `POV ${Math.round(state.heading)}°`;
    els.mapsLink.href = openMapsUrl(lat, lng);
    els.streetLink.href = streetUrl(lat, lng);
    els.frame.src = mapsUrl(lat, lng, 19);
    els.mini.innerHTML = `<span>You are here · ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}</span>`;
    els.povScreen.style.setProperty("--heading", `${state.heading}deg`);
  }

  function setLocation(coords, fromWatch = false) {
    const loc = exactLocation({
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp: Date.now()
    });

    state.real = loc;
    state.pov = { ...loc };

    if (Number.isFinite(coords.heading)) state.heading = coords.heading;

    render();

    if (fromWatch) els.gps.textContent = "GPS live";
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      els.out.textContent = "Geolocation is not supported by this browser.";
      return;
    }

    els.out.textContent = "Requesting location permission...";

    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(pos.coords),
      (err) => {
        els.out.textContent = "Location blocked or unavailable: " + err.message;
        els.gps.textContent = "GPS blocked";
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function watchLocation() {
    if (!navigator.geolocation) return requestLocation();

    if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);

    els.out.textContent = "Live tracking started...";

    state.watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation(pos.coords, true),
      (err) => {
        els.out.textContent = "Live tracking error: " + err.message;
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }

  function stopWatch() {
    if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    els.gps.textContent = state.pov ? "GPS locked" : "GPS idle";
  }

  function offset(lat, lng, northMeters, eastMeters) {
    const dLat = northMeters / 111320;
    const dLng = eastMeters / (111320 * Math.cos(lat * Math.PI / 180));
    return { lat: lat + dLat, lng: lng + dLng };
  }

  function move(dir) {
    if (!state.pov) return requestLocation();

    let north = 0;
    let east = 0;

    if (dir === "forward") north = state.stepMeters;
    if (dir === "back") north = -state.stepMeters;
    if (dir === "left") east = -state.stepMeters;
    if (dir === "right") east = state.stepMeters;

    const next = offset(state.pov.lat, state.pov.lng, north, east);

    state.pov.lat = next.lat;
    state.pov.lng = next.lng;
    state.pov.accuracy = state.real?.accuracy || state.pov.accuracy || 0;

    render();
  }

  function turn(side) {
    state.heading = (state.heading + (side === "right" ? 15 : -15) + 360) % 360;
    render();
  }

  function resetPov() {
    if (!state.real) return requestLocation();
    state.pov = { ...state.real };
    render();
  }

  async function savePrivateLocation() {
    if (!state.real) return requestLocation();

    try {
      const r = await fetch("/api/location/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: state.real, pov: state.pov, heading: state.heading })
      });

      const d = await r.json();

      if (!d.ok) throw new Error(d.error || "Save failed");

      els.out.innerHTML += `<br><b>Saved:</b> private location session saved.`;
    } catch (error) {
      els.out.innerHTML += `<br><b>Save needs login/server:</b> ${error.message}`;
    }
  }

  async function uploadAvatar(e) {
    e.preventDefault();

    const file = els.avatarFile.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);

    if (file.type.startsWith("image/")) {
      els.avatarPreview.src = localUrl;
    }

    els.avatarOutput.textContent = "Local avatar preview loaded.";
  }

  function bindHold(button, fn) {
    let t = null;

    const start = (e) => {
      e.preventDefault();
      fn();
      t = setInterval(fn, 260);
    };

    const stop = () => {
      if (t) clearInterval(t);
      t = null;
    };

    button.addEventListener("pointerdown", start);
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => {
      button.addEventListener(ev, stop);
    });
  }

  els.openCamera?.addEventListener("click", openCamera);
  els.use?.addEventListener("click", requestLocation);
  els.watch?.addEventListener("click", watchLocation);
  els.stop?.addEventListener("click", stopWatch);
  els.save?.addEventListener("click", savePrivateLocation);
  els.reset?.addEventListener("click", resetPov);
  els.avatarForm?.addEventListener("submit", uploadAvatar);

  document.querySelectorAll("[data-move]").forEach(btn => {
    bindHold(btn, () => move(btn.dataset.move));
  });

  document.querySelectorAll("[data-turn]").forEach(btn => {
    bindHold(btn, () => turn(btn.dataset.turn));
  });

  document.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

    const keys = {
      w: "forward",
      ArrowUp: "forward",
      s: "back",
      ArrowDown: "back",
      a: "left",
      ArrowLeft: "left",
      d: "right",
      ArrowRight: "right"
    };

    if (keys[e.key]) {
      e.preventDefault();
      move(keys[e.key]);
    }

    if (e.key === "q") turn("left");
    if (e.key === "e") turn("right");
  });

  window.SoulARMap = {
    requestLocation,
    watchLocation,
    stopWatch,
    resetPov,
    openCamera,
    getExactLocation: () => state.real,
    getPublicLocation: () => approxLocation(state.real),
    focusEngine: () => els.section?.classList.add("engine-ready")
  };
})();
