'use client';
// ============================================================
// Pops Session — Web Audio Engine v2
// Studio One 7 reference: Serum / Massive / Sylenth / Nexus
// ============================================================

import type { SynthPreset, ADSREnvelope } from '@/types';

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

// ═══════════════════════════════════════════════════════════
// SECTION 1 — DRUM / PERCUSSION GENERATORS
// Reference: 808, acoustic, lo-fi, Addictive Drums 2
// ═══════════════════════════════════════════════════════════

/** 808-style sine-sweep kick with punchy transient */
export function generateKick808(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.9, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    // Pitch envelope: 150Hz → 40Hz very fast
    const freq = 40 + 150 * Math.exp(-t * 35);
    const phase = 2 * Math.PI * freq * t;
    const body = Math.sin(phase) * Math.exp(-t * 5);
    // Click transient (short noise burst)
    const click = t < 0.008 ? (Math.random() * 2 - 1) * 0.9 * (1 - t / 0.008) : 0;
    d[i] = Math.tanh((body + click) * 1.4) * 0.85;
  }
  return buf;
}

/** Punchy acoustic-style kick */
export function generateKickAcoustic(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.5, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const freq = 60 + 120 * Math.exp(-t * 60);
    const body = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 18);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.5;
    d[i] = Math.tanh((body + noise) * 1.2) * 0.9;
  }
  return buf;
}

/** Tight crack snare */
export function generateSnareCrack(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.35, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const noise = Math.random() * 2 - 1;
    const tone1 = Math.sin(2 * Math.PI * 180 * t);
    const tone2 = Math.sin(2 * Math.PI * 320 * t);
    const snap = Math.exp(-t * 60);   // fast attack transient
    const body = Math.exp(-t * 18);
    d[i] = (noise * 0.55 + tone1 * 0.25 + tone2 * 0.2) * (snap * 0.4 + body * 0.6) * 0.95;
  }
  return buf;
}

/** Lo-fi vinyl snare (softer, saturated) */
export function generateSnareLofi(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.4, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const noise = Math.random() * 2 - 1;
    const tone = Math.sin(2 * Math.PI * 150 * t);
    const env = Math.exp(-t * 10);
    // Soft saturation for lo-fi character
    const raw = (noise * 0.7 + tone * 0.3) * env;
    d[i] = Math.tanh(raw * 2.5) * 0.6;
  }
  return buf;
}

/** Tight closed hi-hat */
export function generateHihatClosed(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.12, sr);
  const d = buf.getChannelData(0);
  // Metallic: 6 detuned sine oscillators at high freq
  const freqs = [4050, 4440, 6000, 6600, 8100, 10800];
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 55);
    let sum = 0;
    for (const f of freqs) sum += Math.sin(2 * Math.PI * f * t);
    d[i] = (sum / freqs.length + (Math.random() * 2 - 1) * 0.3) * env * 0.55;
  }
  return buf;
}

/** Open hi-hat with longer decay */
export function generateHihatOpen(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.5, sr);
  const d = buf.getChannelData(0);
  const freqs = [4050, 4440, 6000, 6600, 8100, 10800];
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 8);
    let sum = 0;
    for (const f of freqs) sum += Math.sin(2 * Math.PI * f * t);
    d[i] = (sum / freqs.length + (Math.random() * 2 - 1) * 0.25) * env * 0.5;
  }
  return buf;
}

/** Clap with layered bursts */
export function generateClap(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.35, sr);
  const d = buf.getChannelData(0);
  const bursts = [0, 0.010, 0.018, 0.030];
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const noise = Math.random() * 2 - 1;
    let env = 0;
    for (const b of bursts) {
      if (t >= b) env += Math.exp(-(t - b) * 90);
    }
    const tail = Math.exp(-t * 22) * 0.25;
    d[i] = noise * Math.min(1, env * 0.35 + tail) * 0.85;
  }
  return buf;
}

/** Rim shot: short pitched click */
export function generateRim(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.12, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const tone = Math.sin(2 * Math.PI * 1600 * t) + Math.sin(2 * Math.PI * 950 * t) * 0.5;
    const noise = (Math.random() * 2 - 1) * 0.4;
    const env = Math.exp(-t * 100);
    d[i] = (tone + noise) * env * 0.7;
  }
  return buf;
}

