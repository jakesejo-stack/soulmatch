"use strict";

(() => {
  let xrSession = null;
  let xrRefSpace = null;
  let gl = null;
  let canvas = null;

  const btn = document.getElementById("startWebXRBtn");
  const out = document.getElementById("locationOutput");

  async function isSupported() {
    return !!navigator.xr && await navigator.xr.isSessionSupported("immersive-ar");
  }

  async function startWebXR() {
    if (!await isSupported()) {
      out.innerHTML = "<b>WebXR AR not supported on this browser/device.</b><br>Use Android Chrome with HTTPS.";
      return;
    }

    canvas = document.createElement("canvas");
    canvas.className = "webxr-canvas";
    document.getElementById("povScreen").appendChild(canvas);

    gl = canvas.getContext("webgl", { xrCompatible: true, alpha: true });

    xrSession = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body }
    });

    await gl.makeXRCompatible();

    xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(xrSession, gl)
    });

    xrRefSpace = await xrSession.requestReferenceSpace("local");

    xrSession.requestAnimationFrame(onXRFrame);

    out.innerHTML = "<b>WebXR AR active.</b> 3D object layer started.";
  }

  function onXRFrame(time, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);

    const pose = frame.getViewerPose(xrRefSpace);
    if (!pose) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // demo AR object placeholder
    drawFakeARObject();
  }

  function drawFakeARObject() {
    // prototype visual pulse, real 3D mesh step comes next
    const screen = document.getElementById("povScreen");
    screen.classList.add("webxr-active");
  }

  btn?.addEventListener("click", startWebXR);

  window.SoulWebXR = {
    start: startWebXR,
    isSupported
  };
})();
