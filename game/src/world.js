// Skyline Run — the world: terrain patches, the river, the runway, rings and stars.
// The world is a long strip of ground the plane flies over. Everything is
// generated from a fixed seed, so every flight sees the same valley.
import { CONFIG, mulberry32 } from './config.js';

const rand = mulberry32(20261126);

// Field patches: a checker of farms, forest and town blocks along the strip.
export const FIELDS = [];
for (let z = -200; z < 2600; z += 40) {
  for (let x = -260; x <= 260; x += 40) {
    const r = rand();
    const kind = r < 0.42 ? 'farm' : r < 0.62 ? 'forest' : r < 0.78 ? 'field' : 'town';
    FIELDS.push({ x, z, kind, tone: rand() });
  }
}

// Clouds drift slowly above the valley.
export const CLOUDS = [];
for (let i = 0; i < 26; i++) {
  CLOUDS.push({ x: (rand() - 0.5) * 900, y: 55 + rand() * 55, z: rand() * 2600 - 100, s: 18 + rand() * 30 });
}

// The river winds across the valley (x as a function of z).
export function riverX(z) {
  return 90 * Math.sin(z * 0.0016) - 40 * Math.sin(z * 0.0007 + 1.3);
}

// Ring and star placement for each mission, laid out along the flight path.
export function buildMissionTargets(missionId) {
  const targets = [];
  if (missionId === 1) {
    const spots = [[-30, 26, 300], [25, 34, 520], [-10, 22, 740], [38, 40, 960], [0, 28, 1180]];
    spots.forEach(([x, y, z], i) => targets.push({ kind: 'ring', x, y, z, r: CONFIG.ringRadius, index: i, passed: false }));
  } else if (missionId === 2) {
    for (let i = 0; i < 6; i++) {
      const z = 300 + i * 170;
      targets.push({ kind: 'star', x: riverX(z), y: 20 + (i % 3) * 8, z, r: 7, index: i, passed: false });
    }
  }
  return targets;
}

// Distance from a point to the runway centreline, and whether it is over the runway.
export function overRunway(x, z) {
  const r = CONFIG.runway;
  return Math.abs(x - r.x) <= r.width / 2 && z >= r.zStart && z <= r.zEnd;
}
export function runwayCentreX() { return CONFIG.runway.x; }
