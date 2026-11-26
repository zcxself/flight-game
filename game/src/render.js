// Skyline Run — all drawing: sky, terrain, runway, rings, the aircraft and the HUD.
// The view is a chase camera behind the jet: the world is projected from 3D
// (x = lateral, y = altitude, z = forward) onto the canvas with a simple
// perspective divide, so the runway and the rings read as real 3D objects.
import { CONFIG } from './config.js';
import { FIELDS, CLOUDS, riverX, overRunway } from './world.js';

const TAU = Math.PI * 2;

export function project(state, px, py, pz, w, h) {
  // Translate into camera space: camera sits just behind and above the plane.
  const dx = px - state.x;
  const dy = py - state.y;
  const dz = pz - state.z;
  const cos = Math.cos(-state.heading), sin = Math.sin(-state.heading);
  const cx = dx * cos - dz * sin;
  const cz = dx * sin + dz * cos;
  if (cz < 4) return null; // behind the camera
  const f = h * 0.9;
  return { x: w / 2 + (cx / cz) * f, y: h * 0.52 - (dy / cz) * f, s: f / cz, z: cz };
}

function skyGradient(ctx, w, h, alt) {
  const t = Math.min(1, alt / CONFIG.maxAltitude);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, t > 0.6 ? '#1d3a6e' : '#2f6db3');
  g.addColorStop(0.45, t > 0.6 ? '#4f83c2' : '#7db4e4');
  g.addColorStop(0.62, '#cfe6f7');
  g.addColorStop(0.63, '#8fae6b');
  g.addColorStop(1, '#5d7d43');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawSun(ctx, w, h, heading) {
  const sx = w * 0.78 - ((heading % TAU) / TAU) * w * 0.2;
  const sy = h * 0.16;
  const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 60);
  g.addColorStop(0, 'rgba(255,246,200,0.95)');
  g.addColorStop(0.25, 'rgba(255,220,120,0.55)');
  g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, 60, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath(); ctx.arc(sx, sy, 16, 0, TAU); ctx.fill();
}

function drawMountains(ctx, w, h, heading) {
  // A distant ridge, its peaks shifting with heading so turning feels real.
  const off = ((heading % TAU) / TAU) * w;
  ctx.fillStyle = '#5b7ba6';
  ctx.beginPath();
  ctx.moveTo(-off, h * 0.62);
  for (let i = 0; i <= 10; i++) {
    const x = -off + i * (w / 5);
    const peak = h * (0.42 + (i % 3) * 0.05 + (i % 2) * 0.03);
    ctx.lineTo(x + w / 10, peak);
    ctx.lineTo(x + w / 5, h * 0.62);
  }
  ctx.lineTo(w * 2, h * 0.62);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i <= 10; i++) {
    const x = -off + i * (w / 5) + w / 10;
    const peak = h * (0.42 + (i % 3) * 0.05 + (i % 2) * 0.03);
    ctx.beginPath();
    ctx.moveTo(x - 14, peak + 12); ctx.lineTo(x, peak); ctx.lineTo(x + 14, peak + 12);
    ctx.closePath(); ctx.fill();
  }
}

const FIELD_COLORS = {
  farm: ['#7fae4e', '#8fb95a', '#6f9e44'],
  forest: ['#3f7a3a', '#4a8a42', '#356b31'],
  field: ['#b5a55a', '#c2b268', '#a89a4e'],
  town: ['#9aa0a8', '#a8adb5', '#8b9098'],
};

function drawGround(ctx, state, w, h) {
  // Ground patches, projected as quads, far to near so near ones overlap.
  const horizon = h * 0.62;
  const patches = [];
  for (const f of FIELDS) {
    const p = project(state, f.x, 0, f.z, w, h);
    if (!p || p.z > 1400) continue;
    patches.push({ f, p });
  }
  patches.sort((a, b) => b.p.z - a.p.z);
  for (const { f, p } of patches) {
    const s = p.s * 40;
    if (s < 2 || s > 500) continue; // too close: the base ground colour covers it
    const colors = FIELD_COLORS[f.kind];
    ctx.fillStyle = colors[Math.floor(f.tone * colors.length) % colors.length];
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  // River: a blue ribbon winding through the valley.
  ctx.strokeStyle = '#3f8fd2';
  ctx.lineCap = 'round';
  for (let z = Math.max(0, state.z - 40); z < state.z + 1300; z += 30) {
    const a = project(state, riverX(z), 0.5, z, w, h);
    const b = project(state, riverX(z + 30), 0.5, z + 30, w, h);
    if (!a || !b) continue;
    ctx.lineWidth = Math.min(60, Math.max(1, a.s * 10));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // Runway: dark strip with white centreline and threshold bars.
  const r = CONFIG.runway;
  const a = project(state, r.x - r.width / 2, 0.2, r.zStart, w, h);
  const b = project(state, r.x + r.width / 2, 0.2, r.zStart, w, h);
  const c = project(state, r.x + r.width / 2, 0.2, r.zEnd, w, h);
  const d = project(state, r.x - r.width / 2, 0.2, r.zEnd, w, h);
  if (a && b && c && d) {
    ctx.fillStyle = '#2c2f36';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f5f5f5'; ctx.lineWidth = Math.max(1, a.s * 0.6);
    ctx.beginPath();
    const m1 = project(state, r.x, 0.3, r.zStart + 10, w, h);
    const m2 = project(state, r.x, 0.3, r.zEnd - 10, w, h);
    if (m1 && m2) { ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); }
    ctx.stroke();
  }
  void horizon;
}

function drawClouds(ctx, state, w, h) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const c of CLOUDS) {
    const p = project(state, c.x, c.y, c.z, w, h);
    if (!p || p.z > 1500) continue;
    const s = p.s * c.s;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.32, 0, 0, TAU);
    ctx.ellipse(p.x - s * 0.5, p.y + s * 0.06, s * 0.6, s * 0.22, 0, 0, TAU);
    ctx.fill();
  }
}

