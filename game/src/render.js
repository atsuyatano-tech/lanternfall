// render.js — every pixel of LANTERNFALL. Procedural canvas art only:
// slate-tiled floors, plank crates, book-lined shelves, hedges, stone pillars,
// crimson watchmen with pale faces, and vision cones whose colour is the
// guard's state of mind. Light pools are drawn by lighting.js over the top,
// so the frame reads exactly as the simulation plays.

import { conePolygon } from './vision.js';
import { GUARD_FOV, GUARD_RANGE } from './guards.js';
import { drawLighting, drawLantern, isLit } from './lighting.js';
import { FIELD_W, FIELD_H } from './levels.js';

/** Deterministic 0..1 hash of two integers — texture that never shimmers. */
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const CONE_STYLES = {
  calm: { fill: 'rgba(250, 216, 130, 0.26)', edge: 'rgba(250, 216, 130, 0.55)' },
  suspicious: { fill: 'rgba(255, 170, 44, 0.32)', edge: 'rgba(255, 170, 44, 0.65)' },
  investigate: { fill: 'rgba(255, 150, 40, 0.29)', edge: 'rgba(255, 150, 40, 0.6)' },
  chase: { fill: 'rgba(255, 66, 44, 0.38)', edge: 'rgba(255, 66, 44, 0.75)' },
};

function coneStyle(g) {
  if (g.state === 'chase') return CONE_STYLES.chase;
  if (g.state === 'investigate') return CONE_STYLES.investigate;
  if (g.state === 'suspicious' || g.alert > 0.3) return CONE_STYLES.suspicious;
  return CONE_STYLES.calm;
}

function drawFloor(ctx, level) {
  ctx.fillStyle = '#131c31';
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  const T = 64;
  for (let ty = 0; ty < FIELD_H / T; ty++) {
    for (let tx = 0; tx < FIELD_W / T; tx++) {
      const h = hash2(tx, ty);
      const shade = (tx + ty) % 2 === 0 ? 0 : 5;
      ctx.fillStyle = `rgb(${19 + shade + h * 5}, ${28 + shade + h * 6}, ${49 + shade + h * 8})`;
      ctx.fillRect(tx * T, ty * T, T, T);
      if (h > 0.86) {
        ctx.fillStyle = 'rgba(255,255,255,0.045)';
        ctx.fillRect(tx * T + h * 40, ty * T + h * 30, 9, 3);
      }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= FIELD_W; x += T) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, FIELD_H); }
  for (let y = 0; y <= FIELD_H; y += T) { ctx.moveTo(0, y + 0.5); ctx.lineTo(FIELD_W, y + 0.5); }
  ctx.stroke();
  // The ledger dais: a worn crimson rug under the prize.
  const d = level.dais;
  ctx.fillStyle = '#4a2436';
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 2;
  ctx.strokeRect(d.x + 5, d.y + 5, d.w - 10, d.h - 10);
}

