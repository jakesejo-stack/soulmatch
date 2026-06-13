import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SESSION_KEY = "soulmatch_demo_session";
const DONE_PREFIX = "soulmatch_onboarding_done_";
const STEP_PREFIX = "soulmatch_onboarding_last_step_";
const APP_TARGET_URL = "../scheme3/";
const userKey = () => localStorage.getItem(SESSION_KEY) || "guest";
const doneKey = () => DONE_PREFIX + userKey();
const stepKey = () => STEP_PREFIX + userKey();
const markDone = () => { localStorage.setItem(doneKey(), "true"); localStorage.setItem(stepKey(), "4"); };
const saveStep = step => localStorage.setItem(stepKey(), String(step));
const loadStep = () => Math.min(Math.max(Number(localStorage.getItem(stepKey()) || 0), 0), 4);

let scene, camera, renderer, composer, controls, bloomPass;
let dataNodes, trailSystem, bgStars;
let bloomTarget = 0.55, bloomCurrent = 0.55;
let time = 0;
let currentViz = 0;
let isTransforming = false;
let transformProgress = 0;
let frameCount = 0, lastFpsTime = performance.now();
let dataFlow = true, showTrails = true, autoRotate = true;
let currentStep = loadStep();

const NODE_COUNT = 18000;
const TRAIL_COUNT = 4400;
const TRANSFORM_SPEED = 0.02;
const BLOOM_STRENGTHS = [0.28, 0.55, 0.38];
const STEP_DATA = [
  { name: "Identity Flow", title: "SoulMap", text: "Step 1: identity signal. This saves name, city, birth sky and the first profile core for this user.", stats: [72, 88, 58], viz: 0 },
  { name: "Photos Orbit", title: "Photo Moons", text: "Step 2: photos. Later this layer connects uploaded profile images with Scheme 3 user photo feeds.", stats: [64, 78, 62], viz: 0 },
  { name: "Constellation Lattice", title: "Constellation", text: "Step 3: zodiac sky. This opens astronomy, astrology, mythology and vibe-check constellation logic.", stats: [80, 94, 74], viz: 1 },
  { name: "Vibe Core", title: "Vibe Core", text: "Step 4: emotional setup. This becomes the wisdom/vibe folder and love-style questions.", stats: [76, 82, 81], viz: 1 },
  { name: "Match Dipole", title: "Match Orbit", text: "Step 5: matching signal. This is the final one-time setup step before entering SoulMatch.", stats: [88, 90, 96], viz: 2 }
];
const PALETTES = [
  [0x5bd4f0,0x8be8ff,0x4fb8d0,0x7ec8e3,0x2da8c4,0xa8f5e8,0x6dd4c8,0xcef5ff].map(x=>new THREE.Color(x)),
  [0xe8d5ff,0xd0b4f5,0xffd5e8,0xf5c4d8,0xffffff,0xc8b4e8,0xffe8f5,0xb8a0d8].map(x=>new THREE.Color(x)),
  [0xff2a00,0xff6a00,0xffaa22,0xffdd66,0xffffff,0xff4400,0xff8800,0xffcc44].map(x=>new THREE.Color(x))
];

