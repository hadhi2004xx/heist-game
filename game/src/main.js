// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, won and caught.
//
// ?seed=N fixes the dust on the floor. ?shot=cover|lobby|vault|getaway (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import {
  EVENT_ALERT, EVENT_CAUGHT, EVENT_COIN, EVENT_DOOR, EVENT_GRACE,
  EVENT_JEWEL, EVENT_PICKUP, EVENT_POWER, EVENT_TOOL, EVENT_WIN,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_POWER, ACTION_RESTART,
  ACTION_TOOL_1, ACTION_TOOL_2, ACTION_TOOL_3, ACTION_TOOL_4, createInput,
} from './input.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { cutPowerBox, useTool } from './tools.js';
import { buildWallRects, wallSegments } from './level.js';
import {
  isMuted, playAlarmPulse, playAlert, playCaught, playCoin, playDoor, playJewel,
  playPickup, playStep, playWin, setMuted, startHum,
} from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
// Exposed for the automated checks: the live world, nothing more.
window.__game = { world, STEP };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const state = world.state;
  let painted = 0;
  function paint() {
    const wallRects = buildWallRects(world.vaultDoorShut());
    const segments = wallSegments(world.vaultDoorShut());
    renderer.draw(state, scene.screen, scene.best, wallRects, segments);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let queuedTool = null;
  const input = createInput(canvas, renderer.toField, (x, y) => {
    const tool = renderer.toolAt(x, y);
    if (tool) queuedTool = tool;
    return tool;
  });
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastAlertAt = -99;
  let lastPulseAt = -99;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    startHum();
    announce('Playing. Five minutes. Seven loot. Reach the van.');
  }

  function endGame(outcome) {
    if (outcome === 'won') {
      screen = SCREEN_WON;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`Getaway. Score ${world.state.score}. Best ${best}.`);
    } else {
      screen = SCREEN_CAUGHT;
      announce(`Caught. ${world.state.caughtReason}`);
    }
  }

  function playEvents(events) {
    const state = world.state;
    if (events & EVENT_PICKUP) playPickup();
    if (events & EVENT_JEWEL) playJewel();
    if (events & EVENT_GRACE) playAlert();
    if (events & EVENT_CAUGHT) playCaught();
    if (events & EVENT_WIN) playWin();
    if (events & EVENT_DOOR) playDoor();
    if (events & EVENT_COIN) playCoin();
    if (events & EVENT_POWER) playDoor();
    if (events & EVENT_ALERT && state.elapsed - lastAlertAt > 2) {
      lastAlertAt = state.elapsed;
      playAlert();
    }
    if (state.alarm >= 60 && state.elapsed - lastPulseAt > 1) {
      lastPulseAt = state.elapsed;
      playAlarmPulse();
    }
    if (state.player.moving && state.player.mode !== 'sneak' && state.stepTick % 18 === 0) {
      playStep();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      setMuted(!isMuted());
      announce(isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (queuedTool) {
      const tool = queuedTool;
      queuedTool = null;
      if (screen === SCREEN_PLAY) {
        const result = useTool(tool, world.state);
        if (result === 'used') playEvents(EVENT_TOOL | (tool === 'lockpick' ? EVENT_DOOR : 0));
        else if (result === 'empty') announce(`No ${tool} left.`);
        else if (result === 'far') announce('Get closer to the vault door first.');
        else if (result === 'sealed') announce('Lockdown — the vault is sealed.');
      }
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_CAUGHT)) {
      startGame();
    } else if (actions & ACTION_RESTART && (screen === SCREEN_WON || screen === SCREEN_CAUGHT || screen === SCREEN_PLAY)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_TOOL_1) {
      if (useTool('lockpick', world.state) === 'used') playDoor();
    }
    if (actions & ACTION_TOOL_2) {
      if (useTool('smoke', world.state) === 'used') playEvents(EVENT_TOOL);
    }
    if (actions & ACTION_TOOL_3) {
      if (useTool('emp', world.state) === 'used') playEvents(EVENT_TOOL);
    }
    if (actions & ACTION_TOOL_4) {
      const player = world.state.player;
      const mouse = input.mouse();
      player.mouseAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      if (useTool('coin', world.state) === 'used') playCoin();
    }
    if (actions & ACTION_POWER) {
      if (cutPowerBox(world.state)) playDoor();
      else announce('Stand by the power box to cut it.');
    }
  }

  function step() {
    const direction = input.direction();
    const clickTarget = input.takeClickTarget();
    if (clickTarget) world.state.player.target = clickTarget;
    const events = world.step(STEP, {
      x: direction.x,
      y: direction.y,
      sneak: input.sneak(),
      run: input.run(),
      clickTarget: null,
    });
    playEvents(events);
    if (world.state.outcome) endGame(world.state.outcome);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const state = world.state;
    const wallRects = buildWallRects(world.vaultDoorShut());
    const segments = wallSegments(world.vaultDoorShut());
    renderer.draw(state, screen, best, wallRects, segments);
  }

  // Leaving the tab pauses a running game rather than letting the clock run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Vault. Press Enter or click to start the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
