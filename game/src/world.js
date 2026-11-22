// The heist itself: one state, one fixed step, every system in the same order.
// The loop in main.js calls step() 60 times a second while playing; the
// screenshot staging in shots.js drives the same step with a scripted input,
// so a staged frame is a real frame of a real game.

import {
  ALARM, CAMERA, FIELD, GUARD, TIMER_SECONDS, TIME_BONUS_PER_SECOND,
} from './config.js';
import { createPlayer, movePlayer } from './player.js';
import { createGuards, stepGuards, GUARD_CHASE } from './guards.js';
import { createCameras, stepCameras, cameraSees } from './cameras.js';
import { createLoot, collectLoot, lootCount, lootValue } from './loot.js';
import { createTools } from './tools.js';
import { stepAlarm } from './alarm.js';
import {
  CAMERA_DEFS, EXIT_ZONE, GUARD_DEFS, SPAWN, inShadow, wallSegments,
} from './level.js';

export const EVENT_PICKUP = 1;
export const EVENT_JEWEL = 2;
export const EVENT_ALERT = 4;
export const EVENT_GRACE = 8;
export const EVENT_CAUGHT = 16;
export const EVENT_WIN = 32;
export const EVENT_DOOR = 64;
export const EVENT_TOOL = 128;
export const EVENT_COIN = 256;
export const EVENT_POWER = 512;
export const EVENT_TIME = 1024;

