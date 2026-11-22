// The bank floor plan: three rooms (lobby, gallery hall, vault) over a street
// strip, with the walls, doors, vent, side corridor, cover furniture, shadow
// zones, loot spots, guard patrols and camera mounts as data. Everything here
// is a rectangle or a point, so collision, vision and rendering all read the
// same tables and can never disagree about where a wall is.

import { FIELD, HUD_HEIGHT, STREET_Y } from './config.js';

const WALL = 12;

/** Solid rectangles. The vault door rect is added while the door is shut. */
export function buildWallRects(vaultDoorShut) {
  const rects = [
    // Outer shell of the bank.
    { x: 0, y: HUD_HEIGHT, w: FIELD.width, h: WALL },
    { x: 0, y: STREET_Y - WALL, w: 180, h: WALL },
    { x: 260, y: STREET_Y - WALL, w: FIELD.width - 260, h: WALL },
    { x: 0, y: HUD_HEIGHT, w: WALL, h: STREET_Y - HUD_HEIGHT },
    { x: FIELD.width - WALL, y: HUD_HEIGHT, w: WALL, h: STREET_Y - HUD_HEIGHT },
    // Street bounds.
    { x: 0, y: STREET_Y, w: WALL, h: FIELD.height - STREET_Y },
    { x: FIELD.width - WALL, y: STREET_Y, w: WALL, h: FIELD.height - STREET_Y },
    { x: 0, y: FIELD.height - WALL, w: FIELD.width, h: WALL },
    // Interior wall A (lobby | gallery): door gap y340-420, vent gap y100-150.
    { x: 400, y: HUD_HEIGHT, w: WALL, h: 36 },
    { x: 400, y: 150, w: WALL, h: 190 },
    { x: 400, y: 420, w: WALL, h: STREET_Y - WALL - 420 },
    // Interior wall B (gallery | vault): vault door gap y340-420, side corridor y560-620.
    { x: 868, y: HUD_HEIGHT, w: WALL, h: 276 },
    { x: 868, y: 420, w: WALL, h: 140 },
    { x: 868, y: 620, w: WALL, h: STREET_Y - WALL - 620 },
  ];
  if (vaultDoorShut) rects.push({ x: 868, y: 340, w: WALL, h: 80 });
  return rects;
}

/** Furniture that blocks movement and blocks vision cones. */
export const COVER_RECTS = [
  { x: 120, y: 180, w: 120, h: 60, kind: 'desk' },
  { x: 260, y: 420, w: 120, h: 60, kind: 'desk' },
  { x: 140, y: 520, w: 100, h: 50, kind: 'desk' },
  { x: 520, y: 160, w: 140, h: 70, kind: 'case' },
  { x: 660, y: 480, w: 140, h: 70, kind: 'case' },
  { x: 640, y: 300, w: 40, h: 40, kind: 'pillar' },
  { x: 1030, y: 330, w: 90, h: 90, kind: 'pedestal' },
  { x: 1150, y: 600, w: 110, h: 55, kind: 'gold' },
];

/** Dark floor patches where the thief is harder to spot (detection x0.4). */
export const SHADOW_ZONES = [
  { x: 50, y: 300, w: 190, h: 110, label: 'SHADOW' },
  { x: 700, y: 100, w: 150, h: 80, label: 'SHADOW' },
  { x: 900, y: 560, w: 130, h: 90, label: 'SHADOW' },
];

/** The seven loot targets in three tiers, plus the risky optional Crown Jewel. */
export const LOOT_SPOTS = [
  { x: 180, y: 252, tier: 'small' },
  { x: 320, y: 395, tier: 'small' },
  { x: 190, y: 495, tier: 'small' },
  { x: 590, y: 245, tier: 'medium' },
  { x: 730, y: 465, tier: 'medium' },
  { x: 1205, y: 627, tier: 'large' },
  { x: 1075, y: 375, tier: 'jewel' },
];

/** The four guards: name, patrol loop, and how the loop is walked. */
export const GUARD_DEFS = [
  {
    name: 'MARLOW',
    waypoints: [
      { x: 70, y: 110 }, { x: 360, y: 110 }, { x: 360, y: 300 }, { x: 70, y: 300 },
    ],
    mode: 'loop',
  },
  {
    name: 'OKONKWO',
    waypoints: [
      { x: 470, y: 130 }, { x: 830, y: 130 }, { x: 830, y: 580 }, { x: 470, y: 580 },
    ],
    mode: 'loop',
  },
  {
    name: 'REYES',
    waypoints: [{ x: 540, y: 380 }, { x: 780, y: 380 }],
    mode: 'pingpong',
  },
  {
    name: 'VOLKOV',
    waypoints: [
      { x: 950, y: 140 }, { x: 1210, y: 140 }, { x: 1210, y: 580 }, { x: 950, y: 580 },
    ],
    mode: 'loop',
  },
];

/** The three sweeping cameras: wall mount, sweep centre and half-sweep in radians. */
export const CAMERA_DEFS = [
  { x: 200, y: HUD_HEIGHT + WALL, baseAngle: Math.PI / 2, sweep: 0.78, speed: 0.55, label: 'CAM 1' },
  { x: 640, y: HUD_HEIGHT + WALL, baseAngle: Math.PI / 2, sweep: 0.87, speed: 0.7, label: 'CAM 2' },
  { x: 1075, y: HUD_HEIGHT + WALL, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.85, label: 'CAM 3' },
];

/** The power box that kills the cameras for good (at a price). */
export const POWER_BOX = { x: 850, y: 300, radius: 34 };

/** Where the thief enters, and the doorway out to the getaway van. */
export const SPAWN = { x: 60, y: 640 };
export const EXIT_ZONE = { x: 180, y: STREET_Y - WALL, w: 80, h: 40 };
export const VAN = { x: 120, y: 706, w: 190, h: 72 };

/** The locked vault door between the gallery and the vault. */
export const VAULT_DOOR = { x: 868, y: 340, w: 12, h: 80 };

/** Every wall and cover rect as line segments, for the vision raycasts. */
export function wallSegments(vaultDoorShut) {
  const segments = [];
  const rects = [...buildWallRects(vaultDoorShut), ...COVER_RECTS];
  for (const r of rects) {
    segments.push({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y });
    segments.push({ x1: r.x + r.w, y1: r.y, x2: r.x + r.w, y2: r.y + r.h });
    segments.push({ x1: r.x + r.w, y1: r.y + r.h, x2: r.x, y2: r.y + r.h });
    segments.push({ x1: r.x, y1: r.y + r.h, x2: r.x, y2: r.y });
  }
  return segments;
}

/** True when the point stands in a shadow zone (detection is multiplied by 0.4). */
export function inShadow(x, y) {
  for (const zone of SHADOW_ZONES) {
    if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) return true;
  }
  return false;
}
