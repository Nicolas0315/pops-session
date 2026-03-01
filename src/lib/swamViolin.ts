import { midiToFreq } from "./midiEngine";

interface Voice {
  note: number; freq: number; baseFreq: number;
  buf: Float32Array; idx: number; len: number;
  last: number; bowVel: number; bowForce: number;
  active: boolean; rel: boolean; relG: number;
  velocity: number; // 0-127 original velocity
  aftertouch: number; // 0-1 channel aftertouch → bow pressure mod
}
interface Res { b0:number;b1:number;b2:number;a1:number;a2:number;x1:number;x2:number;y1:number;y2:number; }

function friction(rv: number, f: number): number {
  const r = rv / 0.1;
  return (0.3 + 0.5 * Math.exp(-(r * r))) * f * Math.sign(rv);
}

function mkRes(freq: number, q: number, g: number, sr: number): Res {
  const w = 2*Math.PI*freq/sr, al = Math.sin(w)/(2*q), A = Math.pow(10, g/40), a0 = 1+al;
  return { b0:al*A/a0, b1:0, b2:-al*A/a0, a1:-2*Math.cos(w)/a0, a2:(1-al)/a0, x1:0,x2:0,y1:0,y2:0 };
}
function runR(f: Res, x: number): number {
  const y = f.b0*x+f.b1*f.x1+f.b2*f.x2-f.a1*f.y1-f.a2*f.y2;
  f.x2=f.x1;f.x1=x;f.y2=f.y1;f.y1=y; return y;
}

const BODY = [{f:275,q:15,g:6},{f:460,q:20,g:4},{f:550,q:12,g:8},{f:700,q:18,g:3},{f:1100,q:10,g:5},{f:1800,q:8,g:2},{f:2800,q:6,g:3},{f:4500,q:5,g:1}];

export class SWAMViolin {
  private ctx: AudioContext; private sr: number;
  private voices = new Map<number, Voice>();
  private bodyF: Res[] = [];
  private sn: ScriptProcessorNode | null = null;
  private gn: GainNode; private an: AnalyserNode;
  bowPressure = 0.5; bowSpeed = 0.5; bowPositionRatio = 0.12;
  vibrato = 0; vibratoRate = 5.5; private vPhase = 0; volume = 0.7;
  pitchBend = 0; // -1 to +1
  bendRange = 2; // semitones (default ±2, SWAM default)
  brightness = 0.5; // 0-1, controls body resonance mix
  aftertouch = 0; // 0-1, global channel aftertouch
  stringResonance = 0.5; // 0-1, sympathetic string resonance amount
  bowNoise = 0.02; // 0-1, rosin noise level

  constructor(ctx: AudioContext) {
    this.ctx = ctx; this.sr = ctx.sampleRate;
    this.bodyF = BODY.map(r => mkRes(r.f, r.q, r.g, this.sr));
    this.gn = ctx.createGain(); this.gn.gain.value = this.volume;
    this.an = ctx.createAnalyser(); this.an.fftSize = 2048;
    this.gn.connect(this.an); this.an.connect(ctx.destination);
  }

  start() {
    this.sn = this.ctx.createScriptProcessor(512, 0, 1);
    this.sn.onaudioprocess = e => this.proc(e);
    this.sn.connect(this.gn);
  }
  stop() { this.sn?.disconnect(); this.sn = null; this.voices.clear(); }

  noteOn(note: number, vel: number) {
    const freq = midiToFreq(note), len = Math.round(this.sr / freq);
    const buf = new Float32Array(len);
    for (let i = 0; i < len; i++) buf[i] = (Math.random()*2-1)*0.001;
    // Velocity curves: higher vel → more bow force + slightly more speed
    const velNorm = vel / 127;
    const velCurve = velNorm * velNorm; // exponential velocity curve (more natural)
    this.voices.set(note, {
      note, freq, baseFreq: freq, buf, idx:0, len, last:0,
      bowVel: velNorm * this.bowSpeed,
      bowForce: velCurve * this.bowPressure,
      active:true, rel:false, relG:1,
      velocity: vel, aftertouch: 0,
    });
  }

  noteOff(note: number) { const v = this.voices.get(note); if (v) v.rel = true; }

  // Polyphonic aftertouch (per-note pressure)
  polyAftertouch(note: number, pressure: number) {
    const v = this.voices.get(note);
    if (v) {
      v.aftertouch = pressure / 127;
      v.bowForce = (v.velocity / 127) * this.bowPressure * (1 + v.aftertouch * 0.5);
    }
  }

  // Channel aftertouch (all notes)
  channelAftertouch(pressure: number) {
    this.aftertouch = pressure / 127;
    for (const v of this.voices.values()) {
      v.bowForce = (v.velocity / 127) * this.bowPressure * (1 + this.aftertouch * 0.5);
    }
  }
  getAnalyser() { return this.an; }

  private proc(e: AudioProcessingEvent) {
    const out = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < out.length; i++) {
      let s = 0;
      this.vPhase += this.vibratoRate*2*Math.PI/this.sr;
      if (this.vPhase > 2*Math.PI) this.vPhase -= 2*Math.PI;
      const vm = Math.sin(this.vPhase)*this.vibrato*0.01;

      // Pitch bend: shift all voices
      const bendSemitones = this.pitchBend * this.bendRange;
      const bendRatio = Math.pow(2, bendSemitones / 12);

      for (const v of this.voices.values()) {
        if (!v.active && !v.rel) continue;
        if (v.rel) { v.relG *= 0.9995; v.bowForce *= 0.999; if (v.relG < 0.001) { v.active=false; v.rel=false; continue; } }

        // Apply pitch bend by adjusting effective read position
        const bentFreq = v.baseFreq * bendRatio * (1 + vm);
        const effectiveLen = this.sr / bentFreq;

        const d = v.buf[v.idx];

        // Bow noise (rosin friction noise)
        const noise = (Math.random() * 2 - 1) * this.bowNoise * v.bowForce;

        const bv = v.bowVel * (v.active ? 1 : 0);
        const fr = friction(bv - d, v.bowForce) + noise;

        // Damping varies with bow position (closer to bridge = brighter)
        const posDamp = 1 - this.bowPositionRatio * 2; // 0.05→0.9, 0.25→0.5
        const damp = (0.994 + posDamp * 0.004) - v.baseFreq * 0.000002;
        const filt = d * damp + v.last * (1 - damp);
        v.last = filt;
        v.buf[v.idx] = filt + fr * 0.15;

        // Fractional delay for pitch bend (linear interpolation)
        const frac = effectiveLen - Math.floor(effectiveLen);
        v.idx = (v.idx + 1) % v.len;
        const next = v.buf[v.idx];
        const interp = filt * (1 - frac) + next * frac;

        s += interp * v.relG;
      }

      // Body resonance with brightness control
      let b = 0;
      for (let fi = 0; fi < this.bodyF.length; fi++) {
        // Higher-index filters = higher freq = affected by brightness
        const bMix = fi < 4 ? 1.0 : this.brightness * 2;
        b += runR(this.bodyF[fi], s) * bMix;
      }

      // Sympathetic string resonance (subtle)
      const sympRes = s * this.stringResonance * 0.05;

      out[i] = Math.tanh((s * 0.3 + b * 0.7 + sympRes) * (0.5 + this.volume * 0.5)) * this.volume;
    }
    for (const [n, v] of this.voices) if (!v.active && !v.rel) this.voices.delete(n);
  }
}
