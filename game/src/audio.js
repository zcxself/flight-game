// Skyline Run — tiny WebAudio sound: an engine hum whose pitch follows the
// throttle, plus short blips for rings, stars and landings. No audio files.
export function createAudio() {
  let ctx = null, osc = null, gain = null, started = false;
  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      gain = ctx.createGain();
      gain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 700;
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start();
      return true;
    } catch { return false; }
  }
  return {
    start() {
      if (!ensure() || started) return;
      started = true;
      if (ctx.state === 'suspended') ctx.resume();
      gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.5);
    },
    setThrottle(t, speed) {
      if (!ctx || !started) return;
      osc.frequency.setTargetAtTime(55 + t * 90 + speed * 0.4, ctx.currentTime, 0.1);
    },
    blip(freq = 880, dur = 0.12, vol = 0.12) {
      if (!ensure()) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    },
    chord() { this.blip(523, 0.18, 0.12); setTimeout(() => this.blip(659, 0.18, 0.12), 90); setTimeout(() => this.blip(784, 0.3, 0.12), 180); },
  };
}
