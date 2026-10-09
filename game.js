'use strict';

(() => {
  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const W = 800;
  const H = 640;
  const PX = 3; // size of one sprite "pixel"

  const COLS = 11;
  const ROWS = 5;
  const TOTAL_INVADERS = COLS * ROWS;
  const COL_W = 48;
  const ROW_H = 40;
  const STEP_X = 10;
  const DROP_Y = 16;
  const SIDE_MARGIN = 16;

  const CELL = 4; // bunker cell size
  const BW = 22; // bunker width in cells
  const BH = 16; // bunker height in cells
  const BUNKER_Y = 452;

  const PLAYER_Y = H - 84;
  const GROUND_Y = H - 46;
  const TOP_LIMIT = 56;

  const PLAYER_SPEED = 320;
  const PLAYER_BULLET_SPEED = 640;
  const START_LIVES = 3;
  const MAX_LIVES = 6;

  const COLORS = {
    squid: '#ff5fd7',
    crab: '#4fe3ff',
    octo: '#7dff6b',
    player: '#7dff6b',
    ufo: '#ff4040',
    bunker: '#7dff6b',
    text: '#e8e8ff',
    dim: '#8a8aa8',
    bullet: '#ffffff',
    enemyBullet: '#ffd84f',
  };

  // ---------------------------------------------------------------------------
  // Sprites ('#' = filled pixel)
  // ---------------------------------------------------------------------------
  const SPR = {
    squidA: [
      '...##...',
      '..####..',
      '.######.',
      '##.##.##',
      '########',
      '..#..#..',
      '.#.##.#.',
      '#.#..#.#',
    ],
    squidB: [
      '...##...',
      '..####..',
      '.######.',
      '##.##.##',
      '########',
      '.#.##.#.',
      '#......#',
      '.#....#.',
    ],
    crabA: [
      '..#.....#..',
      '...#...#...',
      '..#######..',
      '.##.###.##.',
      '###########',
      '#.#######.#',
      '#.#.....#.#',
      '...##.##...',
    ],
    crabB: [
      '..#.....#..',
      '#..#...#..#',
      '#.#######.#',
      '###.###.###',
      '###########',
      '.#########.',
      '..#.....#..',
      '.#.......#.',
    ],
    octoA: [
      '....####....',
      '.##########.',
      '############',
      '###..##..###',
      '############',
      '...##..##...',
      '..##.##.##..',
      '##........##',
    ],
    octoB: [
      '....####....',
      '.##########.',
      '############',
      '###..##..###',
      '############',
      '..###..###..',
      '.##..##..##.',
      '..##....##..',
    ],
    player: [
      '......#......',
      '.....###.....',
      '.....###.....',
      '.###########.',
      '#############',
      '#############',
      '#############',
      '#############',
    ],
    playerBoomA: [
      '....#........',
      '..........#..',
      '....#.#..#...',
      '.#....#......',
      '...######..#.',
      '..#########..',
      '.###########.',
      '#############',
    ],
    playerBoomB: [
      '..#......#...',
      '#....#......#',
      '..#..##..#...',
      '......#.#....',
      '#..#######...',
      '..#########.#',
      '.###########.',
      '#############',
    ],
    ufo: [
      '.....######.....',
      '...##########...',
      '..############..',
      '.##.##.##.##.##.',
      '################',
      '..###..##..###..',
      '...#........#...',
    ],
    explosion: [
      '#...#..#...#',
      '.#...##...#.',
      '..#......#..',
      '...#....#...',
      '##........##',
      '...#....#...',
      '..#..#...#..',
      '.#..#.#...#.',
    ],
  };

  function makeSprite(rows, color, scale = PX) {
    const c = document.createElement('canvas');
    c.width = rows[0].length * scale;
    c.height = rows.length * scale;
    const g = c.getContext('2d');
    g.fillStyle = color;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') g.fillRect(x * scale, y * scale, scale, scale);
      }
    });
    return c;
  }

  const TYPES = [
    { frames: [SPR.squidA, SPR.squidB], color: COLORS.squid, points: 30 },
    { frames: [SPR.crabA, SPR.crabB], color: COLORS.crab, points: 20 },
    { frames: [SPR.octoA, SPR.octoB], color: COLORS.octo, points: 10 },
  ];
  TYPES.forEach((t) => {
    t.img = t.frames.map((f) => makeSprite(f, t.color));
    t.w = t.img[0].width;
    t.h = t.img[0].height;
    t.boom = makeSprite(SPR.explosion, t.color);
  });

  const IMG = {
    player: makeSprite(SPR.player, COLORS.player),
    playerBoom: [
      makeSprite(SPR.playerBoomA, COLORS.player),
      makeSprite(SPR.playerBoomB, COLORS.player),
    ],
    ufo: makeSprite(SPR.ufo, COLORS.ufo),
    ufoBoom: makeSprite(SPR.explosion, COLORS.ufo),
    whiteBoom: makeSprite(SPR.explosion, '#ffffff', 2),
    yellowBoom: makeSprite(SPR.explosion, COLORS.enemyBullet, 2),
  };

  // ---------------------------------------------------------------------------
  // Canvas setup
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const pad = (n, len = 5) => String(n).padStart(len, '0');

  // ---------------------------------------------------------------------------
  // Sound (Web Audio, generated on the fly — no assets)
  // ---------------------------------------------------------------------------
  const Sound = {
    ctx: null,
    master: null,
    noiseBuf: null,
    ufoNodes: null,
    muted: localStorage.getItem('si-muted') === '1',
    lastStep: 0,

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.3;
      this.master.connect(this.ctx.destination);

      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    },

    setMuted(m) {
      this.muted = m;
      localStorage.setItem('si-muted', m ? '1' : '0');
      if (this.master) this.master.gain.value = m ? 0 : 0.3;
    },

    tone(freq, dur, { type = 'square', vol = 0.3, slide = null, delay = 0 } = {}) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    noise(dur, { vol = 0.4, freq = 1500, delay = 0 } = {}) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(freq, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(80, freq / 6), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.02);
    },

    shoot() {
      this.tone(1200, 0.14, { type: 'square', vol: 0.12, slide: 180 });
    },
    invaderHit() {
      this.noise(0.22, { vol: 0.35, freq: 4000 });
      this.tone(320, 0.16, { type: 'sawtooth', vol: 0.08, slide: 50 });
    },
    playerHit() {
      this.noise(1.1, { vol: 0.55, freq: 1800 });
      this.tone(220, 1.0, { type: 'sawtooth', vol: 0.12, slide: 30 });
    },
    bunkerHit() {
      this.noise(0.06, { vol: 0.12, freq: 2500 });
    },
    step(i) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastStep < 0.06) return;
      this.lastStep = now;
      const notes = [98, 87, 78, 73];
      this.tone(notes[i % 4], 0.1, { type: 'square', vol: 0.16 });
    },
    ufoHit() {
      for (let k = 0; k < 6; k++) {
        this.tone(500 + k * 150, 0.09, { type: 'square', vol: 0.1, delay: k * 0.06 });
      }
    },
    extraLife() {
      [523, 659, 784, 1047].forEach((f, k) =>
        this.tone(f, 0.12, { type: 'triangle', vol: 0.3, delay: k * 0.08 })
      );
    },
    waveClear() {
      [392, 523, 659, 784, 659, 784].forEach((f, k) =>
        this.tone(f, 0.14, { type: 'square', vol: 0.1, delay: k * 0.1 })
      );
    },
    ufoStart() {
      if (!this.ctx || this.ufoNodes) return;
      const o = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const g = this.ctx.createGain();
      o.type = 'square';
      o.frequency.value = 520;
      lfo.frequency.value = 7;
      lfoGain.gain.value = 140;
      g.gain.value = 0.04;
      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);
      o.connect(g);
      g.connect(this.master);
      o.start();
      lfo.start();
      this.ufoNodes = { o, lfo };
    },
    ufoStop() {
      if (!this.ufoNodes) return;
      try {
        this.ufoNodes.o.stop();
        this.ufoNodes.lfo.stop();
      } catch (_) {
        /* already stopped */
      }
      this.ufoNodes = null;
    },
  };

  // ---------------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------------
  let mode = 'title'; // title | playing | paused | levelclear | gameover
  let prevMode = 'playing';
  let modeTimer = 0;
  let time = 0;

  let score = 0;
  let hiScore = Number(localStorage.getItem('si-hi')) || 0;
  let lives = START_LIVES;
  let level = 1;
  let nextLifeAt = 1500;

  let player;
  let invaders = [];
  let formation;
  let pBullet = null;
  let eBullets = [];
  let bunkers = [];
  let ufo = null;
  let ufoTimer = 0;
  let fireTimer = 0;
  let shake = 0;
  let banner = null;

  let explosions = [];
  let texts = [];
  let particles = [];

  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * W,
    y: rand(TOP_LIMIT, GROUND_Y),
    s: Math.random() < 0.85 ? 1 : 2,
    p: Math.random() * Math.PI * 2,
    sp: rand(0.5, 2.5),
  }));

  const input = { left: false, right: false, fire: false };

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------
  function newPlayer() {
    return {
      x: W / 2 - IMG.player.width / 2,
      y: PLAYER_Y,
      w: IMG.player.width,
      h: IMG.player.height,
      alive: true,
      deadTimer: 0,
      cooldown: 0,
    };
  }

  function makeWave() {
    invaders = [];
    for (let r = 0; r < ROWS; r++) {
      const type = r === 0 ? 0 : r < 3 ? 1 : 2;
      for (let c = 0; c < COLS; c++) invaders.push({ r, c, type, alive: true });
    }
    formation = {
      x: (W - COLS * COL_W) / 2,
      y: 100 + Math.min(level - 1, 6) * 16,
      dir: 1,
      stepTimer: 0.5,
      frame: 0,
      note: 0,
    };
  }

  function makeBunker(x, y) {
    const cells = new Uint8Array(BW * BH);
    for (let r = 0; r < BH; r++) {
      for (let c = 0; c < BW; c++) {
        let on = true;
        const corner = 4 - r;
        if (r < 4 && (c < corner || c >= BW - corner)) on = false;
        const dx = Math.abs(c - (BW - 1) / 2);
        if (r >= BH - 5 && dx < 3) on = false;
        if (r >= BH - 4 && dx < 4) on = false;
        cells[r * BW + c] = on ? 1 : 0;
      }
    }
    const cv = document.createElement('canvas');
    cv.width = BW * CELL;
    cv.height = BH * CELL;
    return { x, y, w: BW * CELL, h: BH * CELL, cells, canvas: cv, dirty: true };
  }

  function makeBunkers() {
    const list = [];
    for (let i = 0; i < 4; i++) {
      const cx = ((i + 0.5) * W) / 4;
      list.push(makeBunker(Math.round(cx - (BW * CELL) / 2), BUNKER_Y));
    }
    return list;
  }

  function setupWave() {
    makeWave();
    bunkers = makeBunkers();
    player = newPlayer();
    pBullet = null;
    eBullets = [];
    ufo = null;
    Sound.ufoStop();
    ufoTimer = rand(14, 24);
    fireTimer = 1.6;
  }

  function startGame() {
    Sound.init();
    score = 0;
    lives = START_LIVES;
    level = 1;
    nextLifeAt = 1500;
    explosions = [];
    texts = [];
    particles = [];
    setupWave();
    banner = { text: 'WAVE 1', sub: 'GET READY', t: 1.8 };
    mode = 'playing';
    hideOverlay();
  }

  function nextWave() {
    level++;
    setupWave();
    banner = { text: `WAVE ${level}`, sub: 'GET READY', t: 1.8 };
    mode = 'playing';
  }

  function gameOver() {
    mode = 'gameover';
    Sound.ufoStop();
    const isNewHi = score > hiScore;
    if (score > hiScore) {
      hiScore = score;
      localStorage.setItem('si-hi', String(hiScore));
    }
    document.getElementById('final-score').textContent = pad(score);
    document.getElementById('new-hi').classList.toggle('hidden', !isNewHi);
    showPanel('gameover');
  }

  function pause() {
    if (mode !== 'playing' && mode !== 'levelclear') return;
    prevMode = mode;
    mode = 'paused';
    showPanel('paused');
    if (Sound.ctx) Sound.ctx.suspend();
  }

  function resume() {
    if (mode !== 'paused') return;
    mode = prevMode;
    hideOverlay();
    Sound.init();
    lastTime = performance.now();
  }

  // ---------------------------------------------------------------------------
  // Overlay
  // ---------------------------------------------------------------------------
  const overlay = document.getElementById('overlay');
  const panels = {
    title: document.getElementById('panel-title'),
    paused: document.getElementById('panel-paused'),
    gameover: document.getElementById('panel-gameover'),
  };

  function showPanel(name) {
    overlay.classList.remove('hidden');
    for (const [k, el] of Object.entries(panels)) el.classList.toggle('hidden', k !== name);
    document.getElementById('title-hi').textContent = pad(hiScore);
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function buildPointsTable() {
    const table = document.getElementById('points-table');
    const rows = [
      [IMG.ufo, '= ? MYSTERY'],
      [TYPES[0].img[0], '= 30 POINTS'],
      [TYPES[1].img[0], '= 20 POINTS'],
      [TYPES[2].img[0], '= 10 POINTS'],
    ];
    for (const [img, label] of rows) {
      const row = document.createElement('div');
      row.className = 'row';
      const im = document.createElement('img');
      im.src = img.toDataURL();
      im.alt = '';
      const span = document.createElement('span');
      span.textContent = label;
      row.append(im, span);
      table.append(row);
    }
  }

  // ---------------------------------------------------------------------------
  // Invader helpers
  // ---------------------------------------------------------------------------
  function invRect(inv) {
    const t = TYPES[inv.type];
    return {
      x: formation.x + inv.c * COL_W + (COL_W - t.w) / 2,
      y: formation.y + inv.r * ROW_H,
      w: t.w,
      h: t.h,
    };
  }

  function aliveInvaders() {
    return invaders.filter((i) => i.alive);
  }

  function stepInterval(aliveCount) {
    const base = 0.018 + 0.56 * (aliveCount / TOTAL_INVADERS);
    return base * Math.max(0.45, 1 - (level - 1) * 0.09);
  }

  function stepFormation(alive) {
    let minX = Infinity;
    let maxX = -Infinity;
    for (const inv of alive) {
      const r = invRect(inv);
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.w);
    }
    const f = formation;
    if (
      (f.dir > 0 && maxX + STEP_X > W - SIDE_MARGIN) ||
      (f.dir < 0 && minX - STEP_X < SIDE_MARGIN)
    ) {
      f.y += DROP_Y;
      f.dir *= -1;
    } else {
      f.x += STEP_X * f.dir;
    }
    f.frame ^= 1;
    Sound.step(f.note++);
  }

  function enemyFire(alive) {
    const maxBullets = Math.min(2 + level, 7);
    if (eBullets.length >= maxBullets) return;

    // Bottom-most invader in each column can shoot
    const bottoms = new Map();
    for (const inv of alive) {
      const cur = bottoms.get(inv.c);
      if (!cur || inv.r > cur.r) bottoms.set(inv.c, inv);
    }
    const shooters = [...bottoms.values()];
    let shooter;
    if (Math.random() < 0.35) {
      const px = player.x + player.w / 2;
      shooter = shooters.reduce((best, s) => {
        const d = Math.abs(invRect(s).x + TYPES[s.type].w / 2 - px);
        return !best || d < best.d ? { s, d } : best;
      }, null).s;
    } else {
      shooter = shooters[Math.floor(Math.random() * shooters.length)];
    }
    const r = invRect(shooter);
    eBullets.push({
      x: r.x + r.w / 2 - 1.5,
      y: r.y + r.h,
      w: 3,
      h: 12,
      vy: 210 + level * 15,
      kind: Math.random() < 0.5 ? 'zig' : 'plunger',
    });
  }

  // ---------------------------------------------------------------------------
  // Bunkers
  // ---------------------------------------------------------------------------
  // mode 'blast'  -> stop at first solid cell and blow a crater (bullets)
  // mode 'erase'  -> clear every overlapping cell (invaders marching through)
  function bunkerHit(rect, mode, fromBelow = false) {
    for (const b of bunkers) {
      if (!overlap(rect, b)) continue;
      const c0 = Math.max(0, Math.floor((rect.x - b.x) / CELL));
      const c1 = Math.min(BW - 1, Math.floor((rect.x + rect.w - 0.01 - b.x) / CELL));
      const r0 = Math.max(0, Math.floor((rect.y - b.y) / CELL));
      const r1 = Math.min(BH - 1, Math.floor((rect.y + rect.h - 0.01 - b.y) / CELL));
      let hit = false;
      for (let i = 0; i <= r1 - r0; i++) {
        const r = fromBelow ? r1 - i : r0 + i;
        for (let c = c0; c <= c1; c++) {
          const idx = r * BW + c;
          if (!b.cells[idx]) continue;
          if (mode === 'erase') {
            b.cells[idx] = 0;
            b.dirty = true;
            hit = true;
          } else {
            blastBunker(b, c, r);
            return true;
          }
        }
      }
      if (hit) return true;
    }
    return false;
  }

  function blastBunker(b, cc, cr) {
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        const r = cr + dr;
        const c = cc + dc;
        if (r < 0 || r >= BH || c < 0 || c >= BW) continue;
        const d = Math.hypot(dr, dc);
        if (d <= 1 || (d <= 3.2 && Math.random() < 0.7 - d * 0.14)) {
          b.cells[r * BW + c] = 0;
        }
      }
    }
    b.dirty = true;
  }

  function renderBunker(b) {
    const g = b.canvas.getContext('2d');
    g.clearRect(0, 0, b.canvas.width, b.canvas.height);
    g.fillStyle = COLORS.bunker;
    for (let r = 0; r < BH; r++) {
      for (let c = 0; c < BW; c++) {
        if (b.cells[r * BW + c]) g.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }
    b.dirty = false;
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  function addExplosion(img, cx, cy, t = 0.25) {
    explosions.push({ img, x: cx - img.width / 2, y: cy - img.height / 2, t });
  }

  function addText(text, x, y, color = COLORS.text, t = 1) {
    texts.push({ text, x, y, color, t, max: t });
  }

  function burst(x, y, color, n = 24, speed = 180) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.3, speed);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60,
        t: rand(0.4, 1),
        color,
      });
    }
  }

  function addScore(pts) {
    score += pts;
    if (score >= nextLifeAt) {
      nextLifeAt += 3000;
      if (lives < MAX_LIVES) {
        lives++;
        Sound.extraLife();
        addText('EXTRA LIFE!', W / 2, GROUND_Y - 30, COLORS.player, 1.6);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  function firePlayer() {
    pBullet = {
      x: player.x + player.w / 2 - 1.5,
      y: player.y - 10,
      w: 3,
      h: 12,
      vy: -PLAYER_BULLET_SPEED,
    };
    player.cooldown = 0.12;
    Sound.shoot();
  }

  function killInvader(inv) {
    const r = invRect(inv);
    const t = TYPES[inv.type];
    inv.alive = false;
    addScore(t.points);
    addExplosion(t.boom, r.x + r.w / 2, r.y + r.h / 2);
    burst(r.x + r.w / 2, r.y + r.h / 2, t.color, 8, 120);
    Sound.invaderHit();
  }

  function killPlayer(invasion = false) {
    if (!player.alive) return;
    player.alive = false;
    player.deadTimer = 1.8;
    lives = invasion ? 0 : lives - 1;
    shake = 0.45;
    burst(player.x + player.w / 2, player.y + player.h / 2, COLORS.player, 36, 220);
    burst(player.x + player.w / 2, player.y + player.h / 2, '#ffffff', 12, 160);
    Sound.playerHit();
  }

  function respawn() {
    player.alive = true;
    player.x = W / 2 - player.w / 2;
    eBullets = [];
    fireTimer = 1.2;
  }

  function spawnUfo() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    ufo = {
      x: dir > 0 ? -IMG.ufo.width : W,
      y: TOP_LIMIT + 8,
      w: IMG.ufo.width,
      h: IMG.ufo.height,
      dir,
      speed: 130 + level * 6,
    };
    Sound.ufoStart();
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  function update(dt) {
    time += dt;
    shake = Math.max(0, shake - dt);
    updateEffects(dt);

    if (banner) {
      banner.t -= dt;
      if (banner.t <= 0) banner = null;
    }

    if (mode === 'playing') {
      updatePlaying(dt);
    } else if (mode === 'levelclear') {
      modeTimer -= dt;
      if (modeTimer <= 0) nextWave();
    }
  }

  function updatePlaying(dt) {
    // Player
    if (player.alive) {
      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      player.x = clamp(player.x + dx * PLAYER_SPEED * dt, SIDE_MARGIN, W - SIDE_MARGIN - player.w);
      player.cooldown -= dt;
      if (input.fire && !pBullet && player.cooldown <= 0) firePlayer();
    } else {
      player.deadTimer -= dt;
      if (player.deadTimer <= 0) {
        if (lives > 0) respawn();
        else return gameOver();
      }
    }

    const alive = aliveInvaders();

    // Invaders freeze while the player is exploding (like the arcade)
    if (player.alive && alive.length) {
      formation.stepTimer -= dt;
      if (formation.stepTimer <= 0) {
        stepFormation(alive);
        formation.stepTimer = stepInterval(alive.length);
      }

      fireTimer -= dt;
      if (fireTimer <= 0) {
        enemyFire(alive);
        fireTimer = rand(0.45, 1.15) * Math.max(0.4, 1 - (level - 1) * 0.08);
      }

      // Invaders chew through bunkers / reach the ground
      for (const inv of alive) {
        const r = invRect(inv);
        if (r.y + r.h >= BUNKER_Y) bunkerHit(r, 'erase');
        if (r.y + r.h >= PLAYER_Y) {
          killPlayer(true);
          break;
        }
      }
    }

    updatePlayerBullet(dt);
    updateEnemyBullets(dt);
    updateUfo(dt);

    // Wave cleared?
    if (mode === 'playing' && player.alive && aliveInvaders().length === 0) {
      mode = 'levelclear';
      modeTimer = 2.2;
      eBullets = [];
      pBullet = null;
      if (ufo) {
        ufo = null;
        Sound.ufoStop();
      }
      banner = { text: 'WAVE CLEARED!', sub: `BONUS ${level * 100}`, t: 2.2 };
      addScore(level * 100);
      Sound.waveClear();
    }
  }

  function updatePlayerBullet(dt) {
    if (!pBullet) return;
    const dist = pBullet.vy * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / 6));

    for (let s = 0; s < steps; s++) {
      pBullet.y += dist / steps;
      const b = pBullet;

      if (b.y + b.h < TOP_LIMIT) {
        addExplosion(IMG.whiteBoom, b.x + 1.5, TOP_LIMIT + 4, 0.2);
        pBullet = null;
        return;
      }

      for (const inv of invaders) {
        if (inv.alive && overlap(b, invRect(inv))) {
          killInvader(inv);
          pBullet = null;
          return;
        }
      }

      if (ufo && overlap(b, ufo)) {
        const pts = [50, 100, 150, 300][Math.floor(Math.random() * 4)];
        addScore(pts);
        addExplosion(IMG.ufoBoom, ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, 0.4);
        addText(String(pts), ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, COLORS.ufo, 1.4);
        burst(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, COLORS.ufo, 20, 200);
        ufo = null;
        Sound.ufoStop();
        Sound.ufoHit();
        ufoTimer = rand(18, 30);
        pBullet = null;
        return;
      }

      for (const eb of eBullets) {
        if (!eb.dead && overlap({ x: b.x - 2, y: b.y, w: b.w + 4, h: b.h }, eb)) {
          eb.dead = true;
          addExplosion(IMG.whiteBoom, b.x + 1.5, b.y, 0.15);
          pBullet = null;
          return;
        }
      }

      if (bunkerHit(b, 'blast', true)) {
        Sound.bunkerHit();
        pBullet = null;
        return;
      }
    }
  }

  function updateEnemyBullets(dt) {
    for (const b of eBullets) {
      if (b.dead) continue;
      const dist = b.vy * dt;
      const steps = Math.max(1, Math.ceil(Math.abs(dist) / 6));
      for (let s = 0; s < steps; s++) {
        b.y += dist / steps;
        if (bunkerHit(b, 'blast')) {
          b.dead = true;
          break;
        }
        if (player.alive && overlap(b, player)) {
          b.dead = true;
          killPlayer();
          break;
        }
        if (b.y + b.h >= GROUND_Y) {
          b.dead = true;
          addExplosion(IMG.yellowBoom, b.x + 1.5, GROUND_Y - 6, 0.2);
          break;
        }
      }
    }
    eBullets = eBullets.filter((b) => !b.dead);
  }

  function updateUfo(dt) {
    if (!ufo) {
      ufoTimer -= dt;
      if (ufoTimer <= 0 && player.alive && aliveInvaders().length >= 8) spawnUfo();
      return;
    }
    ufo.x += ufo.dir * ufo.speed * dt;
    if (ufo.x > W + 10 || ufo.x < -ufo.w - 10) {
      ufo = null;
      Sound.ufoStop();
      ufoTimer = rand(18, 30);
    }
  }

  function updateEffects(dt) {
    for (const e of explosions) e.t -= dt;
    explosions = explosions.filter((e) => e.t > 0);

    for (const t of texts) {
      t.t -= dt;
      t.y -= 18 * dt;
    }
    texts = texts.filter((t) => t.t > 0);

    for (const p of particles) {
      p.t -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
    }
    particles = particles.filter((p) => p.t > 0 && p.y < GROUND_Y);
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------
  function draw() {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (shake > 0) {
      const m = shake * 10;
      ctx.translate(rand(-m, m), rand(-m, m));
    }

    drawStars();
    drawHud();

    for (const b of bunkers) {
      if (b.dirty) renderBunker(b);
      ctx.drawImage(b.canvas, b.x, b.y);
    }

    if (formation) {
      for (const inv of invaders) {
        if (!inv.alive) continue;
        const r = invRect(inv);
        ctx.drawImage(TYPES[inv.type].img[formation.frame], r.x, r.y);
      }
    }

    if (ufo) ctx.drawImage(IMG.ufo, ufo.x, ufo.y);

    if (player && mode !== 'title') {
      if (player.alive) {
        ctx.drawImage(IMG.player, player.x, player.y);
      } else if (player.deadTimer > 0.4) {
        const f = Math.floor(time * 10) % 2;
        ctx.drawImage(IMG.playerBoom[f], player.x, player.y);
      }
    }

    if (pBullet) {
      ctx.fillStyle = COLORS.bullet;
      ctx.fillRect(pBullet.x, pBullet.y, pBullet.w, pBullet.h);
    }

    ctx.fillStyle = COLORS.enemyBullet;
    for (const b of eBullets) drawEnemyBullet(b);

    for (const e of explosions) ctx.drawImage(e.img, e.x, e.y);

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.t * 1.5, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px "Courier New", monospace';
    for (const t of texts) {
      ctx.globalAlpha = clamp(t.t / t.max * 2, 0, 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // Ground + lives
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(0, GROUND_Y, W, 2);
    drawLives();

    if (banner && mode !== 'title' && mode !== 'gameover') drawBanner();

    ctx.restore();
  }

  function drawStars() {
    for (const s of stars) {
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * s.sp + s.p));
      ctx.fillStyle = `rgba(200, 210, 255, ${a})`;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
  }

  function drawHud() {
    ctx.textBaseline = 'top';
    ctx.font = 'bold 16px "Courier New", monospace';

    ctx.fillStyle = COLORS.dim;
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 20, 8);
    ctx.textAlign = 'center';
    ctx.fillText('HI-SCORE', W / 2, 8);
    ctx.textAlign = 'right';
    ctx.fillText('WAVE', W - 20, 8);

    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(pad(score), 20, 26);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.player;
    ctx.fillText(pad(Math.max(hiScore, score)), W / 2, 26);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(String(level), W - 20, 26);
  }

  function drawLives() {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = COLORS.text;
    const y = GROUND_Y + 23;
    ctx.fillText(String(Math.max(0, lives)), 20, y);
    const iw = IMG.player.width * 0.7;
    const ih = IMG.player.height * 0.7;
    for (let i = 0; i < Math.max(0, lives - (player && player.alive ? 1 : 0)); i++) {
      ctx.drawImage(IMG.player, 48 + i * (iw + 10), y - ih / 2, iw, ih);
    }

    ctx.textAlign = 'right';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(Sound.muted ? 'SOUND OFF [M]' : 'SOUND ON [M]', W - 20, y);
  }

  function drawEnemyBullet(b) {
    if (b.kind === 'zig') {
      const phase = Math.floor(time * 20) % 2;
      for (let i = 0; i < 4; i++) {
        const off = (i + phase) % 2 === 0 ? -2 : 2;
        ctx.fillRect(b.x + off, b.y + i * 3, 3, 3);
      }
    } else {
      ctx.fillRect(b.x, b.y, 3, b.h);
      const cy = Math.floor(time * 16) % 2 === 0 ? b.y + 2 : b.y + b.h - 5;
      ctx.fillRect(b.x - 3, cy, 9, 3);
    }
  }

  function drawBanner() {
    const a = clamp(banner.t * 2, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 44px "Courier New", monospace';
    ctx.fillStyle = COLORS.crab;
    ctx.shadowColor = COLORS.crab;
    ctx.shadowBlur = 16;
    ctx.fillText(banner.text, W / 2, H / 2 - 40);
    ctx.shadowBlur = 0;
    if (banner.sub) {
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(banner.sub, W / 2, H / 2 + 6);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  const KEYMAP = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    Space: 'fire',
    ArrowUp: 'fire',
    KeyW: 'fire',
  };

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (action) {
      e.preventDefault();
      input[action] = true;
    }

    if (e.repeat) return;

    switch (e.code) {
      case 'Enter':
      case 'NumpadEnter':
        e.preventDefault();
        if (mode === 'title' || mode === 'gameover') startGame();
        else if (mode === 'paused') resume();
        break;
      case 'KeyP':
      case 'Escape':
        if (mode === 'paused') resume();
        else pause();
        break;
      case 'KeyM':
        Sound.setMuted(!Sound.muted);
        break;
      default:
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input[action] = false;
  });

  window.addEventListener('blur', () => {
    input.left = input.right = input.fire = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    const action = btn ? btn.dataset.action : null;
    if (mode === 'paused') resume();
    else if ((mode === 'title' || mode === 'gameover') && (action === 'start' || !btn)) startGame();
  });

  // Touch controls
  document.querySelectorAll('[data-touch]').forEach((btn) => {
    const key = btn.dataset.touch;
    const press = (e) => {
      e.preventDefault();
      Sound.init();
      if (key === 'pause') {
        if (mode === 'paused') resume();
        else pause();
        return;
      }
      if (mode === 'title' || mode === 'gameover') {
        startGame();
        return;
      }
      if (btn.setPointerCapture && e.pointerId !== undefined) btn.setPointerCapture(e.pointerId);
      input[key] = true;
      btn.classList.add('active');
    };
    const release = () => {
      if (key !== 'pause') input[key] = false;
      btn.classList.remove('active');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------
  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    if (mode !== 'paused') update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // Boot: show a wave behind the title screen
  buildPointsTable();
  setupWave();
  showPanel('title');
  requestAnimationFrame(frame);
})();
