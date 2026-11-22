// MIDNIGHT VAULT — every tuning number, colour and level table in one place.
// The playfield is a fixed 1280x800 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size. Layout: a bank floor plan
// with three rooms (lobby, gallery hall, vault) over a street strip where the
// getaway van waits, and a HUD bar across the top.

export const FIELD = { width: 1280, height: 800 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** HUD bar height; the bank interior starts below it. */
export const HUD_HEIGHT = 64;
/** The bank's south wall; the street strip runs from here to the field's bottom. */
export const STREET_Y = 688;

export const PLAYER = {
  radius: 14,
  walkSpeed: 170,
  sneakSpeed: 105,
  runSpeed: 250,
  /** Detection multiplier while sneaking (Shift held). */
  sneakFactor: 0.55,
  /** Noise radius while running; walking is 40, sneaking is 0 (silent). */
  runNoise: 130,
  walkNoise: 40,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  investigateSpeed: 95,
  chaseSpeed: 148,
  /** Vision cone: half-angle and range in pixels. */
  coneHalfAngle: 0.61,
  coneRange: 225,
  /** Seconds of continuous sight before the guard turns suspicious. */
  suspectDelay: 0.45,
  /** Seconds a guard waits at a waypoint before moving on. */
  waypointPause: 1.4,
  /** Alarm per second added while a guard has the thief in sight. */
  sightRate: 22,
  /** How close a chasing guard must get to trigger the caught grace. */
  catchDistance: 26,
};

export const CAMERA = {
  coneHalfAngle: 0.44,
  range: 290,
  /** Alarm per second while a camera has the thief in sight. */
  sightRate: 30,
  /** Seconds an EMP pulse keeps every camera dark. */
  empSeconds: 10,
};

export const ALARM = {
  max: 100,
  /** Per second the meter falls while nobody sees the thief. */
  decayPerSecond: 6,
  /** At this level guards leave patrol and investigate the last seen spot. */
  investigateAt: 25,
  /** At this level guards chase the thief live and cameras lock on. */
  chaseAt: 60,
  /** At this level the vault door seals until the meter drops below `lockdownClearsAt`. */
  lockdownAt: 80,
  lockdownClearsAt: 50,
  /** Seconds of "SPOTTED!" grace before a full alarm becomes a catch. */
  graceSeconds: 1.2,
  /** Meter the alarm falls to when the thief breaks sight during the grace. */
  graceEscapeTo: 85,
  /** Flat alarm added when the power box is cut (the risk of killing the cameras). */
  powerCutCost: 12,
};

/** The heist clock: five minutes from the first step inside. */
export const TIMER_SECONDS = 300;
/** Dollars per second left on the clock, paid on a clean getaway. */
export const TIME_BONUS_PER_SECOND = 10;

export const TOOLS = {
  lockpick: { charges: 2, key: '1', name: 'LOCKPICK', hint: 'open vault door' },
  smoke: { charges: 2, key: '2', name: 'SMOKE', hint: 'blind all sight 4s' },
  emp: { charges: 1, key: '3', name: 'EMP', hint: 'cameras dark 10s' },
  coin: { charges: 3, key: '4', name: 'COIN', hint: 'lure a guard' },
};
export const SMOKE_SECONDS = 4;
/** How far a tossed coin flies from the thief toward the mouse. */
export const COIN_THROW = 170;
/** Guards inside this radius of a coin landing go to investigate it. */
export const COIN_HEARING = 260;

export const LOOT_TIERS = {
  small: { value: 50, label: 'CASH', radius: 13 },
  medium: { value: 100, label: 'CASE', radius: 15 },
  large: { value: 200, label: 'GOLD', radius: 17 },
  jewel: { value: 300, label: 'CROWN JEWEL', radius: 19 },
};

/** Diegetic Tactile HUD palette: obsidian floor, warm paper text, one amber accent. */
export const PALETTE = {
  backdrop: '#090A0D',
  hud: '#0D0F13',
  hudLine: '#23262E',
  lobbyFloor: '#14161C',
  galleryFloor: '#171922',
  vaultFloor: '#1B1E26',
  street: '#0C0D11',
  wall: '#2A2E38',
  wallEdge: '#454B5A',
  floorLine: '#1E212A',
  text: '#FAF8F5',
  muted: '#9AA3AF',
  amber: '#FFB000',
  amberDim: '#B57E00',
  green: '#10B981',
  red: '#E5484D',
  guard: '#7C8AA5',
  guardDark: '#3A4356',
  camera: '#C9A227',
  shadow: '#05060A',
  smoke: '#8A8F99',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';
