// Skyline Run — tuning constants for the flight model and the missions.
// All numbers are in game units: 1 unit = 10 m, speeds in units per second.
export const CONFIG = {
  canvasWidth: 1280,
  canvasHeight: 720,
  minSpeed: 28,
  maxSpeed: 95,
  cruiseSpeed: 55,
  turnRate: 0.55,        // radians per second at full stick
  pitchRate: 0.42,
  climbRate: 14,         // altitude units per second at full climb
  maxAltitude: 120,
  minAltitude: 2,
  fuelMax: 100,
  fuelBurn: 0.55,        // per second at cruise throttle
  fuelBurnBoost: 1.4,
  damageGroundHit: 34,
  damageRingMiss: 0,
  ringRadius: 9,
  ringScore: 100,
  starScore: 50,
  landSpeedMax: 42,      // must be slower than this to land
  landAlignMax: 6,       // lateral offset from runway centreline
  runway: { x: 0, zStart: -40, zEnd: 260, width: 14 },
  missions: [
    { id: 1, name: 'Ring Run', goal: 'Fly through 5 target rings', rings: 5 },
    { id: 2, name: 'River Stars', goal: 'Collect 6 stars along the river', stars: 6 },
    { id: 3, name: 'Home Runway', goal: 'Land on the runway: slow, level, centred', land: true },
  ],
};

// Deterministic pseudo-random helper so terrain looks the same every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
