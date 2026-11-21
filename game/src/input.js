// input.js — keyboard and mouse state for LANTERNFALL.
// The game polls `keys` each tick; discrete events (clicks, presses) are queued
// so a fast tap between frames is never lost.

export const input = {
  keys: new Set(),
  clicks: [],        // queued {x, y} canvas-space click points
  pressed: new Set(), // key codes that went down since the last consumePresses()
};

const HANDLED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

export function attachInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (HANDLED.has(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.clicks.push({ x, y });
  });
}

/** Movement vector from the held keys: {x, y} each in -1..1, not normalised. */
export function moveVector() {
  const k = input.keys;
  let x = 0;
  let y = 0;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
  if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
  return { x, y };
}

export function sneakHeld() {
  return input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}

export function runHeld() {
  return input.keys.has('Space');
}

/** Return and clear the set of keys pressed since the last call. */
export function consumePresses() {
  const out = new Set(input.pressed);
  input.pressed.clear();
  return out;
}

/** Return and clear the queued clicks. */
export function consumeClicks() {
  const out = input.clicks.slice();
  input.clicks.length = 0;
  return out;
}