/** Conga-style membrane percussion */
export function generateConga(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.45, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const freq = 200 + 150 * Math.exp(-t * 40);
    const tone = Math.sin(2 * Math.PI * freq * t);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.3;
    const env = Math.exp(-t * 12);
    d[i] = (tone + noise) * env * 0.75;
  }
  return buf;
}

/** Shaker: bandpassed noise bursts */
export function generateShaker(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.15, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    // Envelope: fast attack, fast decay
    const env = (t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 40));
    // High-passed noise character
    const noise = Math.random() * 2 - 1;
    const hi = Math.sin(2 * Math.PI * 8000 * t) * 0.3;
    d[i] = (noise * 0.7 + hi) * env * 0.55;
  }
  return buf;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — MELODIC / TEXTURE GENERATORS
// ═══════════════════════════════════════════════════════════

export function generateBassPluck(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.9, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const saw = 2 * ((t * 80) % 1) - 1;
    const env = Math.exp(-t * 7);
    // LP filter simulation via leaky integrator
    d[i] = Math.tanh(saw * env * 0.6);
  }
  return buf;
}

export function generatePad(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(2, sr * 2.5, sr);
  const freqs = [220, 277.18, 329.63, 440];
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      const attack = Math.min(t / 0.6, 1);
      const decay  = Math.exp(-t * 0.8);
      let sum = 0;
      for (let fi = 0; fi < freqs.length; fi++) {
        const detune = (c === 0 ? 1 : 1.002) * (1 + (fi % 2 === 0 ? 0.001 : -0.001));
        sum += Math.sin(2 * Math.PI * freqs[fi] * detune * t) / freqs.length;
      }
      d[i] = sum * attack * decay * 0.65;
    }
  }
  return buf;
}

export function generateSynthLead(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.6, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const square = Math.sign(Math.sin(2 * Math.PI * 440 * t));
    const env = Math.exp(-t * 5);
    d[i] = Math.tanh(square * env * 0.5);
  }
  return buf;
}

export function generateFxRiser(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const dur = 2.0;
  const buf = ctx.createBuffer(1, sr * dur, sr);
  const d = buf.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const freq = 120 * Math.pow(10, (t / dur) * 1.5);
    phase += (2 * Math.PI * freq) / sr;
    const noise = (Math.random() * 2 - 1) * 0.15;
    d[i] = (Math.sin(phase) + noise) * (t / dur) * 0.55;
  }
  return buf;
}

export function generateVocalChop(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 0.45, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const f1 = Math.sin(2 * Math.PI * 700  * t);
    const f2 = Math.sin(2 * Math.PI * 1220 * t) * 0.55;
    const f3 = Math.sin(2 * Math.PI * 2600 * t) * 0.28;
    const env = Math.min(t / 0.04, 1) * Math.exp(-t * 9);
    d[i] = (f1 + f2 + f3) * env * 0.42;
  }
  return buf;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — PLAYBACK UTILITIES
// ═══════════════════════════════════════════════════════════

