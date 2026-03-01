import { midiToFreq } from "./midiEngine";

interface Voice {
  note: number; freq: number; buf: Float32Array; idx: number; len: number;
  last: number; bowVel: number; bowForce: number; active: boolean; rel: boolean; relG: number;
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
    this.voices.set(note, { note, freq, buf, idx:0, len, last:0,
      bowVel:(vel/127)*this.bowSpeed, bowForce:(vel/127)*this.bowPressure,
      active:true, rel:false, relG:1 });
  }
  noteOff(note: number) { const v = this.voices.get(note); if (v) v.rel = true; }
  getAnalyser() { return this.an; }

  private proc(e: AudioProcessingEvent) {
    const out = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < out.length; i++) {
      let s = 0;
      this.vPhase += this.vibratoRate*2*Math.PI/this.sr;
      if (this.vPhase > 2*Math.PI) this.vPhase -= 2*Math.PI;
      const vm = Math.sin(this.vPhase)*this.vibrato*0.01;

      for (const v of this.voices.values()) {
        if (!v.active && !v.rel) continue;
        if (v.rel) { v.relG *= 0.9995; v.bowForce *= 0.999; if (v.relG < 0.001) { v.active=false; v.rel=false; continue; } }
        const d = v.buf[v.idx];
        const bv = v.bowVel*(1+vm)*(v.active?1:0);
        const fr = friction(bv-d, v.bowForce);
        const damp = 0.996-v.freq*0.000002;
        const filt = d*damp+v.last*(1-damp);
        v.last = filt;
        v.buf[v.idx] = filt+fr*0.15;
        v.idx = (v.idx+1)%v.len;
        s += filt*v.relG;
      }
      let b = 0; for (const f of this.bodyF) b += runR(f, s);
      out[i] = Math.tanh(s*0.3+b*0.7)*this.volume;
    }
    for (const [n, v] of this.voices) if (!v.active && !v.rel) this.voices.delete(n);
  }
}
