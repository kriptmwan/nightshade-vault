// Nightshade Vault — the screenshot scenes behind ?shot=start|play|end.
// Each one plays the real rules forward from a fresh world, steered by a
// patient autopilot: it sneaks everywhere and waits in cover whenever a
// guard is close, the way a careful player would. The frame is what a real
// game looks like, and the same seed always gives the same frame. If the
// autopilot is ever caught mid-route, the shot falls back to a posed frame:
// the level reloaded, then stepped forward with no input so the guards walk
// to mid-patrol on their own.

import { LIVES, STEP } from './config.js';
import { stepWorld } from './world.js';

// A leg is safe to start when no guard is close to the player, to the next
// waypoint, or to the leg's midpoint, and none is currently spotting the
// player. The autopilot waits (sneaking, still) until it is.
function legIsSafe(world, from, target) {
  const mid = { x: (from.x + target.x) / 2, y: (from.y + target.y) / 2 };
  for (const guard of world.guards) {
    if (Math.hypot(guard.x - world.player.x, guard.y - world.player.y) < 190) return false;
    if (target && Math.hypot(guard.x - target.x, guard.y - target.y) < 170) return false;
    if (Math.hypot(guard.x - mid.x, guard.y - mid.y) < 170) return false;
    if (guard.meter > 0.1) return false;
  }
  return true;
}

// Walk the waypoint route, sneaking, waiting for safe legs. Returns true
// when the route finished with the game still in play (or cleared).
function runRoute(world, route, maxSeconds) {
  const totalSteps = Math.round(maxSeconds / STEP);
  let leg = 0;
  let waitSteps = 0;
  for (let step = 0; step < totalSteps; step += 1) {
    if (world.status !== 'play') return world.status === 'levelClear' || world.status === 'win';
    if (leg >= route.length) return true;
    const target = route[leg];
    const dx = target.x - world.player.x;
    const dy = target.y - world.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 14) {
      leg += 1;
      waitSteps = 0;
      continue;
    }
    if (!legIsSafe(world, world.player, target)) {
      waitSteps += 1;
      if (waitSteps > Math.round(9 / STEP)) {
        // Patience ran out: take the leg anyway, still sneaking.
        waitSteps = 0;
      } else {
        world.step(STEP, { mx: 0, my: 0, sneak: true });
        continue;
      }
    }
    world.step(STEP, { mx: dx / dist, my: dy / dist, sneak: true });
  }
  return leg >= route.length;
}

// Step the world forward with no input so guards walk to mid-patrol.
function idleForward(world, seconds) {
  stepWorld(world, seconds, { mx: 0, my: 0, sneak: false });
  world.player.x = world.level.start.x;
  world.player.y = world.level.start.y;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title screen over level 1. play: mid-game on level 2, two gems
 * in. end: level 1 cleared, the level-clear screen.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    world.loadLevel(1);
    // Top corridor of level 2: over the first guard's patrol box, in along
    // the east side to the top gem, then stop — mid-game, one gem in.
    const route = [
      { x: 200, y: 150 },
      { x: 200, y: 60 },
      { x: 420, y: 60 },
      { x: 700, y: 60 },
      { x: 700, y: 120 },
      { x: 640, y: 120 },
      { x: 700, y: 140 },
    ];
    const ok = runRoute(world, route, 75);
    if (!ok || world.status !== 'play') {
      world.loadLevel(1);
      idleForward(world, 14);
      world.player.x = 700;
      world.player.y = 260;
    }
    return { screen: 'play' };
  }
  if (name === 'end') {
    // A fresh attempt must not keep the previous attempt's score or lives.
    world.score = 0;
    world.lives = LIVES;
    world.loadLevel(0);
    // Full clear of level 1: up the west side to the first gem, over the
    // top to the middle gem (ducking around the first guard's loop), then
    // along the south corridor to the last gem and up the east side to the
    // exit. Every leg waits for a safe patrol phase before it starts.
    const route = [
      { x: 150, y: 400 },
      { x: 300, y: 300 },
      { x: 300, y: 120 },
      { x: 300, y: 90 },
      { x: 500, y: 90 },
      { x: 640, y: 120 },
      { x: 520, y: 160 },
      { x: 520, y: 300 },
      { x: 520, y: 380 },
      { x: 640, y: 380 },
      { x: 640, y: 360 },
      { x: 520, y: 480 },
      { x: 520, y: 620 },
      { x: 660, y: 680 },
      { x: 780, y: 680 },
      { x: 1120, y: 680 },
      { x: 1120, y: 620 },
      { x: 985, y: 535 },
      { x: 1120, y: 300 },
      { x: 1120, y: 120 },
      { x: 1212, y: 76 },
    ];
    const ok = runRoute(world, route, 170);
    if (world.status === 'levelClear') return { screen: 'levelClear' };
    if (!ok) {
      // Second try: a fresh attempt with the same route usually clears on
      // timing alone, since the patrol phases have shifted.
      world.score = 0;
      world.lives = LIVES;
      world.loadLevel(0);
      const retry = runRoute(world, route, 170);
      if (retry && world.status === 'levelClear') return { screen: 'levelClear' };
    }
    world.loadLevel(0);
    idleForward(world, 10);
    return { screen: 'play' };
  }
  world.reset();
  return { screen: 'title' };
}