function hash(n) { return Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1; }
function genFlow(i, count) {
  const t = i / count, bands = 12, band = Math.floor(t * bands), bt = (t * bands) % 1;
  const x = (band / bands - 0.5) * 130, z = Math.sin(band * .9) * 24, y = (bt - .5) * 110;
  return new THREE.Vector3(x + Math.cos(bt * Math.PI * 2 + band * 1.1) * 4, y, z + Math.sin(bt * Math.PI * 3 + band * .7) * (7 + band * .8));
}
function genLattice(i, count) {
  const shells = 5, shell = Math.floor((i / count) * shells), shellT = (i / count * shells) % 1;
  const phi = Math.acos(1 - 2 * shellT), theta = Math.PI * (1 + Math.sqrt(5)) * i, r = 10 + shell * 14;
  const ripple = Math.sin(theta * 4) * Math.cos(phi * 4) * .8;
  return new THREE.Vector3((r+ripple)*Math.sin(phi)*Math.cos(theta),(r+ripple)*Math.sin(phi)*Math.sin(theta),(r+ripple)*Math.cos(phi));
}
function genDipole(i, count) {
  const fieldEnd = Math.floor(count * .45), diskEnd = fieldEnd + Math.floor(count * .38);
  if (i < fieldEnd) {
    const lines = 28, lineIdx = Math.floor(i / (fieldEnd / lines)), lt = (i % Math.ceil(fieldEnd / lines)) / Math.ceil(fieldEnd / lines);
    const r0 = 14 + lineIdx * 3.8, phi = (lineIdx / lines) * Math.PI * 2 + lineIdx * .22, lambda = (lt - .5) * Math.PI * .94;
    const cosL = Math.cos(lambda), r = r0 * cosL * cosL, scatter = (hash(i * 3.1) - .5) * 1.2, sAngle = hash(i * 7.7) * Math.PI * 2;
    return new THREE.Vector3(r*cosL*Math.cos(phi)+Math.cos(sAngle)*scatter*.5, r*Math.sin(lambda), r*cosL*Math.sin(phi)+Math.sin(sAngle)*scatter*.5);
  }
  if (i < diskEnd) {
    const di = i - fieldEnd, dt = di / (diskEnd - fieldEnd), r = 10 * Math.pow(68 / 10, dt), angle = dt * Math.PI * 14 + hash(i * 2.3) * .6;
    return new THREE.Vector3(r*Math.cos(angle), (hash(i*8.1)*2-1) * (3.5*(1-dt*.72)+hash(i*5.9)*1.2), r*Math.sin(angle));
  }
  const ji = i - diskEnd, half = Math.floor((count - diskEnd) / 2), sign = ji < half ? 1 : -1, jt = (ji % half) / half;
  const height = sign * jt * 78, spread = jt * jt * 7.5, angle = hash(i * 4.3) * Math.PI * 2 + jt * Math.PI * 4, r = hash(i * 9.1) * spread;
  return new THREE.Vector3(r*Math.cos(angle), height, r*Math.sin(angle));
}
const GENERATORS = [genFlow, genLattice, genDipole];

