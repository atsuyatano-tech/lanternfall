// player.js — the courier. Three speeds, three noise profiles: sneaking
// (Shift) is silent, walking is a whisper only the nearest guard catches,
// running (Space) is fast and loud. Coins are tossed from here in main.js;
// this module owns movement, footsteps and the noise the movement makes.

import { moveCircle } from './vision.js';
import { FIELD_W, FIELD_H } from './levels.js';

export const SPEEDS = { sneak: 62, walk: 118, run: 178 };
export const PLAYER_RADIUS = 13;

export function createPlayer(start) {
  return {
    x: start.x, y: start.y, r: PLAYER_RADIUS,
    angle: -Math.PI / 2, moving: false, tier: 'walk',
    stepAcc: 0, noiseAcc: 0, walkPhase: 0,
  };
}

/**
 * Advance the player one tick. `mv` is the raw move vector, opts {sneak, run}.
 * fx callbacks: fx.ripple(x, y, kind), fx.noise(x, y, radius), fx.step(run).
 */
export function updatePlayer(p, dt, mv, opts, level, fx) {
  const mag = Math.hypot(mv.x, mv.y);
  p.moving = mag > 0;
  if (!p.moving) {
    p.noiseAcc = 0;
    return;
  }
  p.tier = opts.sneak ? 'sneak' : opts.run ? 'run' : 'walk';
  const speed = SPEEDS[p.tier];
  const ux = mv.x / mag;
  const uy = mv.y / mag;
  p.angle = Math.atan2(uy, ux);
  moveCircle(p, p.r, ux * speed * dt, uy * speed * dt, level.solids);
  p.x = Math.max(24 + p.r, Math.min(FIELD_W - 24 - p.r, p.x));
  p.y = Math.max(24 + p.r, Math.min(FIELD_H - 24 - p.r, p.y));
  p.walkPhase += dt * (p.tier === 'run' ? 11 : p.tier === 'walk' ? 8 : 5);

  // Footstep ripples telegraph movement; sneaking leaves almost none.
  p.stepAcc += speed * dt;
  const stride = p.tier === 'sneak' ? 46 : 30;
  if (p.stepAcc >= stride) {
    p.stepAcc = 0;
    if (p.tier !== 'sneak') {
      fx.ripple(p.x, p.y, 'step');
      fx.step(p.tier === 'run');
    }
  }
  // Noise events guards can hear: running carries across a room, walking
  // only a few paces, sneaking nothing at all.
  p.noiseAcc += dt;
  if (p.tier === 'run' && p.noiseAcc >= 0.26) {
    p.noiseAcc = 0;
    fx.noise(p.x, p.y, 138);
  } else if (p.tier === 'walk' && p.noiseAcc >= 0.45) {
    p.noiseAcc = 0;
    fx.noise(p.x, p.y, 52);
  }
}
