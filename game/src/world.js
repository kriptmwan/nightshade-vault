// Nightshade Vault — the simulation: movement and collision, guard patrols
// and suspicion, the detection meter, noise, pebbles, loot and the exit.
// Rendering never touches these rules; it only draws this state.

import { DETECT, FIELD, GUARD, LIVES, PEBBLE, PLAYER, SCORE, STEP } from './config.js';
import { LEVELS } from './levels.js';
import { guardSeesPlayer, pointInRect } from './vision.js';

export const STATUS_TITLE = 'title';
export const STATUS_PLAY = 'play';
export const STATUS_LEVEL_CLEAR = 'levelClear';
export const STATUS_CAUGHT = 'caught';
export const STATUS_GAME_OVER = 'gameOver';
export const STATUS_WIN = 'win';

const BORDER = 24;

// Every solid rect of the level: the border plus walls and crates.
function buildSolids(level) {
  const solids = [
    { x: 0, y: 0, w: FIELD.width, h: BORDER },
    { x: 0, y: FIELD.height - BORDER, w: FIELD.width, h: BORDER },
    { x: 0, y: 0, w: BORDER, h: FIELD.height },
    { x: FIELD.width - BORDER, y: 0, w: BORDER, h: FIELD.height },
  ];
  for (const wall of level.walls) solids.push(wall);
  for (const crate of level.crates) solids.push(crate);
  return solids;
}

function circleHitsRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

function makeGuard(def) {
  const first = def.waypoints[0];
  const second = def.waypoints[1] ?? first;
  return {
    x: first.x,
    y: first.y,
    angle: Math.atan2(second.y - first.y, second.x - first.x),
    baseAngle: Math.atan2(second.y - first.y, second.x - first.x),
    waypointIndex: 1 % def.waypoints.length,
    wait: 0,
    scanDir: 1,
    state: 'patrol',
    meter: 0,
    lastSeen: null,
    investigate: 0,
    chaseTimer: 0,
    stepPhase: 0,
  };
}

