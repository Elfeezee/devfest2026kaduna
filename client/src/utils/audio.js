// Pure Web Audio API Sound Synthesizer for DevFest Live Arena
// Zero external mp3 dependencies, 100% reliable offline/online

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + i * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playIncorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [260, 220, 180];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + i * 0.12;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  playTick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Dramatic heartbeat / tension pulse that accelerates and pitches up
  playTensionBeat(secondsRemaining = 5) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Frequency rises from 65Hz (at 5s) to 120Hz (at 1s)
    const baseFreq = 65 + (5 - Math.max(1, Math.min(secondsRemaining, 5))) * 14;

    // Sub-bass thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);

    // High tension snap
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();

    snap.type = 'triangle';
    snap.frequency.setValueAtTime(800 + (5 - secondsRemaining) * 200, now);
    snapGain.gain.setValueAtTime(0.15, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    snap.connect(snapGain);
    snapGain.connect(this.ctx.destination);

    snap.start(now);
    snap.stop(now + 0.05);
  }

  // Drumroll: rolling snare simulation
  playDrumroll() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 2.2;
    const hits = 35;

    for (let i = 0; i < hits; i++) {
      const hitTime = now + (i / hits) * duration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      // Pitch subtly rises
      osc.frequency.setValueAtTime(140 + (i / hits) * 60, hitTime);

      const vol = 0.05 + (i / hits) * 0.25;
      gain.gain.setValueAtTime(vol, hitTime);
      gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(hitTime);
      osc.stop(hitTime + 0.05);
    }

    // Final cymbal splash
    const cymbalTime = now + duration;
    const cymbal = this.ctx.createOscillator();
    const cymbalGain = this.ctx.createGain();

    cymbal.type = 'sawtooth';
    cymbal.frequency.setValueAtTime(1200, cymbalTime);
    cymbalGain.gain.setValueAtTime(0.3, cymbalTime);
    cymbalGain.gain.exponentialRampToValueAtTime(0.001, cymbalTime + 0.7);

    cymbal.connect(cymbalGain);
    cymbalGain.connect(this.ctx.destination);

    cymbal.start(cymbalTime);
    cymbal.stop(cymbalTime + 0.7);
  }

  // Stage applause / cheers
  playApplause() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 2.5;
    const claps = 50;

    for (let i = 0; i < claps; i++) {
      const clapTime = now + Math.random() * duration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300 + Math.random() * 400, clapTime);

      gain.gain.setValueAtTime(0.08 + Math.random() * 0.08, clapTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clapTime);
      osc.stop(clapTime + 0.08);
    }
  }

  // Theatrical buzzer
  playBuzzer() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [130, 145].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  // Pure harmonious ding
  playDing() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [1046.5, 2093].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(idx === 0 ? 0.35 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  playCountdownWarn() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Victory Arpeggio
    const chords = [
      { f: 523.25, t: 0.0 }, // C5
      { f: 659.25, t: 0.15 }, // E5
      { f: 783.99, t: 0.3 }, // G5
      { f: 1046.50, t: 0.45 }, // C6
      { f: 1318.51, t: 0.7 }  // E6
    ];

    chords.forEach(c => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + c.t;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const sounds = new SoundEngine();