function assignProps(i, colors, sizes, viz) {
  const pal = PALETTES[viz];
  let color = pal[i % pal.length], brightness = .6 + Math.random() * .7;
  if (viz === 0) color = pal[Math.floor((i / NODE_COUNT) * 12) % pal.length];
  if (viz === 1) color = pal[Math.floor((i / NODE_COUNT) * 5) % pal.length];
  colors[i*3] = color.r * brightness; colors[i*3+1] = color.g * brightness; colors[i*3+2] = color.b * brightness;
  sizes[i] = .45 + Math.random() * (viz === 0 ? 2.2 : 1.7);
}
function makeTexture(size=128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.18,'rgba(255,255,255,.85)'); g.addColorStop(.45,'rgba(200,230,255,.32)'); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,size,size); return new THREE.CanvasTexture(c);
}
function buildDataNodes() {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(NODE_COUNT*3), col = new Float32Array(NODE_COUNT*3), siz = new Float32Array(NODE_COUNT);
  for (let i=0;i<NODE_COUNT;i++) { const p = GENERATORS[currentViz](i,NODE_COUNT); pos[i*3]=p.x; pos[i*3+1]=p.y; pos[i*3+2]=p.z; assignProps(i,col,siz,currentViz); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3)); geo.setAttribute('color', new THREE.BufferAttribute(col,3)); geo.setAttribute('size', new THREE.BufferAttribute(siz,1)); geo.userData.currentColors = new Float32Array(col);
  dataNodes = new THREE.Points(geo, new THREE.PointsMaterial({ size:3, map:makeTexture(), vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
  scene.add(dataNodes);
}
function buildTrails() {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(TRAIL_COUNT*3), col = new Float32Array(TRAIL_COUNT*3), siz = new Float32Array(TRAIL_COUNT), pal = PALETTES[currentViz];
  for (let i=0;i<TRAIL_COUNT;i++) { pos[i*3]=(Math.random()-.5)*120; pos[i*3+1]=(Math.random()-.5)*100; pos[i*3+2]=(Math.random()-.5)*120; const c=pal[Math.floor(Math.random()*pal.length)]; col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; siz[i]=Math.random()*1.5+.3; }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3)); geo.setAttribute('size',new THREE.BufferAttribute(siz,1));
  trailSystem = new THREE.Points(geo, new THREE.PointsMaterial({ size:1.5, map:makeTexture(32), vertexColors:true, transparent:true, opacity:.45, blending:THREE.AdditiveBlending, depthWrite:false }));
  scene.add(trailSystem);
}
function buildBgStars() {
  const geo = new THREE.BufferGeometry(), n=3000, pos=new Float32Array(n*3), col=new Float32Array(n*3);
  for(let i=0;i<n;i++){ const r=250+Math.random()*350, phi=Math.random()*Math.PI*2, th=Math.random()*Math.PI; pos[i*3]=r*Math.sin(th)*Math.cos(phi); pos[i*3+1]=r*Math.sin(th)*Math.sin(phi); pos[i*3+2]=r*Math.cos(th); const v=.08+Math.random()*.18; col[i*3]=v*.7; col[i*3+1]=v*.85; col[i*3+2]=v; }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  bgStars = new THREE.Points(geo, new THREE.PointsMaterial({ size:.8, vertexColors:true, transparent:true, opacity:.6, blending:THREE.AdditiveBlending, depthWrite:false })); scene.add(bgStars);
}
function init() {
  scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x050608, .0008);
  camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, .1, 2000); camera.position.set(0,20,130);
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' }); renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; document.getElementById('container').appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .07; controls.rotateSpeed = .5; controls.zoomSpeed = .8; controls.minDistance = 30; controls.maxDistance = 350; controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = .25;
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene,camera)); bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), .55, .45, .8); composer.addPass(bloomPass); composer.addPass(new OutputPass());
  buildDataNodes(); buildTrails(); buildBgStars(); setupEvents(); setStep(currentStep, false); animate();
}
function animateFlow() {
  if (!dataNodes || isTransforming || !dataFlow) return; const pos = dataNodes.geometry.attributes.position.array;
  if (currentViz === 0) for(let i=0;i<NODE_COUNT;i++){ pos[i*3+1]+=.28; if(pos[i*3+1]>55) pos[i*3+1]-=110; pos[i*3]+=Math.sin(time*1.5+i*.04)*.03; pos[i*3+2]+=Math.cos(time*1.2+i*.04)*.03; }
  else for(let i=0;i<NODE_COUNT;i++){ const sp = currentViz===1 ? .004 : .009, x=pos[i*3], z=pos[i*3+2]; pos[i*3]=x*Math.cos(sp)-z*Math.sin(sp); pos[i*3+2]=x*Math.sin(sp)+z*Math.cos(sp); }
  dataNodes.geometry.attributes.position.needsUpdate = true;
}
function animateTrails() {
  if (!trailSystem || !showTrails) return; const pos = trailSystem.geometry.attributes.position.array;
  for(let i=0;i<TRAIL_COUNT;i++){ const ix=i*3, iy=ix+1, iz=ix+2; if(currentViz===0){ pos[iy]+=.35; if(pos[iy]>55) pos[iy]=-55; } else { const sp=.007, x=pos[ix], z=pos[iz]; pos[ix]=x*Math.cos(sp)-z*Math.sin(sp); pos[iz]=x*Math.sin(sp)+z*Math.cos(sp); } }
  trailSystem.geometry.attributes.position.needsUpdate = true;
}
function startTransform(nextViz) {
  if (!dataNodes || isTransforming || nextViz === currentViz) return; isTransforming = true; transformProgress = 0;
  const pos=dataNodes.geometry.attributes.position.array, col=dataNodes.geometry.attributes.color.array, siz=dataNodes.geometry.attributes.size.array;
  const fromPos=new Float32Array(pos), fromCol=new Float32Array(dataNodes.geometry.userData.currentColors), fromSiz=new Float32Array(siz), toPos=new Float32Array(NODE_COUNT*3), toCol=new Float32Array(NODE_COUNT*3), toSiz=new Float32Array(NODE_COUNT);
  for(let i=0;i<NODE_COUNT;i++){ const p=GENERATORS[nextViz](i,NODE_COUNT); toPos[i*3]=p.x; toPos[i*3+1]=p.y; toPos[i*3+2]=p.z; assignProps(i,toCol,toSiz,nextViz); }
  dataNodes.userData = { fromPos, toPos, fromCol, toCol, fromSiz, toSiz, targetViz: nextViz };
}
function updateFps(){ frameCount++; const now=performance.now(); if(now-lastFpsTime>=1000){ document.getElementById('fps-display').textContent=Math.round(frameCount*1000/(now-lastFpsTime)); frameCount=0; lastFpsTime=now; } }
function updateStats(step){ const [identity,signal,match]=STEP_DATA[step].stats; [['identity',identity],['signal',signal],['match',match]].forEach(([k,v])=>{ document.getElementById(`${k}-fill`).style.width=v+'%'; document.getElementById(`${k}-val`).textContent=v+'%'; }); }
function setStep(step, shouldTransform=true){ currentStep=step; const data=STEP_DATA[step]; document.querySelectorAll('.option-planet').forEach(btn=>btn.classList.toggle('active', Number(btn.dataset.step)===step)); document.getElementById('mode-display').textContent=data.name; document.getElementById('progress-display').textContent=`${step+1} / 5`; document.getElementById('step-title').textContent=data.title; document.getElementById('step-text').textContent=data.text; document.getElementById('execute-btn').textContent=step===4?'▶ Complete Setup':'▶ Next Step'; updateStats(step); saveStep(step); if(shouldTransform) startTransform(data.viz); else currentViz=data.viz; }
function finishOnboarding(){ markDone(); document.getElementById('complete-modal').classList.remove('hidden'); }
function animate(){ requestAnimationFrame(animate); time+=.01; updateFps(); controls.autoRotate=autoRotate; controls.update(); bloomTarget=BLOOM_STRENGTHS[currentViz]; bloomCurrent+=(bloomTarget-bloomCurrent)*.04; if(bloomPass) bloomPass.strength=bloomCurrent; if(bgStars){bgStars.rotation.y+=.0002; bgStars.rotation.x+=.00008;}
  if(isTransforming){ transformProgress+=TRANSFORM_SPEED; const ud=dataNodes.userData, pos=dataNodes.geometry.attributes.position.array, col=dataNodes.geometry.attributes.color.array, siz=dataNodes.geometry.attributes.size.array; if(transformProgress>=1){ pos.set(ud.toPos); col.set(ud.toCol); siz.set(ud.toSiz); dataNodes.geometry.userData.currentColors=new Float32Array(ud.toCol); currentViz=ud.targetViz; isTransforming=false; transformProgress=0; } else { const t=transformProgress, e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; for(let i=0;i<pos.length;i++){ pos[i]=ud.fromPos[i]*(1-e)+ud.toPos[i]*e; col[i]=ud.fromCol[i]*(1-e)+ud.toCol[i]*e; } for(let i=0;i<siz.length;i++) siz[i]=ud.fromSiz[i]*(1-e)+ud.toSiz[i]*e; } dataNodes.geometry.attributes.position.needsUpdate=true; dataNodes.geometry.attributes.color.needsUpdate=true; dataNodes.geometry.attributes.size.needsUpdate=true; } else animateFlow(); animateTrails(); composer.render(); }
