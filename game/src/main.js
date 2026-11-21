// Nightshade Vault — boot and the game loop. A fixed-step simulation (60
// updates a second whatever the display's rate), screens driven by the
// world's status, and every world event turned into a sound. With
// ?shot=start|play|end the game stages one deterministic screenshot scene
// and draws a single frame instead of looping.

import { STEP } from './config.js';
import { World, STATUS_CAUGHT, STATUS_GAME_OVER, STATUS_LEVEL_CLEAR, STATUS_PLAY, STATUS_TITLE, STATUS_WIN } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const world = new World();
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const sounds = new SoundBank();
let paused = false;
let screen = STATUS_TITLE;
let lastStatusText = '';
let stepAccumulator = 0;
let lastTime = 0;
let playerStepDebt = 0;
let lastPlayerX = world.player.x;
let lastPlayerY = world.player.y;

try {
  world.best = Number(localStorage.getItem('nightshade-vault.best') ?? 0) || 0;
} catch {
  world.best = 0;
}

function saveBest() {
  try {
    localStorage.setItem('nightshade-vault.best', String(world.best));
  } catch {
    // Private mode or no storage: the score still shows this session.
  }
}

function announce(text) {
  if (text === lastStatusText) return;
  lastStatusText = text;
  statusLine.textContent = text;
}

function startRun() {
  world.reset();
  world.loadLevel(0);
  screen = STATUS_PLAY;
  paused = false;
}

function playEvents() {
  for (const event of world.events) {
    if (event.type === 'gem') sounds.gem();
    else if (event.type === 'pebble') sounds.pebble();
    else if (event.type === 'alarm') sounds.alarm();
    else if (event.type === 'exitOpen') sounds.exitOpen();
    else if (event.type === 'levelClear') sounds.levelClear();
    else if (event.type === 'caught') sounds.caught();
    else if (event.type === 'guardStep') {
      const dx = event.x - world.player.x;
      const dy = event.y - world.player.y;
      sounds.guardStep(Math.hypot(dx, dy), Math.max(-1, Math.min(1, dx / 320)));
    }
  }
  world.events.length = 0;
}

function trackPlayerSteps() {
  if (!world.player.moving) return;
  const moved = Math.hypot(world.player.x - lastPlayerX, world.player.y - lastPlayerY);
  playerStepDebt += moved;
  if (playerStepDebt >= 26) {
    playerStepDebt = 0;
    sounds.playerStep(world.player.sneaking);
  }
  lastPlayerX = world.player.x;
  lastPlayerY = world.player.y;
}

function advance() {
  if (screen === STATUS_LEVEL_CLEAR) {
    world.nextLevel();
    screen = STATUS_PLAY;
  } else if (screen === STATUS_CAUGHT) {
    world.resumeAfterCaught();
    screen = STATUS_PLAY;
  } else if (screen === STATUS_TITLE || screen === STATUS_WIN || screen === STATUS_GAME_OVER) {
    startRun();
  }
}

input.onKey = (key) => {
  sounds.ensure();
  if (key === 'm') {
    const muted = sounds.toggleMute();
    world.showMessage(muted ? 'Sound off' : 'Sound on');
    return;
  }
  if (key === 'r') {
    startRun();
    return;
  }
  if (key === 'p' && screen === STATUS_PLAY) {
    paused = !paused;
    return;
  }
  if (key === 'enter' || key === ' ') {
    if (screen !== STATUS_PLAY) advance();
  }
};

input.onClick = (px, py) => {
  sounds.ensure();
  if (screen !== STATUS_PLAY || paused) {
    if (screen !== STATUS_PLAY) advance();
    return;
  }
  const field = renderer.toField(px, py);
  world.throwPebble(field.x, field.y);
};

window.addEventListener('resize', () => renderer.resize());

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000 || 0);
  lastTime = now;
  if (!paused && screen === STATUS_PLAY) {
    stepAccumulator += dt;
    while (stepAccumulator >= STEP) {
      const move = input.moveVector();
      world.step(STEP, { mx: move.mx, my: move.my, sneak: input.sneak });
      stepAccumulator -= STEP;
      if (world.status !== STATUS_PLAY) {
        screen = world.status;
        break;
      }
    }
    trackPlayerSteps();
    playEvents();
    if (world.status === STATUS_WIN || world.status === STATUS_GAME_OVER) saveBest();
  }
  if (screen === STATUS_PLAY && world.status !== STATUS_PLAY) screen = world.status;
  const label =
    screen === STATUS_PLAY
      ? `Playing ${world.level.name}. ${world.gems.length - world.gemsLeft()} of ${world.gems.length} emeralds, ${world.lives} lives, score ${world.score}.`
      : screen === STATUS_TITLE
        ? 'Nightshade Vault. Press Enter to begin.'
        : screen === STATUS_LEVEL_CLEAR
          ? `${world.level.name} cleared. Press Enter for the next hall.`
          : screen === STATUS_CAUGHT
            ? 'Caught! Press Enter to slip back in.'
            : screen === STATUS_WIN
              ? `You cleared every hall. Final score ${world.score}.`
              : screen === STATUS_GAME_OVER
                ? `Game over. Final score ${world.score}. Press R to try again.`
                : 'Paused.';
  announce(label);
  renderer.draw(world, paused ? 'paused' : screen, input.mouse, now);
  requestAnimationFrame(frame);
}

// A staged screenshot: one deterministic frame, no loop.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  renderer.draw(world, screen, null, 1000);
  window.__shotReady = true;
} else {
  requestAnimationFrame((now) => {
    lastTime = now;
    requestAnimationFrame(frame);
  });
}
