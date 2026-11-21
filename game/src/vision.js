// Nightshade Vault — sight lines and vision cones. A guard sees you only
// when you are inside its cone AND no wall or crate stands between you.
// The same ray casting draws the cone on screen, so what you see is exactly
// what the guard sees: the cone stops at walls.

import { GUARD } from './config.js';

// True when point (px, py) lies inside rect r (edges count as inside).
export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// True when the segment (x1,y1)-(x2,y2) touches or crosses rect r.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Slab test: the segment's parameter range inside the rect's x/y slabs.
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// True when nothing solid stands between (x1,y1) and (x2,y2).
export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (let i = 0; i < solids.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, solids[i])) return false;
  }
  return true;
}

// How far a ray from (x, y) along `angle` travels before hitting a solid
// rect or the field edge. Steps are small enough that the drawn cone hugs
// walls instead of leaking through them.
export function castRay(x, y, angle, maxDist, solids, field) {
  const step = 6;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let px = x;
  let py = y;
  for (let d = 0; d < maxDist; d += step) {
    px += dx;
    py += dy;
    if (px < 0 || py < 0 || px > field.width || py > field.height) return d;
    for (let i = 0; i < solids.length; i += 1) {
      if (pointInRect(px, py, solids[i])) return d;
    }
  }
  return maxDist;
}

// The cone's outline as a list of points: the guard's position, then one
// ray-cast point per step across the cone's spread. Used by the renderer.
export function conePolygon(guard, solids, field) {
  const points = [{ x: guard.x, y: guard.y }];
  const rays = 26;
  const half = GUARD.viewHalfAngle;
  for (let i = 0; i <= rays; i += 1) {
    const angle = guard.angle - half + (2 * half * i) / rays;
    const dist = castRay(guard.x, guard.y, angle, GUARD.viewRange, solids, field);
    points.push({ x: guard.x + Math.cos(angle) * dist, y: guard.y + Math.sin(angle) * dist });
  }
  return points;
}

// True when the guard can currently see the player: inside range, inside
// the cone's angle, and with a clear line of sight.
export function guardSeesPlayer(guard, player, solids) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.viewRange) return false;
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > GUARD.viewHalfAngle) return false;
  return hasLineOfSight(guard.x, guard.y, player.x, player.y, solids);
}
