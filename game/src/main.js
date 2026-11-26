// Skyline Run — the game loop: state machine, flight physics, missions, scoring.
// Phases: menu, playing, paused, crashed, landed, complete, outoffuel.
// Screenshot hooks: ?shot=menu|flight|ring|landing&seed=1 starts the game in a
// fixed, good-looking state so the screenshots are real renders of the game.
import { CONFIG } from './config.js';
import { buildMissionTargets, overRunway } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();

function freshState() {
  return {
    phase: 'menu',
    x: 0, y: 30, z: -120, heading: 0, roll: 0, pitch: 0,
    speed: 0, throttle: 0.55, fuel: CONFIG.fuelMax, damage: 0,
    score: 0, time: 0, missionIndex: 0,
    mission: CONFIG.missions[0], targets: buildMissionTargets(1),
    missionText: CONFIG.missions[0].goal,
    nextTarget: null, message: '', messageUntil: 0,
  };
}

let state = freshState();

function setMission(i) {
  state.missionIndex = i;
  state.mission = CONFIG.missions[i];
  state.targets = buildMissionTargets(state.mission.id);
  state.missionText = state.mission.goal;
  updateNextTarget();
}

function updateNextTarget() {
  state.nextTarget = state.targets.find((t) => !t.passed) || null;
}

function startGame() {
  state = freshState();
  state.phase = 'playing';
  state.speed = CONFIG.cruiseSpeed;
  audio.start();
  setStatus('Flying. Mission 1: fly through 5 target rings.');
}

function setStatus(text) { statusEl.textContent = text; }

function flash(text) {
  state.message = text;
  state.messageUntil = state.time + 2.2;
}

function advanceMission() {
  if (state.missionIndex === 0) {
    setMission(1);
    flash('Mission 2: collect 6 stars along the river!');
    audio.chord();
  } else if (state.missionIndex === 1) {
    setMission(2);
    flash('Mission 3: land on the runway — slow, level, centred!');
    audio.chord();
  } else {
    state.phase = 'complete';
    setStatus(`All missions complete. Final score ${state.score}.`);
  }
}

function crash(reason) {
  state.phase = 'crashed';
  state.damage = 100;
  setStatus(`Crashed: ${reason}. Score ${state.score}. Press R to fly again.`);
}

