// The screenshot scenes behind ?shot=cover|lobby|vault|getaway (with &seed=N).
// Each one starts from a fresh world and sets a fixed, reachable game state —
// the thief, the guards, the alarm and the loot exactly where a real heist
// puts them — then the renderer paints it twice. The same seed always gives
// the same frame, because nothing here reads the wall clock.

import { SCREEN_PLAY, SCREEN_WON } from './render.js';

function setGuard(world, index, x, y, facing, state) {
  const guard = world.state.guards[index];
  guard.x = x;
  guard.y = y;
  guard.facing = facing;
  guard.state = state;
  guard.suspicion = state === 'suspicious' ? 0.5 : 0;
  guard.lastSeen = { x: world.state.player.x, y: world.state.player.y };
}

function setCamera(world, index, angle) {
  world.state.cameras[index].angle = angle;
}

function takeLoot(world, indexes) {
  for (const i of indexes) world.state.loot[i].taken = true;
  world.state.lootTaken = indexes.length;
  world.state.lootDollars = indexes.reduce((sum, i) => sum + world.state.loot[i].value, 0);
  world.state.score = world.state.lootDollars;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any other name stages the lobby.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name === 'cover') {
    // Mid-heist in the vault: two loot down, the jewel ahead, one guard
    // suspicious, the alarm warm, every system visible in one frame.
    state.elapsed = 79;
    state.timer = 221;
    state.alarm = 35;
    state.vaultDoor.locked = false;
    state.vaultDoor.open = true;
    state.tools.lockpick.left = 1;
    takeLoot(world, [0, 5]);
    state.player.x = 960;
    state.player.y = 500;
    state.player.facing = -1.2;
    state.player.mode = 'sneak';
    setGuard(world, 0, 200, 150, 1.4, 'patrol');
    setGuard(world, 1, 700, 300, Math.PI, 'patrol');
    setGuard(world, 2, 560, 380, 0, 'patrol');
    setGuard(world, 3, 1150, 250, 2.4, 'suspicious');
    setCamera(world, 0, 1.9);
    setCamera(world, 1, 1.2);
    setCamera(world, 2, 1.35);
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'vault') {
    // Tension peak: the jewel taken, the vault guard chasing, alarm red.
    state.elapsed = 175;
    state.timer = 125;
    state.alarm = 71;
    state.vaultDoor.locked = false;
    state.vaultDoor.open = true;
    state.tools.lockpick.left = 0;
    state.tools.smoke.left = 1;
    state.tools.emp.left = 0;
    state.tools.coin.left = 2;
    takeLoot(world, [0, 3, 5, 6]);
    state.player.x = 1075;
    state.player.y = 440;
    state.player.facing = -1.2;
    state.player.mode = 'run';
    setGuard(world, 0, 300, 200, 0.6, 'patrol');
    setGuard(world, 1, 640, 200, 1.57, 'investigate');
    setGuard(world, 2, 600, 560, -1.57, 'patrol');
    setGuard(world, 3, 1120, 320, 2.6, 'chase');
    setCamera(world, 0, 1.57);
    setCamera(world, 1, 1.9);
    setCamera(world, 2, 1.57);
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'getaway') {
    // The payoff: all seven loot, the van waiting, the clock still paying.
    state.elapsed = 228;
    state.timer = 72;
    state.alarm = 18;
    state.vaultDoor.locked = false;
    state.vaultDoor.open = true;
    takeLoot(world, [0, 1, 2, 3, 4, 5, 6]);
    state.timeBonus = 720;
    state.score = state.lootDollars + state.timeBonus;
    state.outcome = 'won';
    state.player.x = 220;
    state.player.y = 690;
    state.player.facing = 1.57;
    setGuard(world, 0, 120, 300, 0, 'patrol');
    setGuard(world, 1, 500, 200, 1.57, 'patrol');
    setGuard(world, 2, 700, 450, -0.6, 'patrol');
    setGuard(world, 3, 1000, 200, 1.57, 'patrol');
    setCamera(world, 0, 1.2);
    setCamera(world, 1, 1.9);
    setCamera(world, 2, 1.57);
    return { screen: SCREEN_WON, best: 1670 };
  }

  // Lobby: the opening minute, staged with fixed positions so the frame is
  // composed — the thief at the door, every guard mid-patrol, the first
  // loot ahead, the alarm at zero.
  state.player.x = 60;
  state.player.y = 640;
  state.player.facing = 0;
  setGuard(world, 0, 200, 130, 1.2, 'patrol');
  setGuard(world, 1, 640, 150, 1.57, 'patrol');
  setGuard(world, 2, 600, 380, 0, 'patrol');
  setGuard(world, 3, 1050, 200, 1.57, 'patrol');
  setCamera(world, 0, 1.9);
  setCamera(world, 1, 1.2);
  setCamera(world, 2, 1.57);
  return { screen: SCREEN_PLAY, best: 0 };
}
