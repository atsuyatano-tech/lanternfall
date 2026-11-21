// guards.js — the lantern watch. Each guard patrols a waypoint loop, and its
// alert meter is the game's heart: a glimpse fills it a little, a clear view
// in lantern light fills it fast, and broken line-of-sight lets it drain —
// so detection is a slope the player can slide back down, not a switch.
//
// States: patrol → suspicious (stand, stare) → investigate (walk to the
// stimulus) → chase (alert full) → investigate last-seen → return to patrol.

import { losClear, moveCircle, turnToward, angleDelta } from './vision.js';
import { isLit } from './lighting.js';

export const GUARD_FOV = 1.92;      // ~110 degrees
export const GUARD_RANGE = 245;     // sight range in lantern light
export const GUARD_RADIUS = 13;
export const CAUGHT_DIST = 24;

export function createGuard(def) {
  const [sx, sy] = def.waypoints[0];
  const [nx, ny] = def.waypoints[1] ?? def.waypoints[0];
  return {
    x: sx, y: sy, r: GUARD_RADIUS,
    angle: Math.atan2(ny - sy, nx - sx),
    waypoints: def.waypoints.map(([x, y]) => ({ x, y })),
    wp: def.waypoints.length > 1 ? 1 : 0,
    baseSpeed: def.speed,
    state: 'patrol',
    alert: 0,
    pauseT: 0, scanBase: 0, scanT: 0, lookT: 0,
    lastSeen: null, memory: 0, target: null,
    stepAcc: 0,
  };
}

/** A noise reaches a guard: unless he is already chasing, he goes to look. */
export function hearNoise(g, x, y) {
  if (g.state === 'chase') return;
  g.target = { x, y };
  g.alert = Math.max(g.alert, 0.45);
  if (g.state === 'patrol' || g.state === 'return' || g.state === 'suspicious') {
    g.state = 'investigate';
    g.lookT = 0;
  }
}

/** How strongly this guard sees the player right now: a fill rate per second. */
function senseRate(g, player, level) {
  const dx = player.x - g.x;
  const dy = player.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_RANGE) return 0;
  const ang = Math.atan2(dy, dx);
  const inCone = Math.abs(angleDelta(g.angle, ang)) < GUARD_FOV / 2;
  if (!inCone && dist > 26) return 0;
  if (!losClear(g.x, g.y, player.x, player.y, level.segments)) return 0;
  const lit = isLit(level.lanterns, player.x, player.y);
  if (!lit && dist > 58) return 0; // a shadow hides you past a few paces
  const closeness = 1.6 - dist / GUARD_RANGE;
  const lightMul = lit ? 2.2 : 0.55;
  const moveMul = player.tier === 'run' ? 1.5 : player.tier === 'walk' ? 1.12 : 0.8;
  return closeness * lightMul * moveMul;
}

function moveToward(g, tx, ty, speed, dt, level, fx) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return 0;
  const want = Math.atan2(dy, dx);
  g.angle = turnToward(g.angle, want, 5.2 * dt);
  const step = Math.min(dist, speed * dt);
  moveCircle(g, g.r, Math.cos(g.angle) * step, Math.sin(g.angle) * step, level.solids);
  g.stepAcc += step;
  if (g.stepAcc >= 34) {
    g.stepAcc = 0;
    fx.ripple(g.x, g.y, 'step');
  }
  return dist;
}

function scan(g, dt, centre) {
  g.scanT += dt;
  g.angle = centre + Math.sin(g.scanT * 1.7) * 0.55;
}

/**
 * Advance one guard. world: {level, player, fx}. fx: {ripple, sting, alarm,
 * spotted, caught}. Returns nothing; sets world.caught via fx when a chasing
 * guard lays a hand on the player.
 */
export function updateGuard(g, dt, world) {
  const { level, player, fx } = world;
  const rate = senseRate(g, player, level);
  const sees = rate > 0;
  if (sees) {
    g.alert = Math.min(1, g.alert + rate * dt);
    g.lastSeen = { x: player.x, y: player.y };
    g.memory = 4;
  } else {
    g.memory = Math.max(0, g.memory - dt);
    const decay = g.state === 'chase' ? 0.055 : 0.14;
    g.alert = Math.max(0, g.alert - decay * dt);
  }

  // State transitions driven by the meter.
  if (g.alert >= 1 && g.state !== 'chase') {
    g.state = 'chase';
    fx.spotted();
    fx.alarm();
  } else if (g.alert >= 0.62 && (g.state === 'patrol' || g.state === 'return' || g.state === 'suspicious')) {
    g.state = 'investigate';
    g.target = g.lastSeen ? { ...g.lastSeen } : null;
    g.lookT = 0;
  } else if (g.alert >= 0.34 && g.state === 'patrol') {
    g.state = 'suspicious';
    fx.sting();
  }

  switch (g.state) {
    case 'patrol': {
      if (g.pauseT > 0) {
        g.pauseT -= dt;
        scan(g, dt, g.scanBase);
        break;
      }
      const wp = g.waypoints[g.wp];
      const left = moveToward(g, wp.x, wp.y, g.baseSpeed, dt, level, fx);
      if (left < 7) {
        g.wp = (g.wp + 1) % g.waypoints.length;
        const next = g.waypoints[g.wp];
        g.scanBase = Math.atan2(next.y - g.y, next.x - g.x);
        g.scanT = 0;
        g.pauseT = 1.15;
      }
      break;
    }
    case 'suspicious': {
      if (g.lastSeen) {
        const want = Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x);
        g.angle = turnToward(g.angle, want, 3.4 * dt);
      }
      if (g.alert < 0.18) g.state = 'patrol';
      break;
    }
    case 'investigate': {
      const t = g.target ?? g.lastSeen;
      if (!t) { g.state = 'return'; break; }
      const left = moveToward(g, t.x, t.y, g.baseSpeed * 1.55, dt, level, fx);
      if (left < 10) {
        g.lookT += dt;
        scan(g, dt, g.angle);
        if (g.lookT > 1.6) {
          g.lookT = 0;
          g.target = null;
          if (g.alert < 0.3) g.state = 'return';
          else if (g.lastSeen) g.target = { ...g.lastSeen };
        }
      }
      if (g.alert < 0.12 && !sees) g.state = 'return';
      break;
    }
    case 'chase': {
      const t = sees || g.memory > 0 ? (g.lastSeen ?? { x: player.x, y: player.y }) : null;
      if (!t) {
        g.state = 'investigate';
        g.alert = 0.72;
        g.target = g.lastSeen;
        break;
      }
      moveToward(g, t.x, t.y, world.chaseSpeed, dt, level, fx);
      const d = Math.hypot(player.x - g.x, player.y - g.y);
      if (d < CAUGHT_DIST) fx.caught();
      break;
    }
    case 'return': {
      // Head back to the nearest waypoint, then resume the loop.
      let best = null;
      let bestD = Infinity;
      g.waypoints.forEach((wpt, i) => {
        const d = Math.hypot(wpt.x - g.x, wpt.y - g.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      const wp = g.waypoints[best];
      const left = moveToward(g, wp.x, wp.y, g.baseSpeed * 1.25, dt, level, fx);
      if (left < 8) {
        g.wp = (best + 1) % g.waypoints.length;
        g.state = 'patrol';
        g.pauseT = 0.4;
        g.scanBase = g.angle;
        g.scanT = 0;
      }
      break;
    }
    default:
      g.state = 'patrol';
  }
}
