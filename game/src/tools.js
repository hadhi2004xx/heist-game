// The four tools, each with limited charges — scarcity is the cost.
// Lockpick opens the vault door, smoke blinds every eye for 4 seconds, EMP
// darkens the cameras for 10, and a tossed coin lures a guard to a spot.
// Every tool is a real HUD button and a hotkey; a spent tool stays visible
// and greyed, never a dead control.

import { ALARM, COIN_THROW, SMOKE_SECONDS, TOOLS } from './config.js';
import { POWER_BOX, VAULT_DOOR } from './level.js';
import { cutPower, empPulse } from './cameras.js';

export function createTools() {
  const tools = {};
  for (const [key, def] of Object.entries(TOOLS)) {
    tools[key] = { ...def, left: def.charges };
  }
  return tools;
}

/** Distance from the thief to the vault door's centre. */
function doorDistance(player) {
  const cx = VAULT_DOOR.x + VAULT_DOOR.w / 2;
  const cy = VAULT_DOOR.y + VAULT_DOOR.h / 2;
  return Math.hypot(cx - player.x, cy - player.y);
}

/** The thief is close enough to work the vault door. */
export function nearVaultDoor(player) {
  return doorDistance(player) < 70;
}

/** The thief is close enough to cut the power box on the gallery wall. */
export function nearPowerBox(player) {
  return Math.hypot(POWER_BOX.x - player.x, POWER_BOX.y - player.y) < POWER_BOX.radius + player.radius;
}

/**
 * Spend one charge of `name` and apply its effect. Returns a short event tag
 * ('used', 'empty', 'locked', 'sealed', 'far') so the caller can announce it.
 * `world` is the live game state; tools never touch the DOM.
 */
export function useTool(name, world) {
  const tool = world.tools[name];
  if (!tool || tool.left <= 0) return 'empty';
  const { player } = world;

  if (name === 'lockpick') {
    if (!world.vaultDoor.locked) return 'open';
    if (world.lockdown) return 'sealed';
    if (!nearVaultDoor(player)) return 'far';
    tool.left -= 1;
    world.vaultDoor.locked = false;
    world.vaultDoor.open = true;
    return 'used';
  }
  if (name === 'smoke') {
    tool.left -= 1;
    world.smokeUntil = world.elapsed + SMOKE_SECONDS;
    return 'used';
  }
  if (name === 'emp') {
    tool.left -= 1;
    empPulse(world.cameras);
    return 'used';
  }
  if (name === 'coin') {
    tool.left -= 1;
    const angle = player.mouseAngle ?? player.facing;
    const x = player.x + Math.cos(angle) * COIN_THROW;
    const y = player.y + Math.sin(angle) * COIN_THROW;
    world.coins.push({ x, y, t: 0.6, landed: false });
    return 'used';
  }
  return 'empty';
}

/**
 * Cut the power box (key E near it): every camera dies for the rest of the
 * heist, the alarm jumps, and the nearest guard comes to look. Returns true
 * when the cut happened.
 */
export function cutPowerBox(world) {
  if (world.powerCut || !nearPowerBox(world.player)) return false;
  world.powerCut = true;
  cutPower(world.cameras);
  world.alarm = Math.min(ALARM.max, world.alarm + ALARM.powerCutCost);
  world.noiseEvents.push({ x: POWER_BOX.x, y: POWER_BOX.y, radius: 300 });
  return true;
}