function setupEvents(){ window.addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight); }); document.getElementById('flow-pill').onclick=()=>{dataFlow=!dataFlow; document.getElementById('flow-pill').classList.toggle('active',dataFlow);}; document.getElementById('trails-pill').onclick=()=>{showTrails=!showTrails; document.getElementById('trails-pill').classList.toggle('active',showTrails); if(trailSystem) trailSystem.visible=showTrails; document.getElementById('trail-display').textContent=showTrails?'On':'Off';}; document.getElementById('rotate-pill').onclick=()=>{autoRotate=!autoRotate; document.getElementById('rotate-pill').classList.toggle('active',autoRotate);}; document.getElementById('execute-btn').onclick=()=>{ if(isTransforming) return; if(currentStep===4) finishOnboarding(); else setStep(currentStep+1); }; document.querySelectorAll('.option-planet').forEach(btn=>btn.onclick=()=>{ if(!isTransforming) setStep(Number(btn.dataset.step)); }); document.getElementById('skip-btn').onclick=finishOnboarding; document.getElementById('enter-app-btn').onclick=()=>{ window.location.href=APP_TARGET_URL; }; document.getElementById('controls-toggle').onclick=()=>document.getElementById('control-panel').classList.toggle('expanded'); }
window.addEventListener('load', init);
