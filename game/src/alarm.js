// The alarm meter: 0–100, rising while any eye is on the thief, falling while
// unseen. Its thresholds drive the whole heist — investigation at 25, chase at
// 60, lockdown at 80 — and a full meter does not catch the thief at once: a
// 1.2 second "SPOTTED!" grace lets a thief who breaks sight in time slip back
// to 85. That grace is what makes the caught moment fair.

import { ALARM } from './config.js';

/**
 * One fixed step of the meter. `seenRate` is the alarm per second from every
 * eye on the thief this step (0 while unseen, in smoke, or behind cover).
 * Returns 'grace' the moment the meter fills, 'caught' when the grace runs
 * out with the thief still seen, or '' otherwise.
 */
export function stepAlarm(world, seenRate, dt) {
  if (world.grace > 0) {
    world.grace -= dt;
    if (!world.seenThisStep) {
      // Broke sight during the grace: slip away, meter pulled back to 85.
      world.alarm = ALARM.graceEscapeTo;
      world.grace = 0;
      world.lockdown = world.alarm >= ALARM.lockdownAt;
      return 'escaped';
    }
    if (world.grace <= 0) return 'caught';
    return '';
  }

  if (seenRate > 0) world.alarm = Math.min(ALARM.max, world.alarm + seenRate * dt);
  else world.alarm = Math.max(0, world.alarm - ALARM.decayPerSecond * dt);

  if (world.alarm >= ALARM.max) {
    world.grace = ALARM.graceSeconds;
    return 'grace';
  }
  if (world.alarm >= ALARM.lockdownAt) world.lockdown = true;
  else if (world.alarm < ALARM.lockdownClearsAt) world.lockdown = false;
  return '';
}

/** The meter's colour: amber while warm, red once the heist is hot. */
export function alarmColour(alarm) {
  return alarm >= ALARM.chaseAt ? '#E5484D' : alarm >= ALARM.investigateAt ? '#FFB000' : '#10B981';
}