export class World {
  constructor() {
    this.levelIndex = 0;
    this.lives = LIVES;
    this.score = 0;
    this.best = 0;
    this.status = STATUS_TITLE;
    this.time = 0;
    this.events = [];
    this.message = '';
    this.messageTimer = 0;
    this.loadLevel(0);
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  loadLevel(index) {
    this.levelIndex = index;
    const level = LEVELS[index];
    this.solids = buildSolids(level);
    this.player = { x: level.start.x, y: level.start.y, sneaking: false, moving: false };
    this.guards = level.guards.map((def, index) => {
      const guard = makeGuard(def);
      guard.defIndex = index;
      return guard;
    });
    this.gems = level.gems.map((gem) => ({ x: gem.x, y: gem.y, taken: false }));
    this.pebbles = PEBBLE.perLevel;
    this.exitArmed = false;
    this.ghost = true;
    this.time = 0;
    this.status = STATUS_PLAY;
  }

  reset() {
    this.lives = LIVES;
    this.score = 0;
    this.loadLevel(0);
    this.status = STATUS_TITLE;
  }

  // The player is hidden when standing in a bush or a dark zone.
  playerHidden() {
    const { x, y } = this.player;
    for (const bush of this.level.bushes) if (pointInRect(x, y, bush)) return true;
    for (const zone of this.level.dark) if (pointInRect(x, y, zone)) return true;
    return false;
  }

  gemsLeft() {
    let left = 0;
    for (const gem of this.gems) if (!gem.taken) left += 1;
    return left;
  }

  // Highest detection meter among the guards; the HUD's alarm bar.
  maxMeter() {
    let top = 0;
    for (const guard of this.guards) top = Math.max(top, guard.meter);
    return top;
  }

  anyAlarm() {
    return this.guards.some((guard) => guard.state === 'chase');
  }

  // Move a circle with axis-separated collision so it slides along walls.
  moveCircle(body, dx, dy, radius) {
    const nx = body.x + dx;
    let blocked = false;
    for (const solid of this.solids) if (circleHitsRect(nx, body.y, radius, solid)) blocked = true;
    if (!blocked) body.x = nx;
    const ny = body.y + dy;
    blocked = false;
    for (const solid of this.solids) if (circleHitsRect(body.x, ny, radius, solid)) blocked = true;
    if (!blocked) body.y = ny;
  }

  throwPebble(x, y) {
    if (this.status !== STATUS_PLAY || this.pebbles <= 0) return false;
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    if (Math.hypot(dx, dy) > PEBBLE.throwRange) return false;
    this.pebbles -= 1;
    this.events.push({ type: 'pebble', x, y });
    for (const guard of this.guards) {
      if (Math.hypot(guard.x - x, guard.y - y) > PEBBLE.hearRadius) continue;
      if (guard.state === 'chase') continue;
      guard.state = 'suspicious';
      guard.lastSeen = { x, y };
      guard.meter = Math.max(guard.meter, DETECT.suspiciousAt);
    }
    return true;
  }

  // One fixed step. `input` is { mx, my, sneak } from input.js.
  step(dt, input) {
    if (this.status !== STATUS_PLAY) return;
    this.time += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;

    const player = this.player;
    player.sneaking = Boolean(input.sneak);
    const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(input.mx, input.my);
    player.moving = len > 0;
    if (len > 0) {
      const nx = input.mx / len;
      const ny = input.my / len;
      this.moveCircle(player, nx * speed * dt, ny * speed * dt, PLAYER.radius);
    }

    // Running is loud: guards close enough come to look.
    if (player.moving && !player.sneaking) {
      for (const guard of this.guards) {
        if (guard.state !== 'patrol') continue;
        if (Math.hypot(guard.x - player.x, guard.y - player.y) > PLAYER.noiseRadius) continue;
        guard.state = 'suspicious';
        guard.lastSeen = { x: player.x, y: player.y };
        guard.meter = Math.max(guard.meter, DETECT.suspiciousAt);
      }
    }

    // Loot: walking over a gem takes it.
    for (const gem of this.gems) {
      if (gem.taken) continue;
      if (Math.hypot(gem.x - player.x, gem.y - player.y) < PLAYER.radius + 16) {
        gem.taken = true;
        this.score += SCORE.gem;
        this.events.push({ type: 'gem', x: gem.x, y: gem.y });
        if (this.gemsLeft() === 0) {
          this.exitArmed = true;
          this.showMessage('Exit open — reach the green door, unseen.');
          this.events.push({ type: 'exitOpen' });
        }
      }
    }

    // The exit only works once every gem is taken.
    if (this.exitArmed && pointInRect(player.x, player.y, this.level.exit)) {
      this.clearLevel();
      return;
    }

    const hidden = this.playerHidden();
    for (const guard of this.guards) this.updateGuard(guard, dt, hidden);
  }

  updateGuard(guard, dt, hidden) {
    const player = this.player;
    const sees = guardSeesPlayer(guard, player, this.solids);
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);

    if (sees) {
      const closeness = 1 - dist / GUARD.viewRange;
      let rate = DETECT.fillFar + (DETECT.fillClose - DETECT.fillFar) * closeness;
      if (player.sneaking) rate *= DETECT.sneakFactor;
      if (hidden) rate *= DETECT.hiddenFactor;
      guard.meter = Math.min(1, guard.meter + rate * dt);
      guard.lastSeen = { x: player.x, y: player.y };
      if (guard.meter >= 1 && guard.state !== 'chase') {
        guard.state = 'chase';
        guard.chaseTimer = GUARD.chaseMemory;
        this.ghost = false;
        this.events.push({ type: 'alarm', x: guard.x, y: guard.y });
        this.showMessage('SPOTTED! Break line of sight!');
      } else if (guard.meter >= DETECT.suspiciousAt && guard.state === 'patrol') {
        guard.state = 'suspicious';
      }
    } else {
      guard.meter = Math.max(0, guard.meter - DETECT.drain * dt);
    }

    if (guard.state === 'patrol') this.patrolGuard(guard, dt);
    else if (guard.state === 'suspicious') this.suspiciousGuard(guard, dt);
    else if (guard.state === 'chase') this.chaseGuard(guard, dt, sees);
    else this.returnGuard(guard, dt);

    // Caught: a chasing guard that reaches you ends the attempt.
    if (guard.state === 'chase' && Math.hypot(guard.x - player.x, guard.y - player.y) < GUARD.radius + PLAYER.radius + 2) {
      this.caught();
    }
  }

