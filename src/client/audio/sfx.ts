// All sounds are synthesized with WebAudio: no asset downloads, tiny bundle, works offline in the app.

export type SfxName =
  | 'click'
  | 'pop'
  | 'coin'
  | 'cash'
  | 'objective'
  | 'success'
  | 'fail'
  | 'levelup'
  | 'message'
  | 'crash'
  | 'thud'
  | 'wanted'
  | 'door'
  | 'whoosh';

type Loop = { nodes: AudioNode[]; gain: GainNode; stop(): void };

class Sfx {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private volume = 0.7;
  private engine: (Loop & { a: OscillatorNode; b: OscillatorNode; filter: BiquadFilterNode }) | null = null;
  private skid: Loop | null = null;
  private siren: (Loop & { lfoGain: GainNode }) | null = null;
  private horn: Loop | null = null;

  /** The shared context (the voice player routes through it for lip-sync), once unlock() has created it. */
  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Must be called from a user gesture (browsers block audio until then). */
  unlock(): void {
    if (!this.ctx) {
      // iOS mutes WebAudio when the ringer switch is on silent unless the page asks for playback (iOS 17+).
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.out = this.ctx.createGain();
      this.out.gain.value = this.volume;
      this.out.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    // iOS also reports a non-standard 'interrupted' state (after a call or backgrounding).
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume().catch(() => {});
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.out) this.out.gain.value = v;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, endFreq?: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.out!);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  private burst(start: number, dur: number, freq: number, gain: number, type: BiquadFilterType = 'lowpass'): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f).connect(g).connect(this.out!);
    src.start(start);
    src.stop(start + dur + 0.05);
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.out || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'click':
        this.tone(900, t, 0.05, 'square', 0.05);
        break;
      case 'pop':
        this.tone(520, t, 0.09, 'sine', 0.2, 900);
        break;
      case 'coin':
        this.tone(988, t, 0.08, 'square', 0.08);
        this.tone(1319, t + 0.07, 0.22, 'square', 0.08);
        break;
      case 'cash':
        this.burst(t, 0.06, 4000, 0.15, 'highpass');
        this.tone(1568, t + 0.04, 0.3, 'sine', 0.18);
        this.tone(2093, t + 0.1, 0.4, 'sine', 0.14);
        break;
      case 'objective':
        [660, 880, 1320].forEach((f, i) => this.tone(f, t + i * 0.07, 0.18, 'triangle', 0.16));
        break;
      case 'success':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.11, i === 3 ? 0.7 : 0.2, 'triangle', 0.2));
        this.tone(262, t, 0.9, 'sine', 0.1);
        break;
      case 'fail':
        this.tone(392, t, 0.25, 'sawtooth', 0.08, 370);
        this.tone(330, t + 0.25, 0.25, 'sawtooth', 0.08, 311);
        this.tone(262, t + 0.5, 0.6, 'sawtooth', 0.08, 196);
        break;
      case 'levelup':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * 0.08, 0.3, 'square', 0.07));
        break;
      case 'message':
        this.tone(1200, t, 0.08, 'sine', 0.15);
        this.tone(1600, t + 0.1, 0.12, 'sine', 0.15);
        break;
      case 'crash':
        this.burst(t, 0.35, 1400, 0.5);
        this.tone(90, t, 0.3, 'sine', 0.4, 40);
        break;
      case 'thud':
        this.burst(t, 0.12, 500, 0.3);
        break;
      case 'wanted':
        for (let i = 0; i < 4; i++) this.tone(i % 2 ? 560 : 760, t + i * 0.12, 0.11, 'square', 0.06);
        break;
      case 'door':
        this.burst(t, 0.05, 2500, 0.2, 'bandpass');
        this.tone(180, t, 0.08, 'sine', 0.2);
        break;
      case 'whoosh':
        this.burst(t, 0.35, 900, 0.2, 'bandpass');
        break;
    }
  }

  private loop(build: (ctx: AudioContext, gain: GainNode) => AudioScheduledSourceNode[]): Loop {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.out!);
    const sources = build(ctx, gain);
    sources.forEach((s) => s.start());
    return {
      nodes: sources,
      gain,
      stop: () => {
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        setTimeout(() => sources.forEach((s) => s.stop()), 300);
      },
    };
  }

  /** Continuous engine hum for the player's car. speed01 in 0..1. */
  setEngine(on: boolean, speed01 = 0, throttle = 0): void {
    if (!this.ctx || !this.out) return;
    if (!on) {
      this.engine?.stop();
      this.engine = null;
      return;
    }
    if (!this.engine) {
      let a!: OscillatorNode;
      let b!: OscillatorNode;
      let filter!: BiquadFilterNode;
      const loop = this.loop((ctx, gain) => {
        a = ctx.createOscillator();
        b = ctx.createOscillator();
        a.type = 'sawtooth';
        b.type = 'square';
        filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        a.connect(filter);
        b.connect(filter);
        filter.connect(gain);
        return [a, b];
      });
      this.engine = { ...loop, a, b, filter };
    }
    const t = this.ctx.currentTime;
    const f = 42 + speed01 * 120 + Math.abs(throttle) * 12;
    this.engine.a.frequency.setTargetAtTime(f, t, 0.08);
    this.engine.b.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    this.engine.filter.frequency.setTargetAtTime(300 + speed01 * 1500, t, 0.1);
    this.engine.gain.gain.setTargetAtTime(0.035 + Math.abs(throttle) * 0.03 + speed01 * 0.02, t, 0.1);
  }

  setSkid(amount: number): void {
    if (!this.ctx || !this.out) return;
    if (amount <= 0.02) {
      if (this.skid) this.skid.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }
    if (!this.skid) {
      this.skid = this.loop((ctx, gain) => {
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1900;
        f.Q.value = 1.2;
        src.connect(f).connect(gain);
        return [src];
      });
    }
    this.skid.gain.gain.setTargetAtTime(Math.min(0.12, amount * 0.12), this.ctx.currentTime, 0.04);
  }

  setSiren(on: boolean, volume = 1): void {
    if (!this.ctx || !this.out) return;
    if (!on) {
      this.siren?.stop();
      this.siren = null;
      return;
    }
    if (!this.siren) {
      let lfoGain!: GainNode;
      const loop = this.loop((ctx, gain) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 900;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.45;
        lfoGain = ctx.createGain();
        lfoGain.gain.value = 320;
        lfo.connect(lfoGain).connect(o.frequency);
        o.connect(gain);
        return [o, lfo];
      });
      this.siren = { ...loop, lfoGain };
    }
    this.siren.gain.gain.setTargetAtTime(0.045 * volume, this.ctx.currentTime, 0.2);
  }

  setHorn(on: boolean): void {
    if (!this.ctx || !this.out) return;
    if (!on) {
      this.horn?.stop();
      this.horn = null;
      return;
    }
    if (!this.horn) {
      this.horn = this.loop((ctx, gain) => {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 1800;
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        o1.type = o2.type = 'square';
        o1.frequency.value = 392;
        o2.frequency.value = 494;
        o1.connect(f);
        o2.connect(f);
        f.connect(gain);
        return [o1, o2];
      });
      this.horn.gain.gain.setTargetAtTime(0.07, this.ctx.currentTime, 0.01);
    }
  }

  stopLoops(): void {
    this.setEngine(false);
    this.setSkid(0);
    this.setSiren(false);
    this.setHorn(false);
  }
}

export const sfx = new Sfx();
