// Nightshade Vault — every sound is synthesised with WebAudio, so the game
// ships no audio files: soft steps, a guard's boots by distance and side,
// a gem chime, an alarm sting and the exit fanfare. Nothing plays until the
// player first presses a key or clicks, which is also what unlocks audio.

export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.ambient = null;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
    this.startAmbient();
  }

  startAmbient() {
    // A low, barely-there room tone: two detuned sines through a slow wobble.
    const gain = this.context.createGain();
    gain.gain.value = 0.035;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const oscA = this.context.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 55;
    const oscB = this.context.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 55.7;
    const lfo = this.context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    oscA.start();
    oscB.start();
    lfo.start();
    this.ambient = gain;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short filtered-noise tap. `pan` is -1 (left) to 1 (right).
  tap(volume, pitch, pan) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const length = Math.floor(this.context.sampleRate * 0.07);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = pitch;
    filter.Q.value = 1.2;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const panner = this.context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.master);
    source.start(now);
  }

  // A sine blip that slides from `from` to `to` over `seconds`.
  tone(from, to, seconds, volume, delay = 0) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + seconds);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + seconds + 0.05);
  }

  playerStep(sneaking) {
    this.tap(sneaking ? 0.05 : 0.11, sneaking ? 500 : 340, 0);
  }

  // A guard's boot: louder and panned by where it is relative to you.
  guardStep(distance, pan) {
    const volume = Math.max(0.02, 0.22 * (1 - distance / 520));
    this.tap(volume, 190, pan);
  }

  gem() {
    this.tone(880, 1320, 0.16, 0.22);
    this.tone(1320, 1760, 0.2, 0.16, 0.07);
  }

  pebble() {
    this.tap(0.25, 900, 0);
    this.tone(300, 140, 0.12, 0.12, 0.02);
  }

  alarm() {
    this.tone(220, 440, 0.28, 0.3);
    this.tone(440, 220, 0.28, 0.3, 0.24);
    this.tone(220, 440, 0.28, 0.26, 0.48);
  }

  exitOpen() {
    this.tone(523, 784, 0.22, 0.2);
    this.tone(784, 1046, 0.3, 0.18, 0.12);
  }

  levelClear() {
    [523, 659, 784, 1046].forEach((freq, i) => this.tone(freq, freq, 0.3, 0.2, i * 0.11));
  }

  caught() {
    this.tone(330, 82, 0.6, 0.3);
  }
}
