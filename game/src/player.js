// The thief: walk / sneak / run movement with wall collision, click-to-move,
// and the noise radius the guards hear. Movement is axis-separated: the thief
// slides along a wall instead of sticking to it.

import { FIELD, PLAYER, STREET_Y, HUD_HEIGHT } from './config.js';
import { COVER_RECTS, buildWallRects } from './level.js';

function collideCircle(x, y, radius, rects) {
  for (const r of rects) {
    const nearestX = Math.max(r.x, Math.min(x, r.x + r.w));
    const nearestY = Math.max(r.y, Math.min(y, r.y + r.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) {
        // Dead centre of a rect (should not happen): push up.
        y = r.y - radius;
      } else {
        const d = Math.sqrt(d2);
        x = nearestX + (dx / d) * radius;
        y = nearestY + (dy / d) * radius;
      }
    }
  }
  return { x, y };
}

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    radius: PLAYER.radius,
    /** Facing direction in radians; drives the drawn figure and the coin toss. */
    facing: 0,
    /** 'walk' | 'sneak' | 'run' — set every step from the input. */
    mode: 'walk',
    moving: false,
    /** Click-to-move target, or null. */
    target: null,
    /** Noise radius the guards hear this step. */
    noise: 0,
  };
}

/**
 * Move the thief one fixed step. `input` carries the held direction (-1..1 on
 * each axis), whether sneak/run are held, and an optional click target. Returns
 * the list of solid rects the move was tested against (walls + cover).
 */
export function movePlayer(player, input, dt, vaultDoorShut) {
  const rects = [...buildWallRects(vaultDoorShut), ...COVER_RECTS];
  let dx = input.x;
  let dy = input.y;
  if (dx === 0 && dy === 0 && player.target) {
    const tx = player.target.x - player.x;
    const ty = player.target.y - player.y;
    const distance = Math.hypot(tx, ty);
    if (distance < 6) {
      player.target = null;
    } else {
      dx = tx / distance;
      dy = ty / distance;
    }
  }
  const length = Math.hypot(dx, dy);
  player.moving = length > 0;
  if (player.moving) {
    dx /= length;
    dy /= length;
    player.facing = Math.atan2(dy, dx);
  }
  player.mode = input.sneak ? 'sneak' : input.run ? 'run' : 'walk';
  const speed =
    player.mode === 'sneak' ? PLAYER.sneakSpeed : player.mode === 'run' ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const next = collideCircle(
    player.x + dx * speed * dt,
    player.y + dy * speed * dt,
    player.radius,
    rects,
  );
  player.x = Math.max(player.radius, Math.min(FIELD.width - player.radius, next.x));
  player.y = Math.max(HUD_HEIGHT + player.radius, Math.min(FIELD.height - player.radius, next.y));
  // The bank's south wall rects already block every crossing except the exit
  // gap, and the street bounds stop the thief at the kerb.
  player.noise = !player.moving ? 0 : player.mode === 'sneak' ? 0 : player.mode === 'run' ? PLAYER.runNoise : PLAYER.walkNoise;
  return rects;
}