function step(dt) {
  if (state.phase !== 'playing') return;
  state.time += dt;

  // Throttle: W up, S down, Space brakes hard.
  if (input.throttleUp) state.throttle = Math.min(1, state.throttle + dt * 0.5);
  if (input.throttleDown) state.throttle = Math.max(0, state.throttle - dt * 0.5);
  const targetSpeed = CONFIG.minSpeed + state.throttle * (CONFIG.maxSpeed - CONFIG.minSpeed);
  state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.8);
  if (input.brake) state.speed = Math.max(CONFIG.minSpeed * 0.6, state.speed - dt * 40);

  // Turn: keys, plus mouse steering when the mouse is over the canvas.
  let turn = 0;
  if (input.turnLeft) turn -= 1;
  if (input.turnRight) turn += 1;
  if (input.mouseActive) turn += input.mouseX * 1.6;
  turn = Math.max(-1, Math.min(1, turn));
  state.heading += turn * CONFIG.turnRate * dt * (0.6 + state.speed / CONFIG.maxSpeed);
  state.roll += (turn * 0.55 - state.roll) * Math.min(1, dt * 4);

  // Pitch: Up climbs, Down descends; level flight slowly settles.
  let pitch = 0;
  if (input.climb) pitch += 1;
  if (input.descend) pitch -= 1;
  state.pitch += (pitch * 0.5 - state.pitch) * Math.min(1, dt * 3);
  state.y += pitch * CONFIG.climbRate * dt;
  state.y = Math.max(CONFIG.minAltitude, Math.min(CONFIG.maxAltitude, state.y));

  // Move forward along the heading.
  state.x += Math.sin(state.heading) * state.speed * dt;
  state.z += Math.cos(state.heading) * state.speed * dt;
  state.x = Math.max(-280, Math.min(280, state.x));

  // Fuel: throttle discipline matters; a boost burns faster.
  state.fuel -= (CONFIG.fuelBurn * (0.4 + state.throttle) + (state.throttle > 0.9 ? CONFIG.fuelBurnBoost : 0)) * dt;
  if (state.fuel <= 0) { state.fuel = 0; state.phase = 'outoffuel'; setStatus(`Out of fuel. Score ${state.score}. Press R to fly again.`); return; }
  audio.setThrottle(state.throttle, state.speed);

  // Rings and stars: fly close to the centre to collect them.
  for (const t of state.targets) {
    if (t.passed) continue;
    const dx = state.x - t.x, dy = state.y - t.y, dz = state.z - t.z;
    if (Math.abs(dz) < 6 && Math.hypot(dx, dy) < t.r) {
      t.passed = true;
      const pts = t.kind === 'ring' ? CONFIG.ringScore : CONFIG.starScore;
      state.score += pts;
      state.fuel = Math.min(CONFIG.fuelMax, state.fuel + 4);
      flash(t.kind === 'ring' ? `Ring! +${pts}` : `Star! +${pts}`);
      audio.blip(t.kind === 'ring' ? 880 : 1174, 0.15);
      updateNextTarget();
      const done = state.targets.every((x) => x.passed);
      if (done && (state.missionIndex === 0 || state.missionIndex === 1)) advanceMission();
    }
  }

  // Landing (mission 3): low, slow, level and centred over the runway.
  if (state.missionIndex === 2 && state.phase === 'playing') {
    if (state.y <= CONFIG.minAltitude + 0.5 && overRunway(state.x, state.z)) {
      if (state.speed <= CONFIG.landSpeedMax && Math.abs(state.x) <= CONFIG.landAlignMax && Math.abs(state.pitch) < 0.25) {
        state.phase = 'landed';
        state.score += 500;
        audio.chord();
        setStatus(`Touchdown! Mission complete. Score ${state.score}.`);
      } else if (state.speed > CONFIG.landSpeedMax) {
        flash('Too fast to land — brake with Space!');
      }
    }
  }

  // Ground hit anywhere except a good landing.
  if (state.y <= CONFIG.minAltitude + 0.01 && state.phase === 'playing' && state.missionIndex !== 2) {
    state.damage += CONFIG.damageGroundHit;
    state.y = CONFIG.minAltitude + 2;
    flash('Ground strike! Hull damaged.');
    audio.blip(140, 0.3, 0.2);
    if (state.damage >= 100) crash('hit the ground');
  }
  // Flying too far off the valley edge.
  if (Math.abs(state.x) >= 279) { state.heading += (state.x > 0 ? -1 : 1) * dt * 0.4; }
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  const w = canvas.width, h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  render(ctx, state, w, h);
  if (state.message && state.time < state.messageUntil) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, w / 2, h * 0.2);
    ctx.textAlign = 'left';
  }
  requestAnimationFrame(loop);
}

input.onKey = (code) => {
  if (code === 'Enter') {
    if (state.phase === 'menu' || state.phase === 'landed') startGame();
  }
  if (code === 'KeyP') {
    if (state.phase === 'playing') { state.phase = 'paused'; setStatus('Paused.'); }
    else if (state.phase === 'paused') { state.phase = 'playing'; }
  }
  if (code === 'KeyR') startGame();
};
input.onClick = () => {
  if (state.phase === 'menu' || state.phase === 'landed') startGame();
};

// Screenshot hooks: a fixed state per ?shot= value, all real renders.
function applyShot() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  startGame();
  if (shot === 'flight') {
    state.z = 260; state.y = 30; state.speed = 62; state.throttle = 0.7;
  } else if (shot === 'ring') {
    state.z = 470; state.y = 32; state.x = 18; state.speed = 58; state.throttle = 0.65;
  } else if (shot === 'landing') {
    setMission(2);
    state.z = -160; state.y = 16; state.x = 1; state.speed = 36; state.throttle = 0.2;
    state.missionText = 'Land on the runway: slow, level, centred';
  } else if (shot === 'menu') {
    state = freshState();
  }
}
applyShot();
requestAnimationFrame(loop);
