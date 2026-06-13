'use strict';

const QUESTIONS = [
  { section: 'A / Attachment', text: 'When someone I like pulls away, I start thinking I did something wrong.', key: 'anxious', quote: 'Slow connection is still connection when the energy is honest.' },
  { section: 'A / Attachment', text: 'I need clear signals before I fully relax with someone.', key: 'securityNeed', quote: 'Trust begins where guessing ends.' },
  { section: 'A / Attachment', text: 'I feel calm when connection grows slowly but honestly.', key: 'secure', quote: 'Peace is attractive when your nervous system has known chaos.' },
  { section: 'B / Autonomy', text: 'If someone gets too close too fast, I may pull back even if I like them.', key: 'avoidant', quote: 'Space is not distance when respect stays close.' },
  { section: 'B / Autonomy', text: 'I do not like feeling controlled in a relationship.', key: 'autonomy', quote: 'The right love never asks you to disappear from yourself.' },
  { section: 'B / Autonomy', text: 'I can be close with someone without losing myself.', key: 'secure', quote: 'Fast repair is softer than silent pride.' },
  { section: 'C / Conflict', text: 'In arguments, I want to solve it fast instead of punishing each other.', key: 'communication', quote: 'Coldness is often armor, not truth.' },
  { section: 'C / Conflict', text: 'If I feel attacked, I can become cold or defensive.', key: 'defensive', quote: 'A real apology is a bridge, not a performance.' },
  { section: 'C / Conflict', text: 'I can apologize when I understand I hurt someone.', key: 'repair', quote: 'Some souls hear the room before words arrive.' },
  { section: 'D / Empathy', text: 'I read small changes in tone, face, or energy very fast.', key: 'empathy', quote: 'Depth is not drama; it is the courage to be seen.' },
  { section: 'D / Empathy', text: 'I want deep talks more than random small talk.', key: 'depth', quote: 'Loyalty is romance that repeats itself in actions.' },
  { section: 'D / Empathy', text: 'I care about loyalty, consistency, and respect more than perfect looks.', key: 'values', quote: 'Secrets turn small doubts into storms.' },
  { section: 'E / Jealousy', text: 'If someone hides things, my trust drops very quickly.', key: 'jealousy', quote: 'Clear boundaries make soft love feel safe.' },
  { section: 'E / Jealousy', text: 'I can trust someone when boundaries are clear.', key: 'secure', quote: 'Cinematic love still needs calm hands.' },
  { section: 'F / Romance', text: 'I like love that feels intense, emotional, and almost cinematic.', key: 'romance', quote: 'Actions are the language trust understands.' },
  { section: 'F / Romance', text: 'I prefer real actions over dramatic words.', key: 'values', quote: 'A steady flame can still burn beautifully.' }
];

const SCALE = [
  { label: '--', value: -2, text: 'does not describe me' },
  { label: '-', value: -1, text: 'mostly no' },
  { label: '0', value: 0, text: 'depends / neutral' },
  { label: '+', value: 1, text: 'mostly yes' },
  { label: '++', value: 2, text: 'fully describes me' }
];

const introPanel = document.getElementById('introPanel');
const quizPanel = document.getElementById('quizPanel');
const resultPanel = document.getElementById('resultPanel');
const startBtn = document.getElementById('startBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const retakeBtn = document.getElementById('retakeBtn');
const sectionLabel = document.getElementById('sectionLabel');
const questionTitle = document.getElementById('questionTitle');
const questionQuote = document.getElementById('questionQuote');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const scaleBox = document.getElementById('scaleBox');
const resultType = document.getElementById('resultType');
const resultSummary = document.getElementById('resultSummary');
const scoreGrid = document.getElementById('scoreGrid');

const soundToggle = document.getElementById('soundToggle');
const musicInput = document.getElementById('musicInput');
const musicLabel = document.getElementById('musicLabel');

const dropSound = new Audio('../assets/sounds/chill-tap.wav');
dropSound.preload = 'auto';
dropSound.volume = 0.028;
dropSound.playbackRate = 1.0;

let ambientObjectUrl = null;
const ambientSound = new Audio('../assets/sounds/space-relaxation.mp3');
ambientSound.preload = 'auto';
ambientSound.loop = true;
ambientSound.volume = 0.075;

let ambientWanted = localStorage.getItem('soulmatchAmbientEnabled') === 'true';

function updateSoundToggle(isPlaying = !ambientSound.paused) {
  if (!soundToggle) return;
  soundToggle.textContent = isPlaying ? 'Sound on' : 'Sound off';
  soundToggle.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
}

function startAmbient() {
  if (!ambientWanted) return;
  try {
    const promise = ambientSound.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => updateSoundToggle(false));
    updateSoundToggle(true);
  } catch (error) {
    updateSoundToggle(false);
  }
}

