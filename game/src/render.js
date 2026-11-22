// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x800 playfield is scaled to fit the window and centred. Flat geometry,
// hairline borders, tabular numerals — Diegetic Tactile HUD: obsidian floor,
// warm paper text, one amber accent. A cone is drawn exactly as it is tested.

import {
  ALARM, FIELD, FONT, HUD_HEIGHT, PALETTE, STREET_Y,
} from './config.js';
import {
  COVER_RECTS, EXIT_ZONE, POWER_BOX, SHADOW_ZONES, VAN, VAULT_DOOR, inShadow,
} from './level.js';
import { GUARD } from './config.js';
import { CAMERA } from './config.js';
import { conePolygon } from './vision.js';
import { alarmColour } from './alarm.js';
import { GUARD_CHASE, GUARD_INVESTIGATE, GUARD_SUSPICIOUS } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_CAUGHT = 'caught';

const TOOL_CHIPS = [
  { name: 'lockpick', x: 16, y: 34, w: 168, h: 24 },
  { name: 'smoke', x: 192, y: 34, w: 168, h: 24 },
  { name: 'emp', x: 368, y: 34, w: 168, h: 24 },
  { name: 'coin', x: 544, y: 34, w: 168, h: 24 },
];

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', weight = 600) {
    const key = `${weight}-${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function rect(x, y, w, h, color) {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  }

  function strokeRect(x, y, w, h, color, width = 1) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.strokeRect(x + width / 2, y + width / 2, w - width, h - width);
  }

  function circle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  function drawFloor(state) {
    // Three rooms, three floor materials, one hairline grid each.
    rect(12, HUD_HEIGHT + 12, 388, STREET_Y - HUD_HEIGHT - 24, PALETTE.lobbyFloor);
    rect(412, HUD_HEIGHT + 12, 456, STREET_Y - HUD_HEIGHT - 24, PALETTE.galleryFloor);
    rect(880, HUD_HEIGHT + 12, 388, STREET_Y - HUD_HEIGHT - 24, PALETTE.vaultFloor);
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 40; x < 1268; x += 56) {
      context.moveTo(x, HUD_HEIGHT + 12);
      context.lineTo(x, STREET_Y - 12);
    }
    for (let y = HUD_HEIGHT + 40; y < STREET_Y - 12; y += 56) {
      context.moveTo(12, y);
      context.lineTo(1268, y);
    }
    context.stroke();
    // Room labels, big enough to read at contact-sheet scale, along the
    // floor so they never meet a guard's name tag.
    text('LOBBY', 30, STREET_Y - 24, 20, PALETTE.muted, 'left', 700);
    text('GALLERY HALL', 430, STREET_Y - 24, 20, PALETTE.muted, 'left', 700);
    text('VAULT', 898, STREET_Y - 24, 20, PALETTE.muted, 'left', 700);
    // Dust motes, placed once from the seed.
    context.fillStyle = 'rgba(250,248,245,0.10)';
    for (const mote of state.dust) {
      context.fillRect(mote.x, mote.y, mote.r, mote.r);
    }
  }

  function drawWalls(wallRects) {
    for (const r of wallRects) {
      rect(r.x, r.y, r.w, r.h, PALETTE.wall);
      context.fillStyle = PALETTE.wallEdge;
      context.fillRect(r.x, r.y, r.w, 1);
    }
  }

  function drawShadowZones() {
    for (const zone of SHADOW_ZONES) {
      context.fillStyle = 'rgba(5,6,10,0.55)';
      context.fillRect(zone.x, zone.y, zone.w, zone.h);
      context.setLineDash([6, 5]);
      strokeRect(zone.x, zone.y, zone.w, zone.h, 'rgba(154,163,175,0.5)', 1);
      context.setLineDash([]);
      text(zone.label, zone.x + 8, zone.y + zone.h - 8, 13, PALETTE.muted, 'left', 700);
    }
  }

  function drawStreet(state) {
    rect(0, STREET_Y, FIELD.width, FIELD.height - STREET_Y, PALETTE.street);
    context.setLineDash([18, 14]);
    context.strokeStyle = '#3A3F4C';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 748);
    context.lineTo(FIELD.width, 748);
    context.stroke();
    context.setLineDash([]);
    // The getaway van, green and marked.
    rect(VAN.x, VAN.y, VAN.w, VAN.h, '#0E3B2E');
    strokeRect(VAN.x, VAN.y, VAN.w, VAN.h, PALETTE.green, 2);
    rect(VAN.x + 12, VAN.y + 10, 60, 26, '#123F33');
    rect(VAN.x + 84, VAN.y + 10, 40, 26, '#123F33');
    circle(VAN.x + 42, VAN.y + VAN.h, 12, '#111318');
    circle(VAN.x + 148, VAN.y + VAN.h, 12, '#111318');
    text('GETAWAY VAN', VAN.x + VAN.w / 2, VAN.y + 58, 16, PALETTE.green, 'center', 700);
    // The exit door in the bank's south wall.
    rect(EXIT_ZONE.x - 4, STREET_Y - 14, EXIT_ZONE.w + 8, 14, PALETTE.green);
    text('EXIT', EXIT_ZONE.x + EXIT_ZONE.w / 2, STREET_Y - 18, 16, PALETTE.green, 'center', 700);
    if (state.vaultDoor.open) {
      text('VAULT OPEN', 1075, STREET_Y - 18, 15, PALETTE.green, 'center', 700);
    }
  }

  function drawCover(state) {
    for (const r of COVER_RECTS) {
      if (r.kind === 'desk') {
        rect(r.x, r.y, r.w, r.h, '#2E2620');
        strokeRect(r.x, r.y, r.w, r.h, '#5A4A36', 1);
        rect(r.x + 8, r.y + 8, r.w - 16, 10, '#3A2F22');
      } else if (r.kind === 'case') {
        rect(r.x, r.y, r.w, r.h, '#1C2733');
        strokeRect(r.x, r.y, r.w, r.h, '#4A6A8A', 2);
        context.fillStyle = 'rgba(120,180,220,0.18)';
        context.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      } else if (r.kind === 'pillar') {
        rect(r.x, r.y, r.w, r.h, '#333845');
        strokeRect(r.x, r.y, r.w, r.h, PALETTE.wallEdge, 1);
      } else if (r.kind === 'pedestal') {
        rect(r.x, r.y, r.w, r.h, '#23262E');
        strokeRect(r.x, r.y, r.w, r.h, '#6A7280', 2);
        rect(r.x + 10, r.y + 10, r.w - 20, r.h - 20, '#2C303A');
      } else if (r.kind === 'gold') {
        for (let i = 0; i < 3; i += 1) {
          rect(r.x + 6 + i * 34, r.y + 8, 30, 18, PALETTE.amber);
          rect(r.x + 22 + i * 34, r.y + 30, 30, 18, PALETTE.amberDim);
        }
        strokeRect(r.x, r.y, r.w, r.h, PALETTE.amberDim, 1);
      }
    }
    // The power box on the gallery wall.
    rect(POWER_BOX.x - 10, POWER_BOX.y - 14, 20, 28, '#23262E');
    strokeRect(POWER_BOX.x - 10, POWER_BOX.y - 14, 20, 28, PALETTE.amber, 1);
    text('POWER', POWER_BOX.x, POWER_BOX.y + 34, 12, PALETTE.amber, 'center', 700);
    // The vault door itself, drawn in the wall gap.
    if (!state.vaultDoor.open) {
      rect(VAULT_DOOR.x, VAULT_DOOR.y, VAULT_DOOR.w, VAULT_DOOR.h, '#3A3F4C');
      circle(VAULT_DOOR.x + 6, VAULT_DOOR.y + 40, 4, PALETTE.amber);
      text('LOCKED', VAULT_DOOR.x + 30, VAULT_DOOR.y + 46, 14, PALETTE.amber, 'left', 700);
    } else {
      text('OPEN', VAULT_DOOR.x + 30, VAULT_DOOR.y + 46, 14, PALETTE.green, 'left', 700);
    }
  }

  function drawLoot(state) {
    for (const item of state.loot) {
      if (item.taken) continue;
      const bob = Math.sin(state.elapsed * 2.4 + item.x) * 2;
      const y = item.y + bob;
      const isJewel = item.tier === 'jewel';
      const size = isJewel ? 15 : 10;
      context.save();
      context.translate(item.x, y);
      context.rotate(Math.PI / 4);
      context.fillStyle = isJewel ? PALETTE.red : PALETTE.amber;
      context.fillRect(-size / 2, -size / 2, size, size);
      context.strokeStyle = PALETTE.text;
      context.lineWidth = 1.5;
      context.strokeRect(-size / 2, -size / 2, size, size);
      context.restore();
      text(`$${item.value}`, item.x, y - size - 6, 16, isJewel ? PALETTE.red : PALETTE.amber, 'center', 700);
      if (isJewel) text('CROWN JEWEL', item.x, y + size + 20, 13, PALETTE.red, 'center', 700);
    }
  }

  function drawCones(state, segments) {
    const smoke = state.elapsed < state.smokeUntil;
    for (const guard of state.guards) {
      const polygon = conePolygon(
        guard.x, guard.y, guard.facing, GUARD.coneHalfAngle, GUARD.coneRange, segments,
      );
      context.beginPath();
      context.moveTo(polygon[0].x, polygon[0].y);
      for (let i = 1; i < polygon.length; i += 1) context.lineTo(polygon[i].x, polygon[i].y);
      context.closePath();
      if (smoke) {
        context.fillStyle = 'rgba(138,143,153,0.10)';
        context.strokeStyle = 'rgba(138,143,153,0.35)';
      } else if (guard.state === GUARD_CHASE) {
        context.fillStyle = 'rgba(229,72,77,0.30)';
        context.strokeStyle = 'rgba(229,72,77,0.75)';
      } else if (guard.state === GUARD_SUSPICIOUS || guard.state === GUARD_INVESTIGATE) {
        context.fillStyle = 'rgba(255,176,0,0.22)';
        context.strokeStyle = 'rgba(255,176,0,0.65)';
      } else {
        context.fillStyle = 'rgba(229,72,77,0.16)';
        context.strokeStyle = 'rgba(229,72,77,0.45)';
      }
      context.fill();
      context.lineWidth = 1.5;
      context.stroke();
    }
    for (const camera of state.cameras) {
      if (camera.dead) continue;
      const dark = camera.empLeft > 0 || smoke;
      const polygon = conePolygon(
        camera.x, camera.y, camera.angle, CAMERA.coneHalfAngle, CAMERA.range, segments,
      );
      context.beginPath();
      context.moveTo(polygon[0].x, polygon[0].y);
      for (let i = 1; i < polygon.length; i += 1) context.lineTo(polygon[i].x, polygon[i].y);
      context.closePath();
      context.fillStyle = dark ? 'rgba(138,143,153,0.06)' : 'rgba(255,176,0,0.13)';
      context.strokeStyle = dark ? 'rgba(138,143,153,0.25)' : 'rgba(255,176,0,0.55)';
      context.fill();
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  function drawCameras(state) {
    for (const camera of state.cameras) {
      const dark = camera.dead || camera.empLeft > 0;
      rect(camera.x - 9, camera.y - 6, 18, 12, dark ? '#2A2E38' : '#3A3F4C');
      strokeRect(camera.x - 9, camera.y - 6, 18, 12, dark ? PALETTE.muted : PALETTE.camera, 1);
      circle(camera.x, camera.y, 3, dark ? PALETTE.muted : PALETTE.camera);
      text(
        camera.label + (camera.dead ? ' OFF' : camera.empLeft > 0 ? ` ${Math.ceil(camera.empLeft)}s` : ''),
        camera.x + 16, camera.y + 4, 12, dark ? PALETTE.muted : PALETTE.camera, 'left', 700,
      );
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      // Facing wedge, then the body.
      context.fillStyle = PALETTE.guardDark;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.arc(guard.x, guard.y, GUARD.radius + 7, guard.facing - 0.5, guard.facing + 0.5);
      context.closePath();
      context.fill();
      circle(guard.x, guard.y, GUARD.radius, PALETTE.guard);
      context.strokeStyle = '#D5DAE3';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      context.stroke();
      circle(guard.x + Math.cos(guard.facing) * 7, guard.y + Math.sin(guard.facing) * 7, 3, '#111318');
      text(guard.name, guard.x, guard.y - GUARD.radius - 8, 12, PALETTE.muted, 'center', 700);
      if (guard.state === GUARD_SUSPICIOUS) {
        text('?', guard.x, guard.y - GUARD.radius - 24, 24, PALETTE.amber, 'center', 800);
      } else if (guard.state === GUARD_INVESTIGATE) {
        text('?', guard.x, guard.y - GUARD.radius - 24, 24, PALETTE.amber, 'center', 800);
        text('CHECKING', guard.x, guard.y + GUARD.radius + 20, 11, PALETTE.amber, 'center', 700);
      } else if (guard.state === GUARD_CHASE) {
        text('!', guard.x, guard.y - GUARD.radius - 24, 26, PALETTE.red, 'center', 800);
      }
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    const inShadowNow = inShadow(player.x, player.y);
    // Tossed coins and their hearing rings.
    for (const coin of state.coins) {
      circle(coin.x, coin.y, 6, PALETTE.amber);
      context.strokeStyle = PALETTE.amber;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(coin.x, coin.y, 8 + (coin.ring ?? 0), 0, Math.PI * 2);
      context.stroke();
    }
    // Sneak shows a low ring; a shadowed thief is drawn dimmer.
    if (player.mode === 'sneak') {
      context.strokeStyle = 'rgba(250,248,245,0.5)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = inShadowNow ? '#8A6A00' : PALETTE.amber;
    context.beginPath();
    context.moveTo(player.x + Math.cos(player.facing) * (player.radius + 6), player.y + Math.sin(player.facing) * (player.radius + 6));
    context.lineTo(player.x + Math.cos(player.facing + 2.4) * player.radius, player.y + Math.sin(player.facing + 2.4) * player.radius);
    context.lineTo(player.x + Math.cos(player.facing - 2.4) * player.radius, player.y + Math.sin(player.facing - 2.4) * player.radius);
    context.closePath();
    context.fill();
    circle(player.x, player.y, player.radius, inShadowNow ? '#8A6A00' : PALETTE.amber);
    context.strokeStyle = '#111318';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    context.stroke();
    circle(player.x + Math.cos(player.facing) * 6, player.y + Math.sin(player.facing) * 6, 3, '#111318');
    text('WREN', player.x, player.y - player.radius - 8, 13, PALETTE.text, 'center', 700);
    if (player.mode === 'sneak') text('SNEAKING', player.x, player.y + player.radius + 18, 11, PALETTE.muted, 'center', 700);
    else if (player.mode === 'run') text('RUNNING — LOUD', player.x, player.y + player.radius + 18, 11, PALETTE.red, 'center', 700);
  }

  function drawHud(state) {
    rect(0, 0, FIELD.width, HUD_HEIGHT, PALETTE.hud);
    rect(0, HUD_HEIGHT - 1, FIELD.width, 1, PALETTE.hudLine);
    text('MIDNIGHT VAULT', 16, 26, 22, PALETTE.amber, 'left', 800);
    const centre = `LOOT ${state.lootTaken}/7   $${state.lootDollars}   ${formatTime(state.timer)}`;
    text(centre, FIELD.width / 2, 26, 24, PALETTE.text, 'center', 700);
    // Alarm bar, right side.
    const barX = 968;
    const barW = 210;
    text('ALARM', barX - 10, 26, 18, alarmColour(state.alarm), 'right', 700);
    rect(barX, 10, barW, 16, '#23262E');
    rect(barX, 10, Math.round((barW * state.alarm) / ALARM.max), 16, alarmColour(state.alarm));
    strokeRect(barX, 10, barW, 16, '#454B5A', 1);
    text(`${Math.round(state.alarm)}%`, barX + barW + 10, 26, 20, alarmColour(state.alarm), 'left', 700);
    if (state.lockdown) {
      text('LOCKDOWN — VAULT SEALED', FIELD.width / 2, 52, 16, PALETTE.red, 'center', 800);
    } else if (state.powerCut) {
      text('POWER CUT — CAMERAS DEAD', FIELD.width / 2, 52, 14, PALETTE.green, 'center', 700);
    }
    // Tool chips, row two.
    for (const chip of TOOL_CHIPS) {
      const tool = state.tools[chip.name];
      const spent = tool.left === 0;
      rect(chip.x, chip.y, chip.w, chip.h, spent ? '#14161C' : '#1B1E26');
      strokeRect(chip.x, chip.y, chip.w, chip.h, spent ? '#2A2E38' : PALETTE.amber, 1);
      text(
        `${tool.key} ${tool.name} ×${tool.left}`,
        chip.x + 8, chip.y + 17, 14, spent ? PALETTE.muted : PALETTE.text, 'left', 700,
      );
    }
    text('WASD move · SHIFT sneak · CTRL run · E power box · M mute', 736, 52, 14, PALETTE.muted, 'left', 600);
  }

  function drawPanel(title, lines, prompt, promptColor) {
    const width = 640;
    const height = 150 + lines.length * 34;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(9,10,13,0.82)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    rect(x, y, width, height, PALETTE.hud);
    strokeRect(x, y, width, height, PALETTE.amber, 2);
    text(title, FIELD.width / 2, y + 64, 44, PALETTE.amber, 'center', 800);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 116 + i * 34, 20, PALETTE.text, 'center', 600);
    }
    text(prompt, FIELD.width / 2, y + height - 30, 20, promptColor, 'center', 700);
  }

  function drawScreen(state, screen, best) {
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'MIDNIGHT VAULT',
        [
          '3 rooms · 4 guards · 3 cameras · 7 loot · 4 tools',
          'Cross the lobby and the gallery, crack the vault,',
          'grab the Crown Jewel — and reach the getaway van.',
          'WASD / arrows move · SHIFT sneak · CTRL run · 1–4 tools · E power box',
          best > 0 ? `Best getaway: $${best}` : 'No getaway yet. Tonight it changes.',
        ],
        'Press Enter or click to start the heist',
        PALETTE.green,
      );
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The guards hold their patrol. The alarm waits.'], 'Press P to resume', PALETTE.amber);
    } else if (screen === SCREEN_WON) {
      drawPanel(
        'GETAWAY — CLEAN EXIT',
        [
          `Loot ${state.lootTaken}/7  ·  $${state.lootDollars}`,
          `Time bonus  $${state.timeBonus}  (${formatTime(state.timer)} left)`,
          `FINAL SCORE  $${state.score}`,
        ],
        'Press R to run it again',
        PALETTE.green,
      );
    } else if (screen === SCREEN_CAUGHT) {
      drawPanel(
        'CAUGHT',
        [state.caughtReason, `Loot kept: ${state.lootTaken}/7  ·  $${state.lootDollars}`],
        'Press R to run it again',
        PALETTE.red,
      );
    }
  }

  /** Paint one frame: the floor, the cones, the people, the HUD, then a panel. */
  function draw(state, screen, best, wallRects, segments) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor(state);
    drawStreet(state);
    drawShadowZones();
    drawWalls(wallRects);
    drawCover(state);
    drawCones(state, segments);
    drawCameras(state);
    drawLoot(state);
    drawGuards(state);
    drawPlayer(state);
    drawHud(state);
    if (state.grace > 0) {
      context.strokeStyle = 'rgba(229,72,77,0.9)';
      context.lineWidth = 6;
      context.strokeRect(3, 3, FIELD.width - 6, FIELD.height - 6);
      text('SPOTTED!', FIELD.width / 2, 200, 64, PALETTE.red, 'center', 800);
      text('Break sight — now!', FIELD.width / 2, 240, 24, PALETTE.text, 'center', 700);
    }
    if (screen !== SCREEN_PLAY) drawScreen(state, screen, best);
  }

  /** Which tool chip, if any, covers the HUD point (x, y). */
  function toolAt(x, y) {
    for (const chip of TOOL_CHIPS) {
      if (x >= chip.x && x <= chip.x + chip.w && y >= chip.y && y <= chip.y + chip.h) return chip.name;
    }
    return null;
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    toolAt,
    /** The scale/offset the input uses to turn client points into field points. */
    toField(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) * (canvas.width / rect.width) - view.x) / view.scale,
        y: ((clientY - rect.top) * (canvas.height / rect.height) - view.y) / view.scale,
      };
    },
  };
}