function drawTargets(ctx, state, w, h, targets) {
  for (const t of targets) {
    if (t.passed) continue;
    const p = project(state, t.x, t.y, t.z, w, h);
    if (!p) continue;
    const r = p.s * t.r;
    if (r < 2) continue;
    if (t.kind === 'ring') {
      ctx.strokeStyle = t.index === 0 ? '#ffd166' : '#ff5d8f';
      ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.8, 0, TAU); ctx.stroke();
    } else {
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2;
      drawStar(ctx, p.x, p.y, r, r * 0.45);
    }
  }
}

function drawStar(ctx, x, y, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawAircraft(ctx, state, w, h) {
  // Chase view: the jet sits low-centre, banking with the turn, nose up with climb.
  const cx = w / 2, cy = h * 0.66;
  const bank = -state.roll * 0.9;
  const pitch = -state.pitch * 0.5;
  ctx.save();
  ctx.translate(cx, cy + pitch * 40);
  ctx.rotate(bank);
  const s = Math.min(w, h) / 720;
  ctx.scale(s, s);
  // Fuselage
  ctx.fillStyle = '#dfe6ee';
  ctx.beginPath();
  ctx.moveTo(0, -78); ctx.quadraticCurveTo(14, -30, 12, 20); ctx.lineTo(10, 62);
  ctx.lineTo(-10, 62); ctx.lineTo(-12, 20); ctx.quadraticCurveTo(-14, -30, 0, -78);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8b98a8'; ctx.lineWidth = 2; ctx.stroke();
  // Canopy
  ctx.fillStyle = '#1d4e89';
  ctx.beginPath(); ctx.ellipse(0, -34, 7, 20, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-2, -40, 3, 9, 0, 0, TAU); ctx.fill();
  // Wings
  ctx.fillStyle = '#b9c4d2';
  ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-92, 44); ctx.lineTo(-92, 58); ctx.lineTo(-8, 34); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 6); ctx.lineTo(92, 44); ctx.lineTo(92, 58); ctx.lineTo(8, 34); ctx.closePath(); ctx.fill();
  // Tail
  ctx.fillStyle = '#c33';
  ctx.beginPath(); ctx.moveTo(-8, 52); ctx.lineTo(-34, 84); ctx.lineTo(-30, 88); ctx.lineTo(-6, 62); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8, 52); ctx.lineTo(34, 84); ctx.lineTo(30, 88); ctx.lineTo(6, 62); ctx.closePath(); ctx.fill();
  // Engine glow, brighter with throttle
  const glow = 0.35 + state.throttle * 0.65;
  ctx.fillStyle = `rgba(255,${Math.floor(140 + 80 * glow)},40,${glow})`;
  ctx.beginPath(); ctx.ellipse(0, 68, 7, 10 + state.throttle * 12, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawGauge(ctx, x, y, r, label, value, max, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(6,16,30,0.72)';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, r - 7, a0, a1); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, r - 7, a0, a0 + (a1 - a0) * Math.min(1, value / max)); ctx.stroke();
  const na = a0 + (a1 - a0) * Math.min(1, value / max);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(na) * (r - 12), Math.sin(na) * (r - 12)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(label, 0, r - 12);
  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#cfe6ff';
  ctx.fillText(String(Math.round(value)), 0, 6);
  ctx.restore();
}

function drawHUD(ctx, state, w, h) {
  ctx.textAlign = 'left';
  // Top bar: the numbers a pilot reads first.
  ctx.fillStyle = 'rgba(6,16,30,0.62)';
  ctx.fillRect(0, 0, w, 54);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 19px system-ui, sans-serif';
  const hdg = ((state.heading * 180 / Math.PI) % 360 + 360) % 360;
  ctx.fillText(`ALT ${Math.round(state.y * 10)} m`, 18, 34);
  ctx.fillText(`SPD ${Math.round(state.speed * 3.6)} km/h`, 200, 34);
  ctx.fillText(`HDG ${String(Math.round(hdg)).padStart(3, '0')}°`, 400, 34);
  ctx.fillText(`SCORE ${state.score}`, 580, 34);
  ctx.fillStyle = state.fuel < 25 ? '#ff6b6b' : '#ffd166';
  ctx.fillText(`FUEL ${Math.round(state.fuel)}%`, 760, 34);
  ctx.fillStyle = state.damage > 60 ? '#ff6b6b' : '#7dff9a';
  ctx.fillText(`HULL ${Math.round(100 - state.damage)}%`, 920, 34);
  // Mission line (below the compass strip so the two never overlap)
  ctx.fillStyle = '#eaf4ff'; ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Mission ${state.mission.id}: ${state.mission.name} — ${state.missionText}`, 18, 102);
  // Next target distance
  const t = state.nextTarget;
  if (t) {
    const d = Math.max(0, Math.round((t.z - state.z) * 10));
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`NEXT ${t.kind === 'ring' ? 'RING' : 'STAR'} ${d} m`, w - 220, 102);
  }
  // Compass strip
  ctx.fillStyle = 'rgba(6,16,30,0.5)';
  ctx.fillRect(w / 2 - 160, 60, 320, 22);
  ctx.fillStyle = '#fff'; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 15) {
    const a = Math.round(hdg + d);
    const label = a % 90 === 0 ? ['N', 'E', 'S', 'W'][(a / 90) % 4] : String(((a % 360) + 360) % 360);
    ctx.fillText(label, w / 2 + d * 2.4, 76);
  }
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.moveTo(w / 2, 60); ctx.lineTo(w / 2 - 5, 52); ctx.lineTo(w / 2 + 5, 52); ctx.closePath(); ctx.fill();
  // Instrument panel: artificial horizon + gauges, lit like a cockpit.
  const py = h - 86;
  drawGauge(ctx, 110, py, 52, 'THR', state.throttle * 100, 100, '#ffd166');
  drawGauge(ctx, 240, py, 52, 'SPD', state.speed, CONFIG.maxSpeed, '#7db4e4');
  drawGauge(ctx, w - 240, py, 52, 'ALT', state.y, CONFIG.maxAltitude, '#7dff9a');
  drawGauge(ctx, w - 110, py, 52, 'FUEL', state.fuel, 100, state.fuel < 25 ? '#ff6b6b' : '#ffd166');
  // Artificial horizon
  ctx.save();
  ctx.translate(w / 2, py);
  ctx.fillStyle = 'rgba(6,16,30,0.72)';
  ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, 48, 0, TAU); ctx.clip();
  ctx.rotate(-state.roll);
  ctx.translate(0, state.pitch * 60);
  ctx.fillStyle = '#3f8fd2'; ctx.fillRect(-60, -60, 120, 60);
  ctx.fillStyle = '#7a5a34'; ctx.fillRect(-60, 0, 120, 60);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(30, 0); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ATT', 0, 68);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawOverlay(ctx, state, w, h) {
  const lines = {
    menu: ['SKYLINE RUN', 'Ring Runner', 'Fly the rings, grab the stars, land on the runway.', 'Press ENTER or click to take off'],
    paused: ['PAUSED', 'Press P to resume'],
    crashed: ['CRASHED', `Score ${state.score} — press R to fly again`],
    landed: ['TOUCHDOWN!', `Mission complete — Score ${state.score}`, 'Press R to fly again, or ENTER for the next sortie'],
    complete: ['ALL MISSIONS COMPLETE!', `Final score ${state.score}`, 'Press R to fly again'],
    outoffuel: ['OUT OF FUEL', `Score ${state.score} — press R to fly again`],
  }[state.phase];
  if (!lines) return;
  ctx.fillStyle = 'rgba(6,16,30,0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(lines[0], w / 2, h * 0.38);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = '#cfe6ff';
  lines.slice(1).forEach((l, i) => ctx.fillText(l, w / 2, h * 0.38 + 44 + i * 34));
  ctx.textAlign = 'left';
}

export function render(ctx, state, w, h) {
  skyGradient(ctx, w, h, state.y);
  drawSun(ctx, w, h, state.heading);
  drawMountains(ctx, w, h, state.heading);
  drawGround(ctx, state, w, h);
  drawClouds(ctx, state, w, h);
  drawTargets(ctx, state, w, h, state.targets);
  drawAircraft(ctx, state, w, h);
  drawHUD(ctx, state, w, h);
  drawOverlay(ctx, state, w, h);
}