function stopAmbient() {
  ambientSound.pause();
  updateSoundToggle(false);
}

function playDropSound(volume = 0.028, rate = 1.0) {
  try {
    const tap = dropSound.cloneNode();
    // Chill tap: clean, soft, no low 'vuum', with tiny pitch variation.
    tap.volume = volume * (0.90 + Math.random() * 0.18);
    tap.playbackRate = rate + (Math.random() * 0.05 - 0.025);
    tap.currentTime = 0;
    const promise = tap.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  } catch (error) {
    // Sound is cosmetic; never block the quiz if the browser refuses audio.
  }
}

function jumpSky() {
  try {
    if (window.SoulMatchSky && typeof window.SoulMatchSky.jump === 'function') window.SoulMatchSky.jump(true);
    else window.dispatchEvent(new CustomEvent('soulmatch:sky-jump'));
  } catch (error) {
    // Background motion is cosmetic.
  }
}

updateSoundToggle(false);
document.addEventListener('pointerdown', () => startAmbient(), { once: true });
if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    playDropSound(0.022, 1.0);
    ambientWanted = !ambientWanted;
    localStorage.setItem('soulmatchAmbientEnabled', String(ambientWanted));
    if (ambientWanted) startAmbient();
    else stopAmbient();
  });
}

if (musicInput) {
  musicInput.addEventListener('change', () => {
    const file = musicInput.files && musicInput.files[0];
    if (!file) return;
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(file.name);
    if (!isAudio) {
      if (musicLabel) musicLabel.textContent = 'Audio only';
      playDropSound(0.018, 0.94);
      return;
    }
    if (ambientObjectUrl) URL.revokeObjectURL(ambientObjectUrl);
    ambientObjectUrl = URL.createObjectURL(file);
    ambientSound.pause();
    ambientSound.src = ambientObjectUrl;
    ambientSound.loop = true;
    ambientSound.volume = 0.085;
    ambientWanted = true;
    localStorage.setItem('soulmatchAmbientEnabled', 'true');
    if (musicLabel) musicLabel.textContent = 'MP3 loaded';
    startAmbient();
    playDropSound(0.024, 1.02);
  });
}

window.addEventListener('beforeunload', () => {
  if (ambientObjectUrl) URL.revokeObjectURL(ambientObjectUrl);
});

let current = 0;
let answers = JSON.parse(localStorage.getItem('soulmatchEchoAnswers') || '[]');
if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) answers = Array(QUESTIONS.length).fill(null);

function show(panel) {
  [introPanel, quizPanel, resultPanel].forEach((item) => item.classList.add('hidden'));
  panel.classList.remove('hidden');
}

function renderQuestion() {
  const question = QUESTIONS[current];
  sectionLabel.textContent = question.section;
  questionTitle.textContent = question.text;
  if (questionQuote) questionQuote.textContent = question.quote || 'The honest answer is the door.';
  progressText.textContent = `${current + 1}/${QUESTIONS.length}`;
  progressBar.style.width = `${((current + 1) / QUESTIONS.length) * 100}%`;
  prevBtn.disabled = current === 0;
  nextBtn.textContent = current === QUESTIONS.length - 1 ? 'Show Result' : 'Next';
  scaleBox.innerHTML = '';
  SCALE.forEach((option) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = answers[current] === option.value ? 'is-selected' : '';
    btn.innerHTML = `<strong>${option.label}</strong><span>${option.text}</span>`;
    btn.addEventListener('click', () => {
      startAmbient();
      playDropSound(0.024, 1.0);
      answers[current] = option.value;
      localStorage.setItem('soulmatchEchoAnswers', JSON.stringify(answers));
      jumpSky();
      renderQuestion();
    });
    scaleBox.appendChild(btn);
  });
}

function addScore(scores, key, value) {
  scores[key] = (scores[key] || 0) + value;
}

