// shots.js — deterministic screenshot staging behind ?shot=title|hero|coin|chase.
// Each scene loads a real compound through the game's own loader, then poses
// the actors in states the simulation genuinely reaches (a suspicious guard
// mid-glance, a coin mid-arc, a chase breaking around a corner), so the frame
// is the game as it plays — arranged, never painted. Seeds are fixed in
// shots.json; the poses below are constants, so every capture is identical.

function pose(game, gi, x, y, angle, state, alert) {
  const g = game.guards[gi];
  g.x = x;
  g.y = y;
  g.angle = angle;
  g.state = state;
  g.alert = alert;
  return g;
}

/** Set the named scene on `game` (already booted) and return the screen to show. */
export function stageShot(game, name) {
  if (name === 'hero') {
    game.loadLevel(0);
    // The courier crouches in shadow beside the crate cluster, ledger glowing
    // across the compound, the gate arch in the same frame.
    game.player.x = 395;
    game.player.y = 385;
    game.player.tier = 'sneak';
    game.player.angle = 0.5;
    // A watchman at the top corridor, cone sweeping the shelves.
    pose(game, 0, 700, 140, Math.PI, 'patrol', 0);
    // The near miss: this guard's cone edge passes a hand's breadth from the
    // courier. He is amber — suspicious — staring at the crates.
    const g = pose(game, 1, 520, 470, -2.545 + 1.12, 'suspicious', 0.55);
    g.lastSeen = { x: 395, y: 385 };
    // Third watchman far right, mid-patrol.
    pose(game, 2, 1120, 300, Math.PI / 2, 'patrol', 0);
    return 'shot';
  }
  if (name === 'coin') {
    game.loadLevel(0);
    // The courier slips through shadow behind a watchman while a coin arcs
    // away to the stone in front of him.
    game.player.x = 520;
    game.player.y = 560;
    game.player.tier = 'walk';
    game.player.angle = -0.7;
    const g = pose(game, 1, 640, 470, -0.33, 'suspicious', 0.42);
    g.lastSeen = { x: 770, y: 425 };
    pose(game, 0, 450, 130, 0, 'patrol', 0);
    pose(game, 2, 1120, 430, Math.PI, 'patrol', 0);
    game.coin = { x0: 520, y0: 560, x1: 770, y1: 425, t: 0.24, dur: 0.5 };
    game.coinsLeft -= 1;
    game.effects.push({ kind: 'step', x: 520, y: 566, t: 0.2, dur: 0.55 });
    return 'shot';
  }
  if (name === 'chase') {
    game.loadLevel(1);
    // Compound Two: the courier has just broken around the corner of the
    // standing shelves into shadow; the alarm is up but draining.
    game.player.x = 250;
    game.player.y = 520;
    game.player.tier = 'run';
    game.player.angle = Math.PI;
    const g = pose(game, 0, 430, 500, Math.PI, 'chase', 0.9);
    g.lastSeen = { x: 250, y: 520 };
    g.memory = 2;
    const g2 = pose(game, 1, 700, 640, -2.2, 'investigate', 0.5);
    g2.target = { x: 640, y: 520 };
    pose(game, 2, 1100, 190, Math.PI, 'patrol', 0);
    pose(game, 3, 280, 720, 0, 'patrol', 0);
    game.effects.push({ kind: 'noise', x: 360, y: 500, t: 0.3, dur: 0.9, maxR: 138 });
    return 'shot';
  }
  // title (and any unknown name): Compound One, watchmen mid-patrol behind
  // the title panel.
  game.loadLevel(0);
  pose(game, 0, 560, 138, 0, 'patrol', 0);
  pose(game, 1, 590, 520, Math.PI, 'patrol', 0);
  pose(game, 2, 1120, 430, -Math.PI / 2, 'patrol', 0);
  return 'title';
}
