// The seven loot targets in three tiers: three desk cash, two display cases,
// one vault gold, and the risky optional Crown Jewel under the vault camera.
// Pickup is by proximity; the jewel only pays when the thief is already
// inside the vault, which is the decision the heist turns on.

import { LOOT_TIERS } from './config.js';
import { LOOT_SPOTS } from './level.js';

export function createLoot() {
  return LOOT_SPOTS.map((spot) => ({
    x: spot.x,
    y: spot.y,
    tier: spot.tier,
    value: LOOT_TIERS[spot.tier].value,
    radius: LOOT_TIERS[spot.tier].radius,
    label: LOOT_TIERS[spot.tier].label,
    taken: false,
  }));
}

/**
 * Collect every loot item the thief stands on. The thief's reach extends
 * 30 px past the item's ring, so the Crown Jewel on its pedestal and the
 * gold on its stack can be taken from the edge, as a real thief would.
 * Returns the list of items taken this step, so the caller can score them
 * and play the pickup sound.
 */
export function collectLoot(loot, player) {
  const taken = [];
  for (const item of loot) {
    if (item.taken) continue;
    const dx = item.x - player.x;
    const dy = item.y - player.y;
    if (Math.hypot(dx, dy) <= item.radius + player.radius + 30) {
      item.taken = true;
      taken.push(item);
    }
  }
  return taken;
}

export function lootCount(loot) {
  return loot.reduce((n, item) => n + (item.taken ? 1 : 0), 0);
}

export function lootValue(loot) {
  return loot.reduce((sum, item) => sum + (item.taken ? item.value : 0), 0);
}
