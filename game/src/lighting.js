// lighting.js — lantern light pools. A lantern throws a soft circular pool;
// inside a pool the courier is lit (seen far and fast), outside it he is a
// shadow (seen only at point-blank). The same numbers drive detection and
// the drawn light layer, so what the screenshot shows is what the guards use.

/** Light level 0..1 at a point: the strongest lantern pool covering it. */
export function lightLevelAt(lanterns, x, y) {
  let best = 0;
  for (const l of lanterns) {
    const d = Math.hypot(x - l.x, y - l.y);
    if (d < l.r) {
      const v = 1 - d / l.r;
      if (v > best) best = v;
    }
  }
  return best;
}

/** Lit means standing in the bright heart of a pool, not its dim rim. */
export function isLit(lanterns, x, y) {
  return lightLevelAt(lanterns, x, y) > 0.34;
}

/**
 * Draw the night over the scene: a translucent dark-blue veil everywhere,
 * cut away in soft radial pools around each lantern, then a warm amber wash
 * inside the pools. Uses an offscreen canvas for the veil so the pools have
 * feathered edges. `veil` is a reusable canvas owned by the caller.
 */
export function drawLighting(ctx, veil, lanterns, w, h, t) {
  const vctx = veil.getContext('2d');
  if (veil.width !== w) { veil.width = w; veil.height = h; }
  vctx.clearRect(0, 0, w, h);
  vctx.fillStyle = 'rgba(7, 11, 26, 0.50)';
  vctx.fillRect(0, 0, w, h);
  vctx.globalCompositeOperation = 'destination-out';
  for (const l of lanterns) {
    const flicker = 1 + Math.sin(t * 7 + l.x * 0.7 + l.y * 1.3) * 0.02;
    const r = l.r * flicker;
    const g = vctx.createRadialGradient(l.x, l.y, r * 0.08, l.x, l.y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.92)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.62)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    vctx.fillStyle = g;
    vctx.beginPath();
    vctx.arc(l.x, l.y, r, 0, Math.PI * 2);
    vctx.fill();
  }
  vctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(veil, 0, 0);
  // Warm wash so lit ground reads amber against the teal shadow.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lanterns) {
    const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(255, 176, 84, 0.20)');
    g.addColorStop(0.6, 'rgba(255, 150, 60, 0.07)');
    g.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The lantern fixture itself: post, lamp housing and a bright flame core. */
export function drawLantern(ctx, l, t) {
  const flick = 0.85 + Math.sin(t * 9 + l.x) * 0.15;
  ctx.save();
  ctx.fillStyle = '#2a2118';
  ctx.fillRect(l.x - 3, l.y - 4, 6, 16);
  ctx.fillStyle = '#0d0f16';
  ctx.beginPath();
  ctx.arc(l.x, l.y - 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const g = ctx.createRadialGradient(l.x, l.y - 10, 0, l.x, l.y - 10, 9);
  g.addColorStop(0, `rgba(255, 236, 170, ${0.95 * flick})`);
  g.addColorStop(0.5, `rgba(255, 190, 92, ${0.75 * flick})`);
  g.addColorStop(1, 'rgba(255, 150, 50, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(l.x, l.y - 10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
