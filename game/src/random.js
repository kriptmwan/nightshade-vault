// Nightshade Vault — a small seeded random generator (mulberry32).
// Gameplay itself is fully deterministic; the screenshot autopilot uses this
// so a staged shot is the same frame every time it is taken.

export function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an element of `items` with the seeded generator.
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
