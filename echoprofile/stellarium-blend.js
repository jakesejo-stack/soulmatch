(() => {
  const canvas = document.getElementById('cosmicEngineCanvas');
  const label = document.getElementById('engineLabel');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let width = 0;
  let height = 0;
  let dpr = 1;

  const rng = (seed) => {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  };
  const random = rng(20260606);

  const palette = {
    white: [255,255,255],
    blue: [148,194,255],
    violet: [205,182,255],
    rose: [255,160,220],
    gold: [255,214,144],
    aqua: [128,232,255],
    coral: [255,152,126],
    mint: [190,255,205]
  };

  const rgba = (arr, a) => `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`;

  const targets = [
    { name:'Aries', color: palette.rose, x:-980, y:-540, pts:[[-34,0],[-8,-22],[22,-10],[48,12]] },
    { name:'Taurus', color: palette.gold, x:-530, y:-640, pts:[[-55,-10],[-26,18],[0,30],[18,2],[48,-24],[70,-48]] },
    { name:'Gemini', color: palette.blue, x:-90, y:-580, pts:[[-38,-56],[-20,45],[8,-45],[28,54],[58,-30],[76,52]] },
    { name:'Cancer', color: palette.aqua, x:360, y:-620, pts:[[0,-42],[0,0],[-32,58],[36,58]] },
    { name:'Leo', color: palette.coral, x:840, y:-510, pts:[[-70,48],[-32,40],[4,8],[-6,-42],[34,-36],[70,8],[42,52]] },
    { name:'Virgo', color: palette.mint, x:-840, y:-120, pts:[[-70,-42],[-36,-8],[-6,54],[34,2],[76,22],[48,70]] },
    { name:'Libra', color: palette.violet, x:-320, y:-80, pts:[[0,-58],[-42,4],[42,4],[0,62]] },
    { name:'Scorpius', color: palette.rose, x:210, y:-80, pts:[[-80,-38],[-48,-46],[-12,-18],[8,35],[-4,78],[42,94],[78,70]] },
    { name:'Sagittarius', color: palette.gold, x:740, y:-60, pts:[[-50,40],[-28,-18],[16,-34],[54,18],[4,70],[78,-26]] },
    { name:'Capricornus', color: palette.mint, x:-730, y:390, pts:[[-70,-42],[-26,38],[38,54],[84,-24],[8,-18]] },
    { name:'Aquarius', color: palette.aqua, x:-140, y:420, pts:[[-72,-20],[-38,-30],[-12,4],[34,-10],[58,28],[92,16]] },
    { name:'Pisces', color: palette.violet, x:430, y:430, pts:[[-76,72],[-38,18],[8,4],[54,48],[82,-10],[48,-76]] },
    { name:'Orion', color: palette.white, x:1000, y:360, pts:[[-74,-82],[-20,-18],[8,-10],[38,-4],[82,-74],[8,46],[-50,88],[70,92]] },
    { name:'Andromeda', color: palette.blue, x:-1130, y:170, pts:[[-92,-12],[-42,-2],[10,0],[52,18],[104,28]] },
    { name:'Pegasus', color: palette.violet, x:1140, y:-180, pts:[[-72,-54],[46,-58],[70,48],[-50,58],[-72,-54],[112,-10]] },
    { name:'Lyra', color: palette.white, x:30, y:10, pts:[[0,-48],[-42,-2],[-16,48],[36,38],[54,-12],[0,-48]] },
    { name:'Cygnus', color: palette.blue, x:-1080, y:600, pts:[[0,-98],[0,-38],[0,18],[0,92],[-72,8],[78,2]] },
    { name:'Cassiopeia', color: palette.rose, x:1030, y:650, pts:[[-86,22],[-40,-24],[0,18],[48,-28],[88,16]] }
  ];

  const dust = Array.from({ length: 2600 }, () => ({
    x: -1800 + random() * 3600,
    y: -1200 + random() * 2400,
    z: .28 + random() * 1.8,
    r: .18 + random() * 1.8,
    a: .10 + random() * .78,
    tw: .18 + random() * 1.8,
    tint: random() < .78 ? palette.white : (random() < .5 ? palette.blue : palette.violet)
  }));

  const anchors = [];
  targets.forEach((target) => {
    target.pts.forEach(([px, py], idx) => {
      const star = {
        x: target.x + px,
        y: target.y + py,
        z: 1.0 + random() * .55,
        r: 1.7 + random() * 2.0,
        a: .84 + random() * .14,
        tw: .6 + random() * 1.25,
        tint: target.color,
        name: `${target.name} ${idx + 1}`,
        target: target.name
      };
      dust.push(star);
      anchors.push(star);
    });
  });

  const camera = { x: 0, y: 0, z: .48 };
  const goal = { x: 0, y: 0, z: .48 };
  let active = targets[15];
  let flash = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  function worldToScreen(x, y, z = 1) {
    const zoom = camera.z * z;
    return [width * .5 + (x - camera.x) * zoom, height * .5 + (y - camera.y) * zoom];
  }

  function drawStar(star, t) {
    const [sx, sy] = worldToScreen(star.x, star.y, star.z);
    if (sx < -120 || sx > width + 120 || sy < -120 || sy > height + 120) return;

    const twinkle = Math.max(.04, star.a + Math.sin(t * star.tw + star.x * .01) * .12);
    const radius = Math.max(.25, star.r * camera.z * star.z);
    const glow = radius * (6.5 + Math.sin(t * .8 + star.y * .012) * 1.4);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glow);
    grd.addColorStop(0, rgba([255,255,255], Math.min(.98, twinkle)));
    grd.addColorStop(.20, rgba(star.tint, Math.max(.16, twinkle * .66)));
    grd.addColorStop(1, rgba(star.tint, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, glow, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba([255,255,255], Math.min(1, twinkle));
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawConstellation(target, t) {
    const isActive = active.name === target.name;
    const pts = target.pts.map(([px, py]) => worldToScreen(target.x + px, target.y + py, 1.08));

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = isActive ? 1.8 : 1.0;
    ctx.strokeStyle = rgba(target.color, isActive ? .55 + flash * .14 : .18);
    ctx.shadowBlur = isActive ? 16 : 5;
    ctx.shadowColor = rgba(target.color, isActive ? .52 : .12);
    ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();

    pts.forEach(([x, y], i) => {
      const pulse = 1 + Math.sin(t * 1.4 + i * 1.3) * (isActive ? .16 : .08);
      const radius = (isActive ? 2.6 : 1.8) * pulse;
      const halo = radius * (isActive ? 7.8 : 4.6);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, halo);
      grd.addColorStop(0, rgba([255,255,255], isActive ? .96 : .70));
      grd.addColorStop(.25, rgba(target.color, isActive ? .48 : .18));
      grd.addColorStop(1, rgba(target.color, 0));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, halo, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    const [tx, ty] = worldToScreen(target.x, target.y - 86, 1);
    if (tx > -100 && tx < width + 100 && ty > -80 && ty < height + 80) {
      ctx.save();
      ctx.font = `${isActive ? 700 : 600} ${isActive ? 15 : 12}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba([255,255,255], isActive ? .74 : .28);
      ctx.shadowBlur = isActive ? 16 : 0;
      ctx.shadowColor = rgba(target.color, .35);
      ctx.fillText(target.name, tx, ty);
      ctx.restore();
    }
  }

  function drawReticle(t) {
    const [cx, cy] = worldToScreen(active.x, active.y, 1);
    const r = 48 + Math.sin(t * 1.3) * 4;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = rgba(active.color, .18 + flash * .10);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function jump(randomPick = true, mode = 'out') {
    if (randomPick) {
      let next;
      do { next = targets[Math.floor(Math.random() * targets.length)]; } while (targets.length > 1 && next.name === active.name);
      active = next;
    } else {
      const idx = (targets.findIndex(t => t.name === active.name) + 1) % targets.length;
      active = targets[idx];
    }

    goal.x = active.x + (Math.random() * 120 - 60);
    goal.y = active.y + (Math.random() * 90 - 45);

    // User wants the feeling of moving backward in space and seeing more sky.
    if (mode === 'out') {
      goal.z = .34 + Math.random() * .12; // wider field / more sky visible
    } else {
      goal.z = .54 + Math.random() * .18;
    }

    flash = 1;

    if (label) {
      label.textContent = `SoulSky · ${active.name} · Wide View`;
      label.style.opacity = '1';
      setTimeout(() => { label.style.opacity = '.36'; }, 1500);
    }
  }

  window.SoulMatchSky = {
    jump: (randomPick = true) => jump(randomPick, 'out'),
    next: () => jump(true, 'out'),
    zoomOut: () => jump(true, 'out')
  };
  window.addEventListener('soulmatch:sky-jump', () => jump(true, 'out'));

  function animate(now) {
    const t = now * .001;
    camera.x += (goal.x - camera.x) * .018;
    camera.y += (goal.y - camera.y) * .018;
    camera.z += (goal.z - camera.z) * .024;

    // Keep resting fairly zoomed out
    goal.z += (.46 - goal.z) * .008;
    flash *= .94;

    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#000001');
    bg.addColorStop(.46, '#01020a');
    bg.addColorStop(1, '#000001');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const haze = ctx.createRadialGradient(width * .5, height * .42, 0, width * .5, height * .42, Math.max(width, height) * .7);
    haze.addColorStop(0, `rgba(255,255,255,${.02 + flash * .018})`);
    haze.addColorStop(.36, 'rgba(40,60,160,.028)');
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    dust.forEach((star) => drawStar(star, t));
    targets.forEach((target) => drawConstellation(target, t));
    drawReticle(t);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
  setTimeout(() => jump(false, 'out'), 300);
  setInterval(() => jump(true, 'out'), 24000);
})();
