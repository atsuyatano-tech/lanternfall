// main.js — LANTERNFALL's boot and heartbeat: the screen state machine
// (title → playing ⇄ paused → caught / complete → victory), the fixed-step
// simulation, coin tosses, scoring, the HUD, and the ?shot= / ?smoke= hooks
// the screenshot staging and the self-test run through.

import {
  attachInput, moveVector, sneakHeld, runHeld, consumePresses, consumeClicks,
} from './input.js';
import { buildLevel, LEVEL_COUNT, FIELD_W, FIELD_H } from './levels.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuard, updateGuard, hearNoise } from './guards.js';
import { drawScene } from './render.js';
import { stageShot } from './shots.js';
import { pointInRect } from './vision.js';
import {
  ensureAudio, playStep, playCoin, playSting, playAlarm, playChime, playCaught,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const veil = document.createElement('canvas');
const hud = {
  level: document.getElementById('hudLevel'),
  objective: document.getElementById('hudObjective'),
  eyeBar: document.getElementById('eyeBar'),
  coins: document.getElementById('hudCoins'),
  score: document.getElementById('hudScore'),
};

const game = {
  screen: 'title',
  frozen: false,
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  effects: [],
  coin: null,
  landedCoins: [],
  coinsLeft: 0,
  totalScore: 0,
  levelScore: 0,
  best: 0,
  stats: { time: 0, spotted: 0, ghost: true },
  stingCd: 0,
};
try {
  game.best = Number(localStorage.getItem('lanternfall-best') || 0) || 0;
} catch { game.best = 0; }

function loadLevel(index) {
  game.levelIndex = index;
  game.level = buildLevel(index);
  game.player = createPlayer(game.level.playerStart);
  game.guards = game.level.guardDefs.map((def) => createGuard(def));
  game.effects = [];
  game.coin = null;
  game.landedCoins = [];
  game.coinsLeft = game.level.coins;
  game.stats = { time: 0, spotted: 0, ghost: true };
}
game.loadLevel = loadLevel;

const fx = {
  ripple(x, y, kind) {
    game.effects.push({ kind: kind === 'noise' ? 'noise' : 'step', x, y, t: 0, dur: 0.55, maxR: 20 });
  },
  noise(x, y, radius) {
    game.effects.push({ kind: 'noise', x, y, t: 0, dur: 0.8, maxR: radius });
    for (const g of game.guards) {
      if (Math.hypot(g.x - x, g.y - y) <= radius) hearNoise(g, x, y);
    }
  },
  step(run) { playStep(run); },
  sting() {
    if (game.stingCd <= 0) {
      playSting();
      game.stingCd = 0.5;
    }
  },
  alarm() { playAlarm(); },
  spotted() {
    game.stats.spotted += 1;
    game.stats.ghost = false;
  },
  caught() {
    if (game.screen === 'playing') {
      game.screen = 'caught';
      playCaught();
    }
  },
};

function tossCoin(x, y) {
  if (game.coin || game.coinsLeft <= 0 || game.screen !== 'playing') return;
  const tx = Math.max(30, Math.min(FIELD_W - 30, x));
  const ty = Math.max(30, Math.min(FIELD_H - 30, y));
  game.coin = { x0: game.player.x, y0: game.player.y, x1: tx, y1: ty, t: 0, dur: 0.5 };
  game.coinsLeft -= 1;
}

function completeLevel() {
  const st = game.stats;
  game.levelScore = Math.max(
    50,
    1000 - Math.floor(st.time) * 2 - st.spotted * 150 + (st.ghost ? 500 : 0) + game.coinsLeft * 50,
  );
  game.totalScore += game.levelScore;
  playChime();
  if (game.levelIndex + 1 >= LEVEL_COUNT) {
    game.screen = 'victory';
    if (game.totalScore > game.best) {
      game.best = game.totalScore;
      try { localStorage.setItem('lanternfall-best', String(game.best)); } catch { /* private mode */ }
    }
  } else {
    game.screen = 'complete';
  }
}

/** One fixed simulation step. Input is honoured only on the playing screen. */
function stepWorld(dt) {
  const level = game.level;
  game.stingCd = Math.max(0, game.stingCd - dt);

  if (game.coin) {
    game.coin.t += dt;
    if (game.coin.t >= game.coin.dur) {
      const { x1, y1 } = game.coin;
      game.landedCoins.push({ x: x1, y: y1 });
      game.effects.push({ kind: 'coinring', x: x1, y: y1, t: 0, dur: 0.7, maxR: 175 });
      playCoin();
      for (const g of game.guards) {
        if (Math.hypot(g.x - x1, g.y - y1) <= 175) hearNoise(g, x1, y1);
      }
      game.coin = null;
    }
  }

  if (game.screen === 'playing') {
    updatePlayer(game.player, dt, moveVector(), { sneak: sneakHeld(), run: runHeld() }, level, fx);
    game.stats.time += dt;
  }
  const world = { level, player: game.player, fx, chaseSpeed: 148 + game.levelIndex * 5 };
  for (const g of game.guards) updateGuard(g, dt, world);

  for (const e of game.effects) e.t += dt;
  game.effects = game.effects.filter((e) => e.t < e.dur);

  if (game.screen === 'playing') {
    const p = game.player;
    if (!level.ledger.taken && Math.hypot(p.x - level.ledger.x, p.y - level.ledger.y) < 26) {
      level.ledger.taken = true;
      playChime();
    }
    if (level.ledger.taken && pointInRect(p.x, p.y, level.gate, 0)) {
      completeLevel();
    }
  }
}

function startGame() {
  game.totalScore = 0;
  loadLevel(0);
  game.screen = 'playing';
}

function handlePresses() {
  const pressed = consumePresses();
  const clicks = consumeClicks();
  const enter = pressed.has('Enter') || pressed.has('NumpadEnter');
  if (pressed.size > 0 || clicks.length > 0) ensureAudio();
  switch (game.screen) {
    case 'title':
      if (enter || clicks.length > 0) startGame();
      break;
    case 'playing':
      if (pressed.has('KeyP') || pressed.has('Escape')) game.screen = 'paused';
      else if (pressed.has('KeyR')) loadLevel(game.levelIndex);
      else for (const c of clicks) tossCoin(c.x, c.y);
      break;
    case 'paused':
      if (pressed.has('KeyP') || pressed.has('Escape') || enter) game.screen = 'playing';
      break;
    case 'caught':
      if (enter || clicks.length > 0) {
        loadLevel(game.levelIndex);
        game.screen = 'playing';
      }
      break;
    case 'complete':
      if (enter || clicks.length > 0) {
        loadLevel(game.levelIndex + 1);
        game.screen = 'playing';
      }
      break;
    case 'victory':
      if (enter || clicks.length > 0) game.screen = 'title';
      break;
    default:
      break;
  }
}

function updateHud() {
  const level = game.level;
  hud.level.textContent = `${level.name} — ${level.subtitle}`;
  hud.objective.textContent = level.ledger.taken ? 'Reach the gate' : 'Steal the Ember Ledger';
  const maxAlert = game.guards.reduce((m, g) => Math.max(m, g.alert), 0);
  hud.eyeBar.style.width = `${Math.round(maxAlert * 100)}%`;
  hud.eyeBar.style.background = maxAlert >= 0.99 ? '#ff5040' : maxAlert >= 0.6 ? '#ffa02c' : maxAlert >= 0.3 ? '#f6d682' : '#8fa3c8';
  hud.coins.textContent = `Coins: ${game.coinsLeft}`;
  hud.score.textContent = `Score: ${game.totalScore}`;
}

// ---------------------------------------------------------------- boot

attachInput(canvas);
loadLevel(0);

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
let framesRendered = 0;

if (shotName !== null) {
  game.screen = stageShot(game, shotName);
  game.frozen = true;
  updateHud();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (!game.frozen) {
    if (game.screen !== 'shot') handlePresses();
    if (game.screen === 'playing' || game.screen === 'title') {
      // Fixed-step the world so patrols and meters run at a steady rate.
      let acc = dt;
      while (acc > 0) {
        const step = Math.min(1 / 60, acc);
        stepWorld(step);
        acc -= step;
      }
    } else if (game.screen === 'paused') {
      consumePresses();
      consumeClicks();
    }
  }
  drawScene(ctx, game, veil, now / 1000);
  updateHud();
  framesRendered += 1;
  if (shotName !== null && framesRendered >= 4) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Hooks for the screenshot driver and the in-page smoke test.
window.__lantern = { game, loadLevel, startGame, tossCoin, stepWorld };

if (params.get('smoke') === '1') {
  window.__smoke = { errors: [], results: {}, done: false };
  window.addEventListener('error', (e) => window.__smoke.errors.push(String(e.message)));
  runSmoke();
}

async function runSmoke() {
  const S = window.__smoke;
  const step = (seconds) => {
    const n = Math.round(seconds * 60);
    for (let i = 0; i < n; i++) stepWorld(1 / 60);
  };
  try {
    // 1. A guard's meter rises when the courier crosses his cone in light.
    startGame();
    const g1 = game.guards[0];
    g1.x = 440; g1.y = 180; g1.angle = Math.PI; g1.state = 'patrol'; g1.alert = 0;
    game.player.x = 330; game.player.y = 180; game.player.tier = 'walk';
    step(1.2);
    S.results.coneInLight = { alert: Number(g1.alert.toFixed(2)), state: g1.state, pass: g1.alert > 0.3 && g1.state !== 'patrol' };

    // 2. A tossed coin pulls a guard off his post to investigate.
    loadLevel(0);
    game.screen = 'playing';
    const g2 = game.guards[1];
    g2.x = 640; g2.y = 470; g2.angle = 0; g2.state = 'patrol'; g2.alert = 0;
    game.player.x = 120; game.player.y = 700;
    tossCoin(760, 430);
    step(1.4);
    S.results.coinInvestigate = { state: g2.state, pass: g2.state === 'investigate' };

    // 3. Taking the ledger flips the objective; the gate ends the compound.
    game.player.x = game.level.ledger.x;
    game.player.y = game.level.ledger.y;
    step(0.1);
    S.results.ledgerTaken = { pass: game.level.ledger.taken === true };
    game.player.x = game.level.gate.x + 20;
    game.player.y = game.level.gate.y + 40;
    step(0.1);
    S.results.gateCompletes = { screen: game.screen, pass: game.screen === 'complete' };

    // 4. Later compounds field more watchmen.
    loadLevel(1);
    S.results.level2Guards = { count: game.guards.length, pass: game.guards.length === 4 };
    loadLevel(2);
    S.results.level3Guards = { count: game.guards.length, pass: game.guards.length === 5 };

    // 5. Shadow really hides: a guard staring at a shadowed courier past a
    // few paces gains nothing.
    loadLevel(0);
    const g5 = game.guards[1];
    g5.x = 520; g5.y = 470; g5.angle = Math.PI; g5.state = 'patrol'; g5.alert = 0;
    game.player.x = 395; game.player.y = 385; game.player.tier = 'sneak';
    step(1.5);
    S.results.shadowHides = { alert: Number(g5.alert.toFixed(2)), pass: g5.alert < 0.05 };
  } catch (err) {
    S.errors.push(`smoke: ${err && err.message ? err.message : err}`);
  }
  S.done = true;
}
