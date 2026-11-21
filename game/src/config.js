// Nightshade Vault — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 205,
  sneakSpeed: 112,
  // Running makes noise guards can hear; sneaking is silent.
  noiseRadius: 95,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 88,
  suspiciousSpeed: 118,
  chaseSpeed: 152,
  // Vision cone: how far a guard sees, and half its spread.
  viewRange: 235,
  viewHalfAngle: (34 * Math.PI) / 180,
  // How long a guard waits at each patrol waypoint, in seconds.
  waitAtWaypoint: 0.9,
  // Seconds a chasing guard keeps hunting after losing sight of you.
  chaseMemory: 4.0,
  // Seconds a suspicious guard stares at the spot it last saw you.
  investigateTime: 2.2,
};

// Detection meter 0..1, per guard. It fills while the guard sees you and
// drains while it does not. Crossing 0.35 makes the guard suspicious;
// reaching 1.0 raises the alarm and the guard chases.
export const DETECT = {
  // Base fill rate per second at point-blank range.
  fillClose: 1.6,
  // Fill rate per second at the far edge of the cone.
  fillFar: 0.55,
  // Sneaking multiplies the fill rate by this.
  sneakFactor: 0.45,
  // Hiding in a bush or a dark zone multiplies the fill rate by this.
  hiddenFactor: 0.35,
  // Drain rate per second while unseen.
  drain: 0.5,
  suspiciousAt: 0.35,
};

// A thrown pebble: how far its clatter carries, and how many you carry.
export const PEBBLE = { hearRadius: 230, perLevel: 3, throwRange: 420 };

export const LIVES = 3;

// Points: each gem, each level cleared unseen (ghost), and the time bonus.
export const SCORE = { gem: 150, ghostLevel: 400, timePar: 90 };

export const PALETTE = {
  backdrop: '#0b0e14',
  floor: '#232833',
  floorAlt: '#20252f',
  wall: '#3a4152',
  wallTop: '#4b5468',
  crate: '#5a4632',
  crateTop: '#6f5940',
  bush: '#1e4d2e',
  bushTop: '#2c6b3f',
  dark: '#141824',
  exit: '#2fd08c',
  exitGlow: '#7df0b8',
  gem: '#ffd94d',
  player: '#e8b64c',
  playerSneak: '#c98f2e',
  guard: '#d64545',
  guardBody: '#8c2f39',
  cone: 'rgba(255, 214, 90, 0.20)',
  coneAlert: 'rgba(255, 70, 60, 0.28)',
  coneSuspicious: 'rgba(255, 170, 60, 0.24)',
  text: '#eef1f5',
  muted: '#9aa3b2',
  panel: 'rgba(12, 15, 22, 0.82)',
  danger: '#ff5a4e',
  warn: '#ffb02e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'nightshade-vault.best';
