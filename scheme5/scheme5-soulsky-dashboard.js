'use strict';

(function () {
  const canvas = document.getElementById('soulflameSkyCanvas');
  const zodiacName = document.getElementById('dashZodiacName');
  const zodiacSymbol = document.getElementById('dashZodiacSymbol');
  const zodiacText = document.getElementById('dashZodiacText');
  const echoType = document.getElementById('dashEchoType');
  const echoSummary = document.getElementById('dashEchoSummary');
  const echoScore = document.getElementById('dashEchoScore');
  const matchesLane = document.getElementById('possibleMatchesLane');

  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  let width = 0;
  let height = 0;
  let dpr = 1;
  let pulse = 0;

  const ZODIACS = {
    aries: { name: 'Aries', bg: 'rgba(255,135,150,', symbol: '♈', pts: [[-.30,.04],[-.10,-.12],[.15,-.04],[.34,.08]], text: 'Fire constellation energy: direct, brave, immediate.' },
    taurus: { name: 'Taurus', bg: 'rgba(255,220,150,', symbol: '♉', pts: [[-.38,-.08],[-.18,.12],[.02,.18],[.16,0],[.34,-.18],[.45,-.34]], text: 'Earth constellation energy: loyal, steady, sensual.' },
    gemini: { name: 'Gemini', bg: 'rgba(150,200,255,', symbol: '♊', pts: [[-.28,-.32],[-.20,.28],[.02,-.26],[.12,.31],[.33,-.16],[.40,.30]], text: 'Air constellation energy: curious, quick, mentally alive.' },
    cancer: { name: 'Cancer', bg: 'rgba(130,230,255,', symbol: '♋', pts: [[0,-.30],[0,0],[-.22,.34],[.24,.34]], text: 'Water constellation energy: protective, intuitive, deeply attached.' },
    leo: { name: 'Leo', bg: 'rgba(255,145,120,', symbol: '♌', pts: [[-.42,.28],[-.20,.24],[.02,.02],[-.02,-.30],[.23,-.26],[.42,.02],[.26,.30]], text: 'Fire constellation energy: warm, proud, expressive.' },
    virgo: { name: 'Virgo', bg: 'rgba(200,255,210,', symbol: '♍', pts: [[-.42,-.22],[-.22,-.04],[-.04,.32],[.20,.02],[.43,.12],[.30,.38]], text: 'Earth constellation energy: precise, careful, healing.' },
    libra: { name: 'Libra', bg: 'rgba(215,190,255,', symbol: '♎', pts: [[0,-.34],[-.28,.02],[.28,.02],[0,.34]], text: 'Air constellation energy: balance, beauty, emotional symmetry.' },
    scorpio: { name: 'Scorpio', bg: 'rgba(255,90,155,', symbol: '♏', pts: [[-.48,-.22],[-.30,-.26],[-.08,-.10],[.04,.22],[-.02,.46],[.24,.55],[.45,.40]], text: 'Water constellation energy: intense, private, magnetic.' },
    sagittarius: { name: 'Sagittarius', bg: 'rgba(255,225,145,', symbol: '♐', pts: [[-.30,.22],[-.18,-.10],[.08,-.20],[.30,.08],[0,.40],[.44,-.16]], text: 'Fire constellation energy: freedom, vision, exploration.' },
    capricorn: { name: 'Capricorn', bg: 'rgba(155,255,220,', symbol: '♑', pts: [[-.42,-.22],[-.18,.24],[.20,.32],[.48,-.12],[.04,-.08]], text: 'Earth constellation energy: discipline, ambition, long-term love.' },
    aquarius: { name: 'Aquarius', bg: 'rgba(120,220,255,', symbol: '♒', pts: [[-.42,-.08],[-.24,-.16],[-.06,.04],[.20,-.04],[.34,.18],[.50,.10]], text: 'Air constellation energy: future-minded, unusual, independent.' },
    pisces: { name: 'Pisces', bg: 'rgba(190,160,255,', symbol: '♓', pts: [[-.44,.38],[-.22,.10],[.06,.02],[.34,.28],[.48,-.06],[.28,-.42]], text: 'Water constellation energy: dreamy, empathic, spiritual.' }
  };

  const aliases = {
    rak: 'cancer', рак: 'cancer', cancer: 'cancer', '♋': 'cancer',
    oven: 'aries', овен: 'aries', aries: 'aries',
    telec: 'taurus', telets: 'taurus', телец: 'taurus', taurus: 'taurus',
    bliznaci: 'gemini', близнаци: 'gemini', gemini: 'gemini',
    luv: 'leo', lav: 'leo', лъв: 'leo', leo: 'leo',
    deva: 'virgo', дева: 'virgo', virgo: 'virgo',
    vezni: 'libra', везни: 'libra', libra: 'libra',
    skorpion: 'scorpio', скорпион: 'scorpio', scorpio: 'scorpio', scorpius: 'scorpio',
    strelec: 'sagittarius', стрелец: 'sagittarius', sagittarius: 'sagittarius',
    kozirog: 'capricorn', козирог: 'capricorn', capricorn: 'capricorn', capricornus: 'capricorn',
    vodolei: 'aquarius', водолей: 'aquarius', aquarius: 'aquarius',
    ribi: 'pisces', риби: 'pisces', pisces: 'pisces'
  };

  function normalizeZodiac(raw) {
    const cleaned = String(raw || '').trim().toLowerCase();
    return aliases[cleaned] || 'cancer';
  }

  let activeKey = 'cancer';
  let active = ZODIACS[activeKey];

  const rand = (() => {
    let seed = 260606;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  })();

  const stars = Array.from({ length: 520 }, () => ({
    x: rand(),
    y: rand(),
    r: .25 + rand() * 1.7,
    a: .12 + rand() * .86,
    s: .25 + rand() * 1.6,
    d: .65 + rand() * .9
  }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  function constellationPoint([x, y]) {
    const scale = Math.min(width, height) * .46;
    return [width * .38 + x * scale, height * .48 + y * scale];
  }

  function drawSky(t) {
    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#000001');
    bg.addColorStop(.52, '#01020a');
    bg.addColorStop(1, '#000001');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const haze = ctx.createRadialGradient(width * .42, height * .46, 0, width * .42, height * .46, Math.max(width, height) * .62);
    haze.addColorStop(0, `${active.bg}${.08 + pulse * .06})`);
    haze.addColorStop(.28, 'rgba(255,255,255,.018)');
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    stars.forEach((star, index) => {
      const drift = Math.sin(t * .045 + index) * 14 * star.d;
      const x = (star.x * width + drift + width) % width;
      const y = (star.y * height + Math.cos(t * .04 + index * .5) * 10 * star.d + height) % height;
      const alpha = Math.max(.04, star.a + Math.sin(t * star.s + index) * .12);
      const glow = star.r * 7;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, glow);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(.35, `${active.bg}${alpha * .22})`);
      g.addColorStop(1, `${active.bg}0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    const pts = active.pts.map(constellationPoint);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.6 + pulse * 1.2;
    ctx.strokeStyle = `${active.bg}${.48 + pulse * .24})`;
    ctx.shadowBlur = 18 + pulse * 18;
    ctx.shadowColor = `${active.bg}.48)`;
    ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();

    pts.forEach(([x, y], i) => {
      const r = 2.8 + Math.sin(t * 1.5 + i) * .5 + pulse * 1.6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 9);
      g.addColorStop(0, 'rgba(255,255,255,.98)');
      g.addColorStop(.28, `${active.bg}.55)`);
      g.addColorStop(1, `${active.bg}0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.font = '900 12px Syne, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.40)';
    ctx.shadowBlur = 18;
    ctx.shadowColor = `${active.bg}.42)`;
    ctx.fillText(active.name.toUpperCase(), width * .38, height * .22);
    ctx.restore();
  }

  function animate(now) {
    const t = now * .001;
    pulse *= .94;
    drawSky(t);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  function setMatches(type) {
    const matchSets = {
      'Steady Flame': ['Loyal Flame · 91%', 'Mirror Flame · 86%', 'Deep Flame · 82%', 'Calm Flame · 79%', 'Soft Flame · 76%'],
      'Deep Flame': ['Mirror Flame · 94%', 'Magnetic Flame · 89%', 'Loyal Flame · 84%', 'Silent Flame · 78%', 'Steady Flame · 76%'],
      'Silent Flame': ['Calm Flame · 90%', 'Steady Flame · 85%', 'Loyal Flame · 81%', 'Mirror Flame · 77%', 'Deep Flame · 72%'],
      'Mirror Flame': ['Deep Flame · 95%', 'Steady Flame · 88%', 'Loyal Flame · 83%', 'Magnetic Flame · 80%', 'Calm Flame · 78%'],
      'Loyal Flame': ['Steady Flame · 93%', 'Mirror Flame · 86%', 'Calm Flame · 84%', 'Deep Flame · 79%', 'Silent Flame · 75%'],
      'Magnetic Flame': ['Deep Flame · 90%', 'Mirror Flame · 87%', 'Steady Flame · 80%', 'Loyal Flame · 76%', 'Silent Flame · 70%']
    };
    const list = matchSets[type] || matchSets['Steady Flame'];
    const doubled = [...list, ...list];
    if (matchesLane) matchesLane.innerHTML = doubled.map(item => `<span>${item}</span>`).join('');
  }

  function render(user, draftGetter) {
    const profile = user?.profile || {};
    const draft = typeof draftGetter === 'function' ? draftGetter() : null;
    const echo = user?.echoProfile?.result || draft?.result || {};
    const key = normalizeZodiac(profile.zodiac || localStorage.getItem('soulmatchZodiac') || 'Cancer');

    activeKey = key;
    active = ZODIACS[activeKey] || ZODIACS.cancer;
    pulse = 1;

    if (zodiacName) zodiacName.textContent = active.name;
    if (zodiacSymbol) zodiacSymbol.textContent = active.symbol;
    if (zodiacText) zodiacText.textContent = profile.zodiac ? active.text : `${active.text} Add/edit zodiac later from profile settings.`;

    const type = echo.type || 'Steady Flame';
    if (echoType) echoType.textContent = type;
    if (echoSummary) echoSummary.textContent = echo.summary || 'Your EchoProfile is attached. SoulMatch now uses it as your first Match DNA.';
    if (echoScore) echoScore.textContent = `Echo Score · ${echo.echoScore || 80}%`;
    setMatches(type);
  }

  window.SoulFlameDashboard = { render, pulse: () => { pulse = 1; } };
})();
