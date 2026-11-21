// vision.js — geometry for sight: raycasts against wall segments, vision-cone
// polygons clipped by cover, line-of-sight tests, and circle movement that
// slides along solid rectangles. Everything the guards "see" goes through here.

/** Convert solid rectangles into their four edge segments each. */
export function rectsToSegments(rects) {
  const segs = [];
  for (const r of rects) {
    const x2 = r.x + r.w;
    const y2 = r.y + r.h;
    segs.push({ x1: r.x, y1: r.y, x2, y2: r.y });
    segs.push({ x1: x2, y1: r.y, x2, y2 });
    segs.push({ x1: x2, y1: y2, x2: r.x, y2 });
    segs.push({ x1: r.x, y1: y2, x2: r.x, y2: r.y });
  }
  return segs;
}

/**
 * Distance from (ox, oy) along the unit direction (dx, dy) to segment s,
 * or Infinity when the ray misses. Standard ray/segment parametric test.
 */
function raySegment(ox, oy, dx, dy, s) {
  const ex = s.x2 - s.x1;
  const ey = s.y2 - s.y1;
  const denom = dx * ey - dy * ex;
  if (Math.abs(denom) < 1e-9) return Infinity;
  const fx = s.x1 - ox;
  const fy = s.y1 - oy;
  const t = (fx * ey - fy * ex) / denom;
  const u = (fx * dy - fy * dx) / denom;
  if (t < 0 || u < 0 || u > 1) return Infinity;
  return t;
}

/** Nearest hit distance from (ox, oy) facing `angle`, capped at maxDist. */
export function raycast(ox, oy, angle, segments, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const s of segments) {
    const t = raySegment(ox, oy, dx, dy, s);
    if (t < best) best = t;
  }
  return best;
}

/** True when nothing solid blocks the straight line from a to b. */
export function losClear(x1, y1, x2, y2, segments) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return true;
  const ux = dx / dist;
  const uy = dy / dist;
  for (const s of segments) {
    const t = raySegment(x1, y1, ux, uy, s);
    if (t < dist - 1.5) return false;
  }
  return true;
}

/**
 * The visible fan of a vision cone: a polygon from the eye, swept across the
 * field of view in `rays` steps, each ray stopped by the first wall it meets.
 * This is what render.js fills, so the cone the player sees is the cone the
 * guard actually uses.
 */
export function conePolygon(x, y, angle, fov, range, segments, rays = 26) {
  const pts = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - fov / 2 + (fov * i) / rays;
    const d = raycast(x, y, a, segments, range);
    pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return pts;
}

/** Shortest distance from a point to a rectangle (0 when inside). */
export function distToRect(px, py, r) {
  const cx = Math.max(r.x, Math.min(px, r.x + r.w));
  const cy = Math.max(r.y, Math.min(py, r.y + r.h));
  return Math.hypot(px - cx, py - cy);
}

export function pointInRect(px, py, r, pad = 0) {
  return px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad;
}

/**
 * Move a circle by (dx, dy) and push it out of any solid rectangle it ends up
 * overlapping, along the shortest exit — so it slides along walls instead of
 * sticking. Steps in this game are a few pixels, so one resolve pass (run
 * twice for corners) is stable. Mutates and returns pos {x, y}.
 */
export function moveCircle(pos, radius, dx, dy, solids) {
  pos.x += dx;
  pos.y += dy;
  for (let pass = 0; pass < 2; pass++) {
    for (const r of solids) {
      const cx = Math.max(r.x, Math.min(pos.x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(pos.y, r.y + r.h));
      let ox = pos.x - cx;
      let oy = pos.y - cy;
      const d2 = ox * ox + oy * oy;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        pos.x = cx + (ox / d) * radius;
        pos.y = cy + (oy / d) * radius;
      } else {
        // Centre inside the rect: leave by the nearest face.
        const exits = [
          { d: pos.x - r.x, x: r.x - radius, y: pos.y },
          { d: r.x + r.w - pos.x, x: r.x + r.w + radius, y: pos.y },
          { d: pos.y - r.y, x: pos.x, y: r.y - radius },
          { d: r.y + r.h - pos.y, x: pos.x, y: r.y + r.h + radius },
        ];
        exits.sort((a, b) => a.d - b.d);
        pos.x = exits[0].x;
        pos.y = exits[0].y;
      }
    }
  }
  return pos;
}

/** Clamp a position inside the play field with a margin. */
export function clampToField(pos, w, h, margin) {
  pos.x = Math.max(margin, Math.min(w - margin, pos.x));
  pos.y = Math.max(margin, Math.min(h - margin, pos.y));
  return pos;
}

/** Smallest signed angle from a to b, in -PI..PI. */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Turn `angle` toward `target` by at most maxStep radians. */
export function turnToward(angle, target, maxStep) {
  const d = angleDelta(angle, target);
  if (Math.abs(d) <= maxStep) return target;
  return angle + Math.sign(d) * maxStep;
}
