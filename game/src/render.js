// Nightshade Vault — everything on screen, drawn on one canvas. The floor
// is a checker of two dark tiles so movement reads at a glance; vision cones
// are the ray-cast polygons from vision.js, so the cone on screen is exactly
// what the guard can see; guards carry a "?" when suspicious and a "!" on
// alarm, and the HUD shows loot, pebbles, lives, time and the alarm bar.

import { FIELD, PALETTE, FONT } from './config.js';
import { conePolygon } from './vision.js';
import { STATUS_CAUGHT, STATUS_GAME_OVER, STATUS_LEVEL_CLEAR, STATUS_TITLE, STATUS_WIN } from './world.js';

const TILE = 80;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.resize();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.scale = Math.min(width / FIELD.width, height / FIELD.height);
    this.offsetX = (width - FIELD.width * this.scale) / 2;
    this.offsetY = (height - FIELD.height * this.scale) / 2;
  }

  // Canvas pixels (from the mouse) back into logical field coordinates.
  toField(px, py) {
    return { x: (px - this.offsetX) / this.scale, y: (py - this.offsetY) / this.scale };
  }

  draw(world, screen, mouse, now) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
    this.drawFloor(world);
    this.drawZones(world);
    this.drawExit(world, now);
    this.drawGems(world, now);
    this.drawCrates(world);
    this.drawCones(world);
    this.drawWalls(world);
    this.drawGuards(world, now);
    this.drawPlayer(world, now);
    this.drawPebbleAim(world, mouse);
    this.drawHud(world, screen);
    if (screen !== 'play') this.drawScreen(world, screen, now);
  }

  drawFloor(world) {
    const ctx = this.ctx;
    for (let ty = 0; ty < FIELD.height / TILE; ty += 1) {
      for (let tx = 0; tx < FIELD.width / TILE; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    void world;
  }

  drawZones(world) {
    const ctx = this.ctx;
    for (const zone of world.level.dark) {
      ctx.fillStyle = PALETTE.dark;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.strokeStyle = 'rgba(120, 140, 200, 0.25)';
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(zone.x + 1, zone.y + 1, zone.w - 2, zone.h - 2);
      ctx.setLineDash([]);
    }
    for (const bush of world.level.bushes) {
      ctx.fillStyle = PALETTE.bush;
      roundRect(ctx, bush.x, bush.y, bush.w, bush.h, 14);
      ctx.fill();
      ctx.fillStyle = PALETTE.bushTop;
      for (let i = 0; i < 5; i += 1) {
        const bx = bush.x + 14 + ((i * 23) % (bush.w - 28));
        const by = bush.y + 12 + ((i * 17) % (bush.h - 24));
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawExit(world, now) {
    const ctx = this.ctx;
    const exit = world.level.exit;
    const open = world.exitArmed;
    const pulse = 0.55 + 0.35 * Math.sin(now / 280);
    ctx.fillStyle = open ? PALETTE.exit : '#274b3a';
    roundRect(ctx, exit.x, exit.y, exit.w, exit.h, 8);
    ctx.fill();
    ctx.strokeStyle = open ? `rgba(125, 240, 184, ${pulse})` : 'rgba(120, 150, 130, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = open ? '#062b18' : '#9fb8a8';
    ctx.font = `bold ${open ? 26 : 20}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : `${world.gemsLeft()}◆`, exit.x + exit.w / 2, exit.y + exit.h / 2 + 1);
  }

  drawGems(world, now) {
    const ctx = this.ctx;
    for (const gem of world.gems) {
      if (gem.taken) continue;
      const bob = Math.sin(now / 300 + gem.x) * 3;
      const y = gem.y + bob;
      ctx.save();
      ctx.translate(gem.x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.gem;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-9, -9, 18, 6);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255, 217, 77, 0.35)';
      ctx.beginPath();
      ctx.arc(gem.x, y, 16 + Math.sin(now / 300) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawCrates(world) {
    const ctx = this.ctx;
    for (const crate of world.level.crates) {
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(crate.x, crate.y, crate.w, crate.h);
      ctx.fillStyle = PALETTE.crateTop;
      ctx.fillRect(crate.x, crate.y, crate.w, 8);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(crate.x + 0.5, crate.y + 0.5, crate.w - 1, crate.h - 1);
      ctx.beginPath();
      ctx.moveTo(crate.x, crate.y);
      ctx.lineTo(crate.x + crate.w, crate.y + crate.h);
      ctx.moveTo(crate.x + crate.w, crate.y);
      ctx.lineTo(crate.x, crate.y + crate.h);
      ctx.stroke();
    }
  }

  drawWalls(world) {
    const ctx = this.ctx;
    for (const solid of world.solids) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(solid.x, solid.y, solid.w, Math.min(6, solid.h));
    }
  }

  drawCones(world) {
    const ctx = this.ctx;
    for (const guard of world.guards) {
      const points = conePolygon(guard, world.solids, FIELD);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fillStyle =
        guard.state === 'chase' ? PALETTE.coneAlert : guard.state === 'suspicious' ? PALETTE.coneSuspicious : PALETTE.cone;
      ctx.fill();
    }
  }

  drawGuards(world, now) {
    const ctx = this.ctx;
    for (const guard of world.guards) {
      // Body: a red tabard with a dark rim, facing its patrol direction.
      ctx.fillStyle = PALETTE.guardBody;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b0d10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.angle) * 15, guard.y + Math.sin(guard.angle) * 15);
      ctx.stroke();
      ctx.lineWidth = 1;
      // The detection meter as a ring that fills around the guard.
      if (guard.meter > 0.02) {
        ctx.strokeStyle = guard.meter >= 1 ? PALETTE.danger : PALETTE.warn;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + guard.meter * Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      // "?" while suspicious, "!" on alarm — the near miss you can read.
      if (guard.state === 'suspicious' || guard.state === 'chase') {
        const bob = Math.sin(now / 160) * 2;
        ctx.fillStyle = guard.state === 'chase' ? PALETTE.danger : PALETTE.warn;
        ctx.font = `bold 24px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 30 + bob);
      }
    }
  }

  drawPlayer(world, now) {
    const ctx = this.ctx;
    const player = world.player;
    // Running is loud: a faint ring shows the noise a guard can hear.
    if (player.moving && !player.sneaking) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 95, 0, Math.PI * 2);
      ctx.stroke();
    }
    const bob = player.moving ? Math.sin(now / 90) * 1.5 : 0;
    ctx.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob * 0.3, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a08';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    // A little hood point that shows which way you face — toward the mouse.
    ctx.fillStyle = '#3a2a08';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 5, 0, Math.PI * 2);
    ctx.fill();
    if (world.playerHidden()) {
      ctx.fillStyle = 'rgba(44, 107, 63, 0.9)';
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', player.x, player.y - 24);
    }
  }

  drawPebbleAim(world, mouse) {
    if (world.status !== 'play' || world.pebbles <= 0 || !mouse) return;
    const field = this.toField(mouse.x, mouse.y);
    const dist = Math.hypot(field.x - world.player.x, field.y - world.player.y);
    if (dist > 420) return;
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(238, 241, 245, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(field.x, field.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawHud(world, screen) {
    const ctx = this.ctx;
    const level = world.level;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 12, 12, FIELD.width - 24, 44, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Nightshade Vault — ${level.name}`, 26, 34);
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`◆ ${world.gems.length - world.gemsLeft()}/${world.gems.length}`, 590, 34);
    ctx.fillText(`● pebbles ${world.pebbles}`, 660, 34);
    ctx.fillText(`${'♥'.repeat(Math.max(0, world.lives))}${'♡'.repeat(Math.max(0, 3 - world.lives))}`, 790, 34);
    ctx.fillText(`⏱ ${Math.floor(world.time)}s`, 890, 34);
    ctx.fillText(`Score ${world.score}`, 970, 34);

    // The alarm bar: the highest detection meter, only while someone sees you.
    const meter = world.maxMeter();
    if (meter > 0.02 && screen === 'play') {
      const w = 260;
      const x = FIELD.width / 2 - w / 2;
      ctx.fillStyle = PALETTE.panel;
      roundRect(ctx, x - 8, 66, w + 16, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#3a2020';
      roundRect(ctx, x, 74, w, 14, 7);
      ctx.fill();
      ctx.fillStyle = meter >= 1 ? PALETTE.danger : meter >= 0.35 ? PALETTE.warn : PALETTE.gem;
      roundRect(ctx, x, 74, w * meter, 14, 7);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(meter >= 1 ? 'ALARM!' : meter >= 0.35 ? 'SUSPICIOUS…' : 'SEEN — break line of sight', FIELD.width / 2, 81);
    }

    // A transient banner for level messages (exit open, spotted).
    if (world.messageTimer > 0 && screen === 'play') {
      ctx.fillStyle = PALETTE.panel;
      const text = world.message;
      ctx.font = `bold 16px ${FONT}`;
      const tw = ctx.measureText(text).width;
      roundRect(ctx, FIELD.width / 2 - tw / 2 - 14, FIELD.height - 52, tw + 28, 34, 8);
      ctx.fill();
      ctx.fillStyle = world.message.startsWith('SPOTTED') ? PALETTE.danger : PALETTE.text;
      ctx.textAlign = 'center';
      ctx.fillText(text, FIELD.width / 2, FIELD.height - 34);
    }

    // Controls reminder, bottom-left.
    ctx.fillStyle = 'rgba(238, 241, 245, 0.8)';
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('WASD / arrows move · Shift sneak · Click throws a pebble · M mute · R restart · P pause', 16, FIELD.height - 16);
  }

  panelBox(w, h) {
    const ctx = this.ctx;
    const x = FIELD.width / 2 - w / 2;
    const y = FIELD.height / 2 - h / 2;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(238, 241, 245, 0.18)';
    ctx.stroke();
    return { x, y, w, h };
  }

  drawScreen(world, screen, now) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (screen === 'title') {
      const box = this.panelBox(680, 380);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 44px ${FONT}`;
      ctx.fillText('NIGHTSHADE VAULT', FIELD.width / 2, box.y + 62);
      ctx.fillStyle = PALETTE.gem;
      ctx.font = `18px ${FONT}`;
      ctx.fillText('A quiet thief. Three guarded halls. One green door.', FIELD.width / 2, box.y + 108);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `16px ${FONT}`;
      ctx.fillText('Take every emerald, then reach the exit unseen.', FIELD.width / 2, box.y + 142);
      ctx.fillText('Guards patrol with vision cones — walls and crates block their sight.', FIELD.width / 2, box.y + 168);
      ctx.fillText('Bushes and dark floor hide you. Sneak to stay silent.', FIELD.width / 2, box.y + 194);
      ctx.fillText('Running is loud. A thrown pebble pulls a guard to where it lands.', FIELD.width / 2, box.y + 220);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 17px ${FONT}`;
      ctx.fillText('WASD / arrows — move      Shift — sneak      Click — throw pebble', FIELD.width / 2, box.y + 264);
      ctx.fillStyle = PALETTE.exit;
      ctx.font = `bold 19px ${FONT}`;
      ctx.fillText('Press ENTER or click to begin', FIELD.width / 2, box.y + 312);
      void now;
      return;
    }
    if (screen === 'levelClear') {
      const box = this.panelBox(560, 260);
      ctx.fillStyle = PALETTE.exit;
      ctx.font = `bold 34px ${FONT}`;
      ctx.fillText(`${world.level.name} — cleared!`, FIELD.width / 2, box.y + 60);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `17px ${FONT}`;
      ctx.fillText(`Score ${world.score}   ·   Lives ${world.lives}`, FIELD.width / 2, box.y + 112);
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Press ENTER for the next hall', FIELD.width / 2, box.y + 160);
      return;
    }
    if (screen === 'caught') {
      const box = this.panelBox(560, 260);
      ctx.fillStyle = PALETTE.danger;
      ctx.font = `bold 34px ${FONT}`;
      ctx.fillText('CAUGHT!', FIELD.width / 2, box.y + 60);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `17px ${FONT}`;
      ctx.fillText(`Lives left: ${world.lives} — your gems stay taken.`, FIELD.width / 2, box.y + 112);
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Press ENTER to slip back in', FIELD.width / 2, box.y + 160);
      return;
    }
    if (screen === 'gameOver') {
      const box = this.panelBox(560, 280);
      ctx.fillStyle = PALETTE.danger;
      ctx.font = `bold 36px ${FONT}`;
      ctx.fillText('THE VAULT KEEPS YOU', FIELD.width / 2, box.y + 60);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `17px ${FONT}`;
      ctx.fillText(`Final score ${world.score}   ·   Best ${Math.max(world.best, world.score)}`, FIELD.width / 2, box.y + 112);
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Press R to try the whole night again', FIELD.width / 2, box.y + 160);
      return;
    }
    if (screen === 'win') {
      const box = this.panelBox(620, 300);
      ctx.fillStyle = PALETTE.exit;
      ctx.font = `bold 36px ${FONT}`;
      ctx.fillText('GHOST OF THE VAULT', FIELD.width / 2, box.y + 60);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `17px ${FONT}`;
      ctx.fillText('Every hall cleared. Every emerald yours.', FIELD.width / 2, box.y + 112);
      ctx.fillStyle = PALETTE.gem;
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillText(`Final score ${world.score}`, FIELD.width / 2, box.y + 156);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `16px ${FONT}`;
      ctx.fillText('Press R to run it again — faster, quieter', FIELD.width / 2, box.y + 204);
      return;
    }
    if (screen === 'paused') {
      const box = this.panelBox(420, 180);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 30px ${FONT}`;
      ctx.fillText('PAUSED', FIELD.width / 2, box.y + 62);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `16px ${FONT}`;
      ctx.fillText('Press P to keep sneaking', FIELD.width / 2, box.y + 108);
    }
  }
}