export function playBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  volume = 1.0,
  when = 0,
): AudioBufferSourceNode {
  const src  = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(when || ctx.currentTime);
  return src;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — METRONOME
// ═══════════════════════════════════════════════════════════

export class Metronome {
  private ctx: AudioContext;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private bpm = 120;
  private beat = 0;
  private beatsPerBar = 4;

  constructor(ctx: AudioContext) { this.ctx = ctx; }

  start(bpm: number, beatsPerBar: number) {
    this.stop();
    this.bpm        = bpm;
    this.beatsPerBar = beatsPerBar;
    this.nextBeatTime = this.ctx.currentTime + 0.05;
    this.beat       = 0;
    this.intervalId = setInterval(() => {
      while (this.nextBeatTime < this.ctx.currentTime + 0.12) {
        this._scheduleClick(this.nextBeatTime, this.beat === 0);
        this.beat = (this.beat + 1) % this.beatsPerBar;
        this.nextBeatTime += 60 / this.bpm;
      }
    }, 25);
  }

  stop() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  private _scheduleClick(time: number, accent: boolean) {
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.frequency.value = accent ? 1200 : 900;
    gain.gain.setValueAtTime(accent ? 0.28 : 0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.start(time); osc.stop(time + 0.04);
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — SYNTH ENGINE
// Reference: Serum (supersaw), Massive (detuned), Sylenth (warm)
// ═══════════════════════════════════════════════════════════

export class SynthEngine {
  private ctx: AudioContext;
  private activeNotes: Map<number, {
    oscs: OscillatorNode[];
    gain: GainNode;
    filter: BiquadFilterNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  }> = new Map();

  private masterGain: GainNode;
  private analyserNode: AnalyserNode;
  private distortionNode: WaveShaperNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayWetGain: GainNode;
  private reverbNode: ConvolverNode;
  private reverbWetGain: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.65;

    // Analyser
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Distortion (soft-clip style)
    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.curve = this._makeCurve(0);
    this.distortionNode.oversample = '4x';

    // Delay
    this.delayNode     = ctx.createDelay(2.0);
    this.delayFeedback = ctx.createGain();
    this.delayWetGain  = ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delayWetGain.gain.value  = 0;
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);

    // Reverb (convolutional)
    this.reverbNode    = ctx.createConvolver();
    this.reverbWetGain = ctx.createGain();
    this.reverbNode.buffer = this._makeIR(2.2, 2.5);
    this.reverbWetGain.gain.value = 0;
    this.reverbNode.connect(this.reverbWetGain);

    // Chain: master → distortion → (delay) + (reverb) → analyser → out
    this.masterGain.connect(this.distortionNode);
    this.distortionNode.connect(this.delayNode);
    this.distortionNode.connect(this.reverbNode);
    this.distortionNode.connect(this.analyserNode);
    this.delayWetGain.connect(this.analyserNode);
    this.reverbWetGain.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);
  }

  getAnalyser() { return this.analyserNode; }

  private _makeCurve(amount: number): Float32Array<ArrayBuffer> {
    const N = 512;
    const curve = new Float32Array(new ArrayBuffer(N * 4));
    const k = amount * 200;
    for (let i = 0; i < N; i++) {
      const x = (i * 2) / N - 1;
      curve[i] = k === 0 ? x : ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private _makeIR(duration: number, decay: number): AudioBuffer {
    const sr  = this.ctx.sampleRate;
    const len = sr * duration;
    const ir  = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return ir;
  }

  /** noteOn — supports supersaw via multiple detuned oscillators */
  noteOn(midiNote: number, velocity: number, preset: SynthPreset) {
    if (this.activeNotes.has(midiNote)) this.noteOff(midiNote);
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const now  = this.ctx.currentTime;
    const { envelope, filter, lfo, effects } = preset;

    // Determine unison count from preset (stored in detune field convention)
    // unisonVoices: 1 = mono, 3 = supersaw, 7 = thick
    const voices = preset.unisonVoices ?? 1;
    const spread = preset.unisonSpread ?? 0; // cents total spread

    // Filter
    const filterNode = this.ctx.createBiquadFilter();
    filterNode.type = filter.type;
    filterNode.frequency.value = filter.cutoff;
    filterNode.Q.value = filter.resonance;

    // Master voice gain
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    const vel = velocity / 127;
    gainNode.gain.linearRampToValueAtTime(vel * 0.75, now + envelope.attack);
    gainNode.gain.linearRampToValueAtTime(vel * 0.75 * envelope.sustain, now + envelope.attack + envelope.decay);

    // LFO
    const lfoOsc  = this.ctx.createOscillator();
    lfoOsc.frequency.value = lfo.rate;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = lfo.depth * (lfo.target === 'pitch' ? 200 : lfo.target === 'filter' ? filter.cutoff * 0.5 : 0.3);
    lfoOsc.connect(lfoGain);
    if (lfo.target === 'pitch')  lfoGain.connect(filterNode.frequency); // approximate
    if (lfo.target === 'filter') lfoGain.connect(filterNode.frequency);
    if (lfo.target === 'amp')    lfoGain.connect(gainNode.gain);

    // Oscillator bank (unison)
    const oscs: OscillatorNode[] = [];
    for (let v = 0; v < voices; v++) {
      const osc = this.ctx.createOscillator();
      osc.type  = preset.oscillatorType;
      osc.frequency.value = freq;
      // Spread detune evenly
      const detuneOffset = voices > 1
        ? ((v / (voices - 1)) - 0.5) * spread + preset.detune
        : preset.detune;
      osc.detune.value = detuneOffset;
      if (lfo.target === 'pitch') lfoGain.connect(osc.detune);

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.value = 1 / Math.sqrt(voices); // equal-power sum
      osc.connect(voiceGain);
      voiceGain.connect(filterNode);
      osc.start(now);
      oscs.push(osc);
    }

    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Apply effects
    this.distortionNode.curve = this._makeCurve(effects.distortion);
    this.delayWetGain.gain.setTargetAtTime(effects.delay, now, 0.01);
    this.delayNode.delayTime.value = effects.delayTime;
    this.delayFeedback.gain.value = effects.delayFeedback ?? 0.35;
    this.reverbWetGain.gain.setTargetAtTime(effects.reverb, now, 0.01);

    lfoOsc.start(now);
    this.activeNotes.set(midiNote, { oscs, gain: gainNode, filter: filterNode, lfo: lfoOsc, lfoGain });
  }

  noteOff(midiNote: number, envelope?: ADSREnvelope) {
    const note = this.activeNotes.get(midiNote);
    if (!note) return;
    const now     = this.ctx.currentTime;
    const release = envelope?.release ?? 0.3;
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(note.gain.gain.value, now);
    note.gain.gain.linearRampToValueAtTime(0.0001, now + release);
    for (const osc of note.oscs) { try { osc.stop(now + release + 0.01); } catch {} }
    try { note.lfo.stop(now + release + 0.01); } catch {}
    this.activeNotes.delete(midiNote);
  }

  allNotesOff() {
    for (const [note] of this.activeNotes) this.noteOff(note);
  }

  dispose() { this.allNotesOff(); this.masterGain.disconnect(); }
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — CANVAS RENDERERS
// ═══════════════════════════════════════════════════════════

export function drawWaveform(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer | null,
  color = '#60a5fa',
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !buffer) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / canvas.width);
  const amp  = canvas.height / 2;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;

  for (let i = 0; i < canvas.width; i++) {
    let mn = 1, mx = -1;
    for (let j = 0; j < step; j++) {
      const v = data[i * step + j] ?? 0;
      if (v < mn) mn = v; if (v > mx) mx = v;
    }
    ctx.moveTo(i, amp + mn * amp * 0.9);
    ctx.lineTo(i, amp + mx * amp * 0.9);
  }
  ctx.stroke();
}

export function drawSpectrum(canvas: HTMLCanvasElement, analyser: AnalyserNode) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const N    = analyser.frequencyBinCount;
  const data = new Uint8Array(N);
  analyser.getByteFrequencyData(data);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Studio One-style: dark background, warm gradient bars
  const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
  grad.addColorStop(0,   '#1a0a2e');
  grad.addColorStop(0.4, '#6d28d9');
  grad.addColorStop(0.8, '#a78bfa');
  grad.addColorStop(1,   '#ddd6fe');
  ctx.fillStyle = grad;

  const barW = (canvas.width / N) * 2.8;
  let x = 0;
  for (let i = 0; i < N; i++) {
    const h = (data[i] / 255) * canvas.height;
    ctx.fillRect(x, canvas.height - h, Math.max(1, barW - 1), h);
    x += barW;
    if (x > canvas.width) break;
  }

  // Peak line
  ctx.strokeStyle = 'rgba(221,214,254,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  x = 0;
  for (let i = 0; i < N; i++) {
    const h = (data[i] / 255) * canvas.height;
    if (i === 0) ctx.moveTo(x + barW / 2, canvas.height - h);
    else ctx.lineTo(x + barW / 2, canvas.height - h);
    x += barW;
    if (x > canvas.width) break;
  }
  ctx.stroke();
}

export function drawOscilloscope(canvas: HTMLCanvasElement, analyser: AnalyserNode) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const N    = analyser.fftSize;
  const data = new Uint8Array(N);
  analyser.getByteTimeDomainData(data);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(124,58,237,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  // Waveform — glow style
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#34d399';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const sliceW = canvas.width / N;
  for (let i = 0; i < N; i++) {
    const v = data[i] / 128.0;
    const y = (v * canvas.height) / 2;
    if (i === 0) ctx.moveTo(0, y);
    else ctx.lineTo(i * sliceW, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}
