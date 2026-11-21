// Nightshade Vault — the three levels. Each level is a hand-laid floor plan:
// interior walls and crates block movement and sight, bushes and dark zones
// hide you, gems are the loot, and the exit only opens once every gem is
// taken. Guard patrols are waypoint loops kept clear of every solid rect,
// so a guard never gets stuck on a wall. Border walls are added by world.js.

function rect(x, y, w, h) {
  return { x, y, w, h };
}

export const LEVELS = [
  {
    name: 'The Gallery',
    intro: 'Slip past the night watch. Take all 3 emeralds, then reach the green exit.',
    par: 90,
    start: { x: 80, y: 620 },
    exit: rect(1184, 48, 56, 56),
    walls: [
      rect(400, 120, 24, 280),
      rect(856, 320, 24, 280),
      rect(560, 200, 340, 24),
      rect(560, 480, 180, 24),
    ],
    crates: [
      rect(540, 300, 56, 56),
      rect(700, 600, 56, 56),
      rect(1000, 200, 56, 56),
      rect(240, 430, 56, 56),
    ],
    bushes: [
      rect(150, 150, 120, 70),
      rect(920, 500, 130, 70),
      rect(620, 110, 110, 60),
    ],
    dark: [
      rect(1020, 320, 130, 110),
      rect(280, 560, 150, 90),
    ],
    gems: [
      { x: 640, y: 360 },
      { x: 1120, y: 620 },
      { x: 300, y: 120 },
    ],
    guards: [
      {
        waypoints: [
          { x: 500, y: 160 },
          { x: 500, y: 560 },
          { x: 780, y: 560 },
          { x: 780, y: 160 },
        ],
      },
      {
        waypoints: [
          { x: 960, y: 120 },
          { x: 1200, y: 120 },
          { x: 1200, y: 480 },
          { x: 960, y: 480 },
        ],
      },
    ],
  },
  {
    name: 'The Vault Floor',
    intro: 'Three guards now, and the vault door is at the far corner. Mind the patrols.',
    par: 120,
    start: { x: 80, y: 80 },
    exit: rect(1184, 600, 56, 56),
    walls: [
      rect(320, 100, 24, 220),
      rect(640, 400, 24, 220),
      rect(960, 100, 24, 220),
      rect(420, 320, 140, 24),
      rect(820, 420, 100, 24),
    ],
    crates: [
      rect(480, 220, 56, 56),
      rect(820, 480, 56, 56),
      rect(1120, 360, 56, 56),
      rect(150, 500, 56, 56),
      rect(560, 240, 56, 56),
    ],
    bushes: [
      rect(120, 300, 130, 70),
      rect(760, 140, 120, 70),
      rect(1060, 560, 130, 70),
      rect(420, 560, 120, 60),
    ],
    dark: [
      rect(900, 300, 140, 100),
      rect(240, 120, 140, 90),
    ],
    gems: [
      { x: 200, y: 640 },
      { x: 640, y: 120 },
      { x: 1180, y: 140 },
      { x: 760, y: 620 },
    ],
    guards: [
      {
        waypoints: [
          { x: 380, y: 160 },
          { x: 380, y: 560 },
          { x: 600, y: 560 },
          { x: 600, y: 160 },
        ],
      },
      {
        waypoints: [
          { x: 760, y: 360 },
          { x: 1080, y: 360 },
          { x: 1080, y: 600 },
          { x: 760, y: 600 },
        ],
      },
      {
        waypoints: [
          { x: 240, y: 420 },
          { x: 240, y: 640 },
          { x: 480, y: 640 },
          { x: 480, y: 420 },
        ],
      },
    ],
  },
  {
    name: "The Director's Wing",
    intro: 'Four guards, five emeralds, no room for a mistake. Ghost it if you can.',
    par: 150,
    start: { x: 80, y: 640 },
    exit: rect(1184, 48, 56, 56),
    walls: [
      rect(280, 80, 24, 260),
      rect(600, 380, 24, 260),
      rect(940, 80, 24, 260),
      rect(380, 340, 180, 24),
      rect(700, 380, 180, 24),
      rect(1020, 180, 180, 24),
    ],
    crates: [
      rect(420, 160, 56, 56),
      rect(760, 560, 56, 56),
      rect(1080, 460, 56, 56),
      rect(160, 480, 56, 56),
      rect(520, 500, 56, 56),
    ],
    bushes: [
      rect(100, 120, 120, 70),
      rect(700, 120, 120, 70),
      rect(1100, 600, 120, 60),
      rect(380, 600, 120, 60),
    ],
    dark: [
      rect(860, 240, 140, 100),
      rect(200, 300, 130, 90),
    ],
    gems: [
      { x: 140, y: 640 },
      { x: 480, y: 80 },
      { x: 820, y: 80 },
      { x: 1180, y: 300 },
      { x: 640, y: 640 },
    ],
    guards: [
      {
        waypoints: [
          { x: 360, y: 120 },
          { x: 360, y: 300 },
          { x: 560, y: 300 },
          { x: 560, y: 120 },
        ],
      },
      {
        waypoints: [
          { x: 700, y: 120 },
          { x: 900, y: 120 },
          { x: 900, y: 300 },
          { x: 700, y: 300 },
        ],
      },
      {
        waypoints: [
          { x: 680, y: 460 },
          { x: 680, y: 640 },
          { x: 880, y: 640 },
          { x: 880, y: 460 },
        ],
      },
      {
        waypoints: [
          { x: 1040, y: 240 },
          { x: 1200, y: 240 },
          { x: 1200, y: 560 },
          { x: 1040, y: 560 },
        ],
      },
    ],
  },
];