function drawGate(ctx, level, open, t) {
  const g = level.gate;
  const vertical = g.w <= g.h;
  ctx.save();
  // Glowing threshold on the floor inside the arch.
  const pulse = open ? 0.55 + Math.sin(t * 3.2) * 0.2 : 0.3;
  ctx.fillStyle = open ? `rgba(120, 255, 170, ${pulse * 0.5})` : 'rgba(200, 170, 95, 0.16)';
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.strokeStyle = open ? `rgba(140, 255, 185, ${pulse})` : 'rgba(190, 155, 90, 0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(g.x + 2, g.y + 2, g.w - 4, g.h - 4);
  // Bars: raised when open, down when shut.
  ctx.strokeStyle = open ? 'rgba(220, 255, 230, 0.9)' : 'rgba(120, 110, 95, 0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  const n = 4;
  for (let i = 1; i <= n; i++) {
    if (vertical) {
      const x = g.x + (g.w * i) / (n + 1);
      const top = open ? g.y : g.y + g.h * 0.25;
      ctx.moveTo(x, top);
      ctx.lineTo(x, open ? g.y + g.h * 0.22 : g.y + g.h);
    } else {
      const y = g.y + (g.h * i) / (n + 1);
      const left = open ? g.x : g.x + g.w * 0.25;
      ctx.moveTo(left, y);
      ctx.lineTo(open ? g.x + g.w * 0.22 : g.x + g.w, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawLedger(ctx, level, t) {
  if (level.ledger.taken) return;
  const { x, y } = level.ledger;
  ctx.save();
  const pulse = 0.5 + Math.sin(t * 2.6) * 0.18;
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 46);
  glow.addColorStop(0, `rgba(255, 205, 92, ${pulse})`);
  glow.addColorStop(1, 'rgba(255, 205, 92, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y);
  ctx.rotate(-0.16);
  ctx.fillStyle = '#7a1f1f';
  ctx.fillRect(-11, -14, 22, 28);
  ctx.fillStyle = '#a33327';
  ctx.fillRect(-11, -14, 5, 28);
  ctx.strokeStyle = '#f4c96b';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-11, -14, 22, 28);
  ctx.fillStyle = '#f4c96b';
  ctx.fillRect(-4, -8, 10, 2.4);
  ctx.fillRect(-4, -3, 10, 2.4);
  ctx.fillRect(-4, 2, 7, 2.4);
  ctx.restore();
}

function drawWall(ctx, r) {
  ctx.fillStyle = '#2b3a5c';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#46587e';
  ctx.fillRect(r.x, r.y, r.w, Math.min(6, r.h));
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(r.x, r.y, Math.min(4, r.w), r.h);
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(r.x, r.y + r.h - 4, r.w, 4);
  ctx.strokeStyle = 'rgba(10, 14, 26, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
}

function drawCover(ctx, r) {
  ctx.save();
  // Soft contact shadow so cover reads as solid at a glance.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(r.x + 3, r.y + 5, r.w, r.h);
  if (r.kind === 'crate') {
    ctx.fillStyle = '#8a6844';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#5f4527';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.beginPath();
    ctx.moveTo(r.x + 2, r.y + 2);
    ctx.lineTo(r.x + r.w - 2, r.y + r.h - 2);
    ctx.moveTo(r.x + r.w - 2, r.y + 2);
    ctx.lineTo(r.x + 2, r.y + r.h - 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + r.h / 2);
    ctx.lineTo(r.x + r.w, r.y + r.h / 2);
    ctx.stroke();
  } else if (r.kind === 'shelf') {
    ctx.fillStyle = '#43301f';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#241809';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    const palette = ['#7d4b3a', '#54683f', '#4d5d80', '#77603a', '#68455c', '#3f6066'];
    const n = Math.floor(r.w / 11);
    for (let i = 0; i < n; i++) {
      const h = hash2(Math.round(r.x) + i * 7, Math.round(r.y));
      ctx.fillStyle = palette[Math.floor(h * palette.length)];
      const bh = r.h - 10 - h * 5;
      ctx.fillRect(r.x + 5 + i * 11, r.y + r.h - 4 - bh, 8, bh);
    }
    ctx.fillStyle = 'rgba(255,220,150,0.10)';
    ctx.fillRect(r.x, r.y, r.w, 3);
  } else if (r.kind === 'hedge') {
    ctx.fillStyle = '#1e4530';
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    for (let i = 0; i < r.w * r.h / 90; i++) {
      const hx = r.x + hash2(i, Math.round(r.x)) * r.w;
      const hy = r.y + hash2(Math.round(r.y), i) * r.h;
      ctx.fillStyle = hash2(i, 99) > 0.5 ? 'rgba(90, 160, 105, 0.5)' : 'rgba(16, 40, 24, 0.6)';
      ctx.beginPath();
      ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(120, 200, 140, 0.25)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 11);
    ctx.stroke();
  } else { // pillar
    ctx.fillStyle = '#67718a';
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7f8aa3';
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2 - 3, r.y + r.h / 2 - 3, r.w / 2 - 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#454e63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCone(ctx, g, level) {
  const style = coneStyle(g);
  const pts = conePolygon(g.x, g.y, g.angle, GUARD_FOV, GUARD_RANGE, level.segments, 26);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = style.fill;
  ctx.fill();
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(ctx, p, level, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 9, 13, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const crouch = p.tier === 'sneak' ? 0.86 : 1;
  ctx.translate(p.x, p.y);
  ctx.scale(1, crouch);
  // Hooded cloak: pale mint, bright against the slate floor.
  ctx.fillStyle = '#cfe8d8';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isLit(level.lanterns, p.x, p.y) ? '#ffffff' : '#59d8c0';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood shadow and face, turned toward travel.
  const fx = Math.cos(p.angle) * 4;
  const fy = Math.sin(p.angle) * 4;
  ctx.fillStyle = '#5d8a72';
  ctx.beginPath();
  ctx.arc(fx * 0.4, fy * 0.4, 8.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20302a';
  ctx.beginPath();
  ctx.arc(fx, fy, 5.2, 0, Math.PI * 2);
  ctx.fill();
  // A little satchel — the courier's bag, worn on the back.
  ctx.fillStyle = '#a33327';
  ctx.fillRect(-Math.cos(p.angle) * 6.5 - 3.4, -Math.sin(p.angle) * 6.5 - 2.8, 6.8, 5.6);
  ctx.restore();
  void t;
}

function drawGuard(ctx, g, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(g.x, g.y + 9, 13, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(g.x, g.y);
  // Crimson uniform — the watch must pop against the floor from any distance.
  ctx.fillStyle = '#c22f3d';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6e1420';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#7d1f2a';
  ctx.fillRect(-9, 3.5, 18, 4.4);
  // Pale face toward facing, with a dark cap brim.
  const fx = Math.cos(g.angle) * 4.6;
  const fy = Math.sin(g.angle) * 4.6;
  ctx.fillStyle = '#f0dcc4';
  ctx.beginPath();
  ctx.arc(fx, fy, 6.4, 0, Math.PI * 2);
  ctx.fill();
  // The watch cap: a dark band across the back of the head.
  ctx.strokeStyle = '#20242e';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(fx, fy, 5.2, g.angle + Math.PI * 0.45, g.angle + Math.PI * 1.55);
  ctx.stroke();
  ctx.restore();

  // Alert meter arc around the guard, plus a state marker when interested.
  if (g.alert > 0.03) {
    ctx.save();
    ctx.strokeStyle = g.state === 'chase' ? '#ff5040' : g.alert > 0.6 ? '#ffa02c' : '#f6d682';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 19, -Math.PI / 2, -Math.PI / 2 + g.alert * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (g.state === 'suspicious' || g.state === 'investigate' || g.state === 'chase') {
    const mark = g.state === 'chase' ? '!' : '?';
    const bob = Math.sin(t * 5 + g.x) * 1.6;
    ctx.save();
    ctx.font = 'bold 17px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = g.state === 'chase' ? '#ff5040' : '#ffb02c';
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 3.4;
    ctx.strokeText(mark, g.x, g.y - 24 + bob);
    ctx.fillText(mark, g.x, g.y - 24 + bob);
    ctx.restore();
  }
}

function drawEffects(ctx, game) {
  for (const e of game.effects) {
    const k = 1 - e.t / e.dur;
    if (e.kind === 'noise' || e.kind === 'coinring') {
      ctx.save();
      ctx.strokeStyle = e.kind === 'coinring'
        ? `rgba(255, 214, 110, ${0.55 * k})`
        : `rgba(170, 215, 255, ${0.4 * k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.maxR * (e.t / e.dur), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else { // footstep ripple
      ctx.save();
      ctx.strokeStyle = `rgba(200, 220, 255, ${0.30 * k})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4 + 13 * (e.t / e.dur), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawCoin(ctx, game, t) {
  for (const c of game.landedCoins) {
    ctx.save();
    ctx.fillStyle = '#f4c96b';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(c.x - 1, c.y - 3, 2, 2);
    ctx.restore();
  }
  const coin = game.coin;
  if (!coin) return;
  const k = Math.min(1, coin.t / coin.dur);
  const x = coin.x0 + (coin.x1 - coin.x0) * k;
  const y = coin.y0 + (coin.y1 - coin.y0) * k;
  const height = Math.sin(k * Math.PI) * 64;
  ctx.save();
  // The arc it will fly, dotted, and a ring where it will land: the toss
  // must read in a still frame, not just in motion.
  ctx.fillStyle = 'rgba(244, 201, 107, 0.5)';
  for (let i = 1; i < 9; i++) {
    const kk = (i / 9) * k + 0.02;
    if (kk > 1) break;
    const px = coin.x0 + (coin.x1 - coin.x0) * kk;
    const py = coin.y0 + (coin.y1 - coin.y0) * kk - Math.sin(kk * Math.PI) * 64;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(244, 201, 107, 0.75)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(coin.x1, coin.y1, 10 + Math.sin(t * 6) * 1.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  const glow = ctx.createRadialGradient(x, y - height, 1, x, y - height, 20);
  glow.addColorStop(0, 'rgba(255, 220, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 220, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - height, 20, 0, Math.PI * 2);
  ctx.fill();
  const spin = Math.abs(Math.cos(k * Math.PI * 3 + t * 2));
  ctx.fillStyle = '#ffd968';
  ctx.beginPath();
  ctx.ellipse(x, y - height, 9 * (0.35 + 0.65 * spin), 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a97e22';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

function panel(ctx, w, h) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.66)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(10, 15, 30, 0.88)';
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 1.6;
  const pw = 560;
  const ph = 300;
  ctx.beginPath();
  ctx.roundRect((w - pw) / 2, (h - ph) / 2, pw, ph, 10);
  ctx.fill();
  ctx.stroke();
  return { x: (w - pw) / 2, y: (h - ph) / 2, w: pw, h: ph };
}

function centred(ctx, text, y, font, colour) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillStyle = colour;
  ctx.fillText(text, FIELD_W / 2, y);
}

function drawOverlay(ctx, game) {
  const s = game.screen;
  if (s === 'playing' || s === 'shot') return;
  if (s === 'paused') {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.55)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    centred(ctx, 'PAUSED', FIELD_H / 2, 'bold 44px Georgia, serif', '#e8ddc0');
    centred(ctx, 'P — resume', FIELD_H / 2 + 42, '17px Georgia, serif', '#cfd8ea');
    return;
  }
  const p = panel(ctx, FIELD_W, FIELD_H);
  const cx = FIELD_W / 2;
  if (s === 'title') {
    centred(ctx, 'LANTERNFALL', p.y + 74, 'bold 54px Georgia, serif', '#f4c96b');
    centred(ctx, 'A lantern-lit stealth game', p.y + 106, 'italic 18px Georgia, serif', '#cfd8ea');
    centred(ctx, 'Slip through the archive compound, steal the Ember Ledger,', p.y + 148, '16px Georgia, serif', '#e8ddc0');
    centred(ctx, 'and reach the gate unseen. Light betrays you. Shadow is armour.', p.y + 172, '16px Georgia, serif', '#e8ddc0');
    centred(ctx, 'WASD / arrows move · Shift sneak (silent) · Space run (loud)', p.y + 214, '14.5px Georgia, serif', '#9fb2d8');
    centred(ctx, 'Click — toss a coin to draw a guard away · P pause · R restart', p.y + 238, '14.5px Georgia, serif', '#9fb2d8');
    centred(ctx, 'Click or press Enter to begin', p.y + 276, 'bold 17px Georgia, serif', '#f4c96b');
  } else if (s === 'caught') {
    centred(ctx, 'CAUGHT', p.y + 84, 'bold 50px Georgia, serif', '#ff5040');
    centred(ctx, 'The watch closes in and the lanterns gutter out.', p.y + 128, '16px Georgia, serif', '#e8ddc0');
    centred(ctx, `You were spotted ${game.stats.spotted} time${game.stats.spotted === 1 ? '' : 's'}.`, p.y + 168, '15px Georgia, serif', '#cfd8ea');
    centred(ctx, 'Press Enter or click to try the compound again', p.y + 240, 'bold 16px Georgia, serif', '#f4c96b');
    void cx;
  } else if (s === 'complete') {
    centred(ctx, 'COMPOUND CLEARED', p.y + 74, 'bold 36px Georgia, serif', '#8fe3ae');
    const st = game.stats;
    centred(ctx, `Time ${st.time.toFixed(1)}s · Spotted ${st.spotted} time${st.spotted === 1 ? '' : 's'}`, p.y + 122, '16px Georgia, serif', '#e8ddc0');
    centred(ctx, st.ghost ? 'Ghost bonus — never fully seen: +500' : 'No ghost bonus — you were seen.', p.y + 150, '16px Georgia, serif', '#e8ddc0');
    centred(ctx, `Compound score: ${game.levelScore}`, p.y + 186, 'bold 19px Georgia, serif', '#f4c96b');
    centred(ctx, `Total: ${game.totalScore}`, p.y + 216, '16px Georgia, serif', '#cfd8ea');
    centred(ctx, 'Press Enter for the next compound', p.y + 262, 'bold 16px Georgia, serif', '#f4c96b');
  } else if (s === 'victory') {
    centred(ctx, 'THE LEDGER IS YOURS', p.y + 78, 'bold 38px Georgia, serif', '#f4c96b');
    centred(ctx, 'Three compounds, one courier, no alarm that held.', p.y + 122, '16px Georgia, serif', '#e8ddc0');
    centred(ctx, `Final score: ${game.totalScore}`, p.y + 168, 'bold 22px Georgia, serif', '#f4c96b');
    centred(ctx, `Best: ${game.best}`, p.y + 200, '16px Georgia, serif', '#cfd8ea');
    centred(ctx, 'Press Enter to play again', p.y + 258, 'bold 16px Georgia, serif', '#f4c96b');
  }
}

/** Draw one full frame. `veil` is a reusable offscreen canvas for the light layer. */
export function drawScene(ctx, game, veil, t) {
  const level = game.level;
  drawFloor(ctx, level);
  drawGate(ctx, level, level.ledger.taken, t);
  drawLedger(ctx, level, t);
  for (const r of level.walls) drawWall(ctx, r);
  for (const r of level.covers) drawCover(ctx, r);
  drawCoin(ctx, game, t);
  // The night veil falls over the ground and the cover — but vision cones
  // are light themselves, and the actors stay lit by their own readability,
  // so a watchman reads crimson and the courier mint at any distance.
  drawLighting(ctx, veil, level.lanterns, FIELD_W, FIELD_H, t);
  for (const l of level.lanterns) drawLantern(ctx, l, t);
  for (const g of game.guards) drawCone(ctx, g, level);
  for (const g of game.guards) drawGuard(ctx, g, t);
  drawPlayer(ctx, game.player, level, t);
  drawEffects(ctx, game);
  // Alert markers must survive the night veil: redraw just the markers.
  for (const g of game.guards) {
    if (g.state === 'suspicious' || g.state === 'investigate' || g.state === 'chase') {
      const mark = g.state === 'chase' ? '!' : '?';
      const bob = Math.sin(t * 5 + g.x) * 1.6;
      ctx.save();
      ctx.font = 'bold 17px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = g.state === 'chase' ? '#ff5040' : '#ffb02c';
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 3.4;
      ctx.strokeText(mark, g.x, g.y - 24 + bob);
      ctx.fillText(mark, g.x, g.y - 24 + bob);
      ctx.restore();
    }
  }
  drawOverlay(ctx, game);
}