export function createWorld(random) {
  const dust = [];
  for (let i = 0; i < 42; i += 1) {
    dust.push({
      x: 20 + random() * (FIELD.width - 40),
      y: 80 + random() * (FIELD.height - 100),
      r: 0.6 + random() * 1.4,
    });
  }

  const state = {
    player: null,
    guards: null,
    cameras: null,
    loot: null,
    tools: null,
    coins: [],
    noiseEvents: [],
    dust,
    alarm: 0,
    lockdown: false,
    grace: 0,
    smokeUntil: 0,
    powerCut: false,
    vaultDoor: { locked: true, open: false },
    timer: TIMER_SECONDS,
    elapsed: 0,
    lootTaken: 0,
    lootDollars: 0,
    score: 0,
    timeBonus: 0,
    seenThisStep: false,
    outcome: null,
    caughtReason: '',
    stepTick: 0,
  };

  function reset() {
    state.player = createPlayer(SPAWN);
    state.guards = createGuards(GUARD_DEFS);
    state.cameras = createCameras(CAMERA_DEFS, 0);
    state.loot = createLoot();
    state.tools = createTools();
    state.coins = [];
    state.noiseEvents = [];
    state.alarm = 0;
    state.lockdown = false;
    state.grace = 0;
    state.smokeUntil = 0;
    state.powerCut = false;
    state.vaultDoor = { locked: true, open: false };
    state.timer = TIMER_SECONDS;
    state.elapsed = 0;
    state.lootTaken = 0;
    state.lootDollars = 0;
    state.score = 0;
    state.timeBonus = 0;
    state.seenThisStep = false;
    state.outcome = null;
    state.caughtReason = '';
    state.stepTick = 0;
  }

  /** The vault door blocks movement and sight while it is shut. */
  function vaultDoorShut() {
    if (!state.vaultDoor.open) return true;
    // Lockdown seals the door — unless the thief is already inside the vault,
    // who can always slip back out.
    if (state.lockdown && state.player.x < 868) return true;
    return false;
  }

  /** Detection multiplier for the thief right now: shadow, then sneak. */
  function sightFactor(player) {
    let factor = inShadow(player.x, player.y) ? 0.4 : 1;
    if (player.mode === 'sneak') factor *= 0.55;
    return factor;
  }

  /**
   * One fixed step. `move` is { x, y, sneak, run, clickTarget } from the input.
   * Returns event flags for the audio and the screen machine.
   */
  function step(dt, move) {
    let events = 0;
    state.elapsed += dt;
    state.stepTick += 1;
    state.timer = Math.max(0, TIMER_SECONDS - state.elapsed);
    state.noiseEvents = [];
    if (state.timer === 0) {
      state.outcome = 'caught';
      state.caughtReason = 'TIME UP — the crew left without you.';
      return EVENT_CAUGHT | EVENT_TIME;
    }

    const shut = vaultDoorShut();
    if (move.clickTarget) state.player.target = move.clickTarget;
    movePlayer(state.player, move, dt, shut);
    if (state.player.noise > 0) {
      state.noiseEvents.push({ x: state.player.x, y: state.player.y, radius: state.player.noise });
    }

    // Tossed coins: tick down, then land with a sound the guards hear.
    for (const coin of state.coins) {
      if (coin.landed) continue;
      coin.t -= dt;
      if (coin.t <= 0) {
        coin.landed = true;
        coin.ring = 0;
        state.noiseEvents.push({ x: coin.x, y: coin.y, radius: 260 });
        events |= EVENT_COIN;
      }
    }
    for (const coin of state.coins) {
      if (coin.landed && coin.ring !== undefined && coin.ring < 26) coin.ring += dt * 40;
    }

    stepCameras(state.cameras, dt, state.elapsed);
    const smokeActive = state.elapsed < state.smokeUntil;
    const segments = wallSegments(shut);
    stepGuards(state.guards, dt, {
      player: state.player,
      segments,
      alarm: state.alarm,
      vaultDoorShut: shut,
      noiseEvents: state.noiseEvents,
      smokeActive,
      sightFactor,
    });

    // The alarm's income: every eye on the thief, scaled by shadow and sneak.
    let seenRate = 0;
    state.seenThisStep = false;
    if (!smokeActive) {
      const factor = sightFactor(state.player);
      for (const guard of state.guards) {
        if (guard.sees) {
          seenRate += GUARD.sightRate * factor;
          state.seenThisStep = true;
        }
      }
      for (const camera of state.cameras) {
        if (cameraSees(camera, state.player, segments)) {
          seenRate += CAMERA.sightRate * factor;
          state.seenThisStep = true;
        }
      }
    }

    // A chasing guard who touches the thief starts the caught grace at once.
    let touched = false;
    for (const guard of state.guards) {
      if (guard.state === GUARD_CHASE && Math.hypot(guard.x - state.player.x, guard.y - state.player.y) < GUARD.catchDistance) {
        touched = true;
      }
    }
    if (touched && state.grace === 0) {
      state.alarm = ALARM.max;
      state.grace = ALARM.graceSeconds;
      events |= EVENT_GRACE;
    }

    const alarmEvent = stepAlarm(state, seenRate, dt);
    if (alarmEvent === 'grace') events |= EVENT_GRACE;
    else if (alarmEvent === 'caught') {
      state.outcome = 'caught';
      state.caughtReason = 'CAUGHT — the alarm hit 100 and the room closed in.';
      return events | EVENT_CAUGHT;
    } else if (alarmEvent === 'escaped') {
      events |= EVENT_ALERT;
    }
    if (state.alarm >= ALARM.investigateAt && state.seenThisStep) {
      events |= EVENT_ALERT;
    }

    const taken = collectLoot(state.loot, state.player);
    for (const item of taken) {
      state.lootTaken = lootCount(state.loot);
      state.lootDollars = lootValue(state.loot);
      state.score = state.lootDollars;
      events |= item.tier === 'jewel' ? EVENT_JEWEL : EVENT_PICKUP;
    }

    // The getaway: through the lobby door, down to the van.
    const p = state.player;
    if (
      p.x >= EXIT_ZONE.x && p.x <= EXIT_ZONE.x + EXIT_ZONE.w &&
      p.y >= EXIT_ZONE.y && p.y <= EXIT_ZONE.y + EXIT_ZONE.h
    ) {
      state.outcome = 'won';
      state.timeBonus = Math.ceil(state.timer) * TIME_BONUS_PER_SECOND;
      state.score = state.lootDollars + state.timeBonus;
      return events | EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step, vaultDoorShut, sightFactor };
}