  patrolGuard(guard, dt) {
    const def = this.level.guards[guard.defIndex];
    const target = def.waypoints[guard.waypointIndex];
    if (guard.wait > 0) {
      guard.wait -= dt;
      // Scan the room while waiting: sweep the cone back and forth.
      guard.angle = guard.baseAngle + Math.sin(this.time * 1.1 + guard.stepPhase) * 0.6;
      return;
    }
    const arrived = this.moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt);
    if (arrived) {
      guard.waypointIndex = (guard.waypointIndex + 1) % def.waypoints.length;
      guard.wait = GUARD.waitAtWaypoint;
      guard.baseAngle = guard.angle;
      guard.stepPhase = this.time;
    }
  }

  suspiciousGuard(guard, dt) {
    if (!guard.lastSeen) {
      guard.state = 'return';
      return;
    }
    const arrived = this.moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.suspiciousSpeed, dt);
    if (arrived) {
      guard.investigate += dt;
      guard.angle = guard.baseAngle + Math.sin(this.time * 2.2) * 1.1;
      if (guard.investigate > GUARD.investigateTime) {
        guard.investigate = 0;
        guard.state = 'return';
      }
    } else {
      guard.investigate = 0;
    }
  }

  chaseGuard(guard, dt, sees) {
    if (sees) guard.chaseTimer = GUARD.chaseMemory;
    else guard.chaseTimer -= dt;
    this.moveToward(guard, this.player.x, this.player.y, GUARD.chaseSpeed, dt);
    if (guard.chaseTimer <= 0) guard.state = 'return';
  }

  returnGuard(guard, dt) {
    // Walk back to the nearest patrol waypoint, then resume the patrol.
    const def = this.level.guards[guard.defIndex];
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < def.waypoints.length; i += 1) {
      const d = Math.hypot(def.waypoints[i].x - guard.x, def.waypoints[i].y - guard.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    const arrived = this.moveToward(guard, def.waypoints[best].x, def.waypoints[best].y, GUARD.patrolSpeed, dt);
    if (arrived) {
      guard.waypointIndex = (best + 1) % def.waypoints.length;
      guard.state = 'patrol';
      guard.wait = 0.4;
    }
  }

  // Step toward (tx, ty) at `speed`; face the direction of travel.
  // Returns true when the target is reached this step.
  moveToward(guard, tx, ty, speed, dt) {
    const dx = tx - guard.x;
    const dy = ty - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return true;
    const step = Math.min(dist, speed * dt);
    const nx = (dx / dist) * step;
    const ny = (dy / dist) * step;
    guard.angle = Math.atan2(dy, dx);
    guard.baseAngle = guard.angle;
    this.moveCircle(guard, nx, ny, GUARD.radius);
    guard.stepPhase += step;
    if (Math.floor(guard.stepPhase / 26) !== Math.floor((guard.stepPhase - step) / 26)) {
      this.events.push({ type: 'guardStep', x: guard.x, y: guard.y });
    }
    return dist - step < 6;
  }

  showMessage(text) {
    this.message = text;
    this.messageTimer = 3.5;
  }

  clearLevel() {
    const timeBonus = Math.max(0, Math.round((this.level.par - this.time) * 10));
    if (this.ghost) this.score += SCORE.ghostLevel;
    this.score += timeBonus;
    this.events.push({ type: 'levelClear', ghost: this.ghost, timeBonus });
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.status = STATUS_WIN;
      this.best = Math.max(this.best, this.score);
    } else {
      this.status = STATUS_LEVEL_CLEAR;
    }
  }

  nextLevel() {
    this.loadLevel(this.levelIndex + 1);
  }

  caught() {
    this.lives -= 1;
    this.events.push({ type: 'caught' });
    if (this.lives <= 0) {
      this.status = STATUS_GAME_OVER;
      this.best = Math.max(this.best, this.score);
      return;
    }
    // The attempt restarts: you keep the gems you already took, but every
    // guard forgets you and the level's ghost bonus is gone.
    this.status = STATUS_CAUGHT;
    this.ghost = false;
  }

  resumeAfterCaught() {
    const level = this.level;
    this.player.x = level.start.x;
    this.player.y = level.start.y;
    this.guards = level.guards.map((def, index) => {
      const guard = makeGuard(def);
      guard.defIndex = index;
      return guard;
    });
    this.pebbles = PEBBLE.perLevel;
    this.time = 0;
    this.status = STATUS_PLAY;
  }
}

// Fixed-step helper used by the main loop and the screenshot staging.
export function stepWorld(world, seconds, input) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, input);
}
