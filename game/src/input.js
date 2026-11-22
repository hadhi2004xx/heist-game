// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (start, pause, tools, power box) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted
// twice. A mouse click sets a click-to-move target and aims the coin toss.

import { FIELD, HUD_HEIGHT } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_TOOL_1 = 8;
export const ACTION_TOOL_2 = 16;
export const ACTION_TOOL_3 = 32;
export const ACTION_TOOL_4 = 64;
export const ACTION_POWER = 128;
export const ACTION_MUTE = 256;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const RUN = new Set(['ControlLeft', 'ControlRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const POWER = new Set(['KeyE']);
const MUTE = new Set(['KeyM']);
const TOOL_KEYS = new Map([
  ['Digit1', ACTION_TOOL_1],
  ['Digit2', ACTION_TOOL_2],
  ['Digit3', ACTION_TOOL_3],
  ['Digit4', ACTION_TOOL_4],
]);

/**
 * `canvas` is the game canvas; `toWorld` converts a client point to field
 * coordinates (the renderer owns the scale). `onToolButton` is called with a
 * tool name when the player clicks a HUD tool button.
 */
export function createInput(canvas, toWorld, onToolButton) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let clickTarget = null;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (POWER.has(event.code)) {
      if (!event.repeat) actions |= ACTION_POWER;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (TOOL_KEYS.has(event.code)) {
      if (!event.repeat) actions |= TOOL_KEYS.get(event.code);
    } else if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      keys.add(event.code);
    } else if (SNEAK.has(event.code) || RUN.has(event.code)) {
      keys.add(event.code);
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const point = toWorld(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toWorld(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
    if (point.y < HUD_HEIGHT) {
      // A click on the HUD bar is a tool button (or nothing), never a move.
      const tool = onToolButton(point.x, point.y);
      if (tool) return;
    }
    clickTarget = { x: point.x, y: point.y };
  });

  function axis(negative, positive) {
    const hasNegative = [...negative].some((code) => keys.has(code));
    const hasPositive = [...positive].some((code) => keys.has(code));
    return (hasPositive ? 1 : 0) - (hasNegative ? 1 : 0);
  }

  return {
    /** Steering direction from held keys (-1..1 on each axis). */
    direction() {
      return { x: axis(LEFT, RIGHT), y: axis(UP, DOWN) };
    },
    sneak() {
      return [...SNEAK].some((code) => keys.has(code));
    },
    run() {
      return [...RUN].some((code) => keys.has(code));
    },
    /** The mouse position in field coordinates, for aiming the coin toss. */
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    /** Take and clear the click-to-move target, if the player set one. */
    takeClickTarget() {
      const target = clickTarget;
      clickTarget = null;
      return target;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** True when the player is holding any movement key. */
    hasKeys() {
      return keys.size > 0;
    },
  };
}

/** Field coordinates of a client point, given the canvas rectangle and scale. */
export function clientToField(clientX, clientY, rect, scale) {
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

/** The canvas rectangle and scale that make FIELD.width span the window. */
export function fieldScale() {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(window.innerWidth * ratio);
  const height = Math.round(window.innerHeight * ratio);
  const scale = Math.min(width / FIELD.width, height / FIELD.height);
  return { width, height, scale, ratio };
}