function calculate() {
  const raw = {};
  QUESTIONS.forEach((question, index) => addScore(raw, question.key, answers[index] || 0));

  const scores = {
    security: (raw.secure || 0) + (raw.repair || 0) + (raw.communication || 0),
    intensity: (raw.anxious || 0) + (raw.securityNeed || 0) + (raw.romance || 0),
    autonomy: (raw.avoidant || 0) + (raw.autonomy || 0),
    empathy: (raw.empathy || 0) + (raw.depth || 0),
    loyalty: (raw.values || 0) + (raw.jealousy || 0),
    conflictStyle: (raw.defensive || 0) * -1 + (raw.repair || 0) + (raw.communication || 0)
  };

  let type = 'Steady Flame';
  let summary = 'You look for stable energy, clear respect, and a connection that grows without chaos.';
  if (scores.intensity >= 4 && scores.empathy >= 2) {
    type = 'Deep Flame';
    summary = 'You bond deeply, read energy fast, and need honesty before your heart fully relaxes.';
  } else if (scores.autonomy >= 3 && scores.security < 3) {
    type = 'Silent Flame';
    summary = 'You need freedom, space, and someone who does not force closeness before trust is built.';
  } else if (scores.empathy >= 4) {
    type = 'Mirror Flame';
    summary = 'You notice emotional details quickly and match best with someone honest, soft, and emotionally aware.';
  } else if (scores.loyalty >= 4) {
    type = 'Loyal Flame';
    summary = 'You value consistency, boundaries, and real actions more than empty romantic noise.';
  } else if (scores.intensity >= 5) {
    type = 'Magnetic Flame';
    summary = 'You want romance with charge, chemistry, and clear signs that the other person chooses you.';
  }

  const maxPossible = QUESTIONS.length * 2;
  const total = Object.values(scores).reduce((a, b) => a + Math.max(0, b), 0);
  const echoScore = Math.max(38, Math.min(98, Math.round(52 + (total / maxPossible) * 55)));

  return {
    version: 'echo-first-v18-zoom-out-sky',
    createdAt: new Date().toISOString(),
    answers: QUESTIONS.map((q, i) => ({ section: q.section, text: q.text, key: q.key, value: answers[i] || 0 })),
    scores,
    result: { type, summary, echoScore }
  };
}

function displayDraft(draft) {
  resultType.textContent = `${draft.result.type} · ${draft.result.echoScore}%`;
  resultSummary.textContent = draft.result.summary;
  scoreGrid.innerHTML = '';
  Object.entries(draft.scores || {}).forEach(([name, value]) => {
    const card = document.createElement('div');
    card.className = 'score-card';
    card.innerHTML = `<strong>${value}</strong><span>${name.replace(/([A-Z])/g, ' $1')}</span>`;
    scoreGrid.appendChild(card);
  });
  show(resultPanel);
}

function renderResult() {
  const missing = answers.findIndex((answer) => answer === null);
  if (missing !== -1) {
    current = missing;
    renderQuestion();
    show(quizPanel);
    return;
  }
  const draft = calculate();
  localStorage.setItem('soulmatchEchoDraft', JSON.stringify(draft));
  displayDraft(draft);
}

startBtn.addEventListener('click', () => { ambientWanted = true; localStorage.setItem('soulmatchAmbientEnabled', 'true'); startAmbient(); playDropSound(0.026, 1.0); jumpSky(); renderQuestion(); show(quizPanel); });
prevBtn.addEventListener('click', () => { startAmbient(); playDropSound(0.020, 1.0); current = Math.max(0, current - 1); jumpSky(); renderQuestion(); });
nextBtn.addEventListener('click', () => {
  startAmbient();
  playDropSound(answers[current] === null ? 0.018 : 0.024, 1.0);
  if (answers[current] === null) {
    scaleBox.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 180 });
    return;
  }
  if (current < QUESTIONS.length - 1) { current += 1; jumpSky(); renderQuestion(); }
  else renderResult();
});
retakeBtn.addEventListener('click', () => {
  startAmbient();
  playDropSound(0.020, 1.0);
  answers = Array(QUESTIONS.length).fill(null);
  current = 0;
  localStorage.removeItem('soulmatchEchoAnswers');
  localStorage.removeItem('soulmatchEchoDraft');
  renderQuestion();
  show(quizPanel);
});

const existingDraft = localStorage.getItem('soulmatchEchoDraft');
if (existingDraft) {
  try { displayDraft(JSON.parse(existingDraft)); } catch { localStorage.removeItem('soulmatchEchoDraft'); }
}
