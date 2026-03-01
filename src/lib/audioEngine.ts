'use client';
// ============================================================
// Pops Session - Web Audio Engine
// ============================================================

import type { SynthPreset, ADSREnvelope, FilterParams, LFOParams, EffectsParams } from '@/types';

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// ---- Built-in Sample Generation ----

export function generateKick(ctx: AudioContext, duration = 0.5): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const freq = 150 * Math.exp(-t * 20);
    const amp = Math.exp(-t * 8);
    data[i] = Math.sin(2 * Math.PI * freq * t) * amp;
    if (t < 0.01) data[i] += (Math.random() * 2 - 1) * 0.3 * (1 - t / 0.01);
  }
  return buffer;
}

export function generateSnare(ctx: AudioContext, duration = 0.3): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() * 2 - 1);
    const tone = Math.sin(2 * Math.PI * 200 * t);
    const amp = Math.exp(-t * 15);
    data[i] = (noise * 0.6 + tone * 0.4) * amp;
  }
  return buffer;
}

export function generateHihat(ctx: AudioContext, duration = 0.15, open = false): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const len = open ? sampleRate * 0.4 : sampleRate * duration;
  const buffer = ctx.createBuffer(1, len, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() * 2 - 1);
    const amp = Math.exp(-t * (open ? 5 : 30));
    data[i] = noise * amp;
  }
  return buffer;
}

export function generateClap(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * 0.3, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() * 2 - 1);
    const burst1 = t < 0.02 ? Math.exp(-t * 100) : 0;
    const burst2 = t >= 0.02 && t < 0.04 ? Math.exp(-(t - 0.02) * 80) : 0;
    const tail = Math.exp(-t * 20) * 0.3;
    data[i] = noise * (burst1 + burst2 + tail);
  }
  return buffer;
}

export function generateBassPluck(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * 0.8, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const freq = 80;
    const amp = Math.exp(-t * 5);
    const saw = (2 * (t * freq - Math.floor(t * freq + 0.5)));
    data[i] = saw * amp * 0.5;
  }
  return buffer;
}

export function generatePad(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 2.0;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  const freqs = [220, 277, 330, 440];
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const env = Math.min(t / 0.5, 1) * Math.exp(-t * 1.5);
    let sum = 0;
    for (const f of freqs) {
      sum += Math.sin(2 * Math.PI * f * t) / freqs.length;
    }
    data[i] = sum * env * 0.6;
  }
  return buffer;
}

export function generateSynthLead(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * 0.5, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const freq = 440;
    const square = Math.sign(Math.sin(2 * Math.PI * freq * t));
    const env = Math.exp(-t * 4);
    data[i] = square * env * 0.4;
  }
  return buffer;
}

export function generateFxRiser(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 1.5;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const freq = 200 + (t / duration) * 2000;
    const amp = t / duration;
    const noise = (Math.random() * 2 - 1) * 0.2;
    data[i] = (Math.sin(2 * Math.PI * freq * t) + noise) * amp * 0.5;
  }
  return buffer;
}

export function generateVocalChop(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * 0.4, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const formant1 = Math.sin(2 * Math.PI * 700 * t);
    const formant2 = Math.sin(2 * Math.PI * 1200 * t) * 0.6;
    const formant3 = Math.sin(2 * Math.PI * 2500 * t) * 0.3;
    const env = Math.min(t / 0.05, 1) * Math.exp(-t * 8);
    data[i] = (formant1 + formant2 + formant3) * env * 0.4;
  }
  return buffer;
}

// ---- Playback ----

export function playBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  volume = 1.0,
  when = 0
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gainNode = ctx.createGain();
  gainNode.gain.value = volume;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(when || ctx.currentTime);
  return source;
}

// ---- Metronome ----

export class Metronome {
  private ctx: AudioContext;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private bpm = 120;
  private beat = 0;
  private beatsPerBar = 4;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  setBPM(bpm: number) { this.bpm = bpm; }
  setTimeSignature(num: number) { this.beatsPerBar = num; }

  start(bpm: number, beatsPerBar: number) {
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
    this.nextBeatTime = this.ctx.currentTime;
    this.beat = 0;
    this.schedule();
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private schedule() {
    this.intervalId = setInterval(() => {
      while (this.nextBeatTime < this.ctx.currentTime + 0.1) {
        this.scheduleClick(this.nextBeatTime, this.beat === 0);
        this.beat = (this.beat + 1) % this.beatsPerBar;
        this.nextBeatTime += 60 / this.bpm;
      }
    }, 25);
  }

  private scheduleClick(time: number, accent: boolean) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.value = accent ? 1000 : 800;
    gain.gain.setValueAtTime(accent ? 0.3 : 0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  }
}

// ---- Synthesizer Engine ----

export class SynthEngine {
  private ctx: AudioContext;
  private activeNotes: Map<number, {
    osc: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  }> = new Map();
  private masterGain: GainNode;
  private reverbNode: ConvolverNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayWet: GainNode;
  private reverbWet: GainNode;
  private distortionNode: WaveShaperNode;
  private analyserNode: AnalyserNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.7;

    // Analyser
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;

    // Distortion
    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(0);
    this.distortionNode.oversample = '4x';

    // Delay
    this.delayNode = ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.3;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = 0;
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);

    // Reverb
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this.generateImpulseResponse(2, 2);
    this.reverbWet = ctx.createGain();
    this.reverbWet.gain.value = 0;
    this.reverbNode.connect(this.reverbWet);

    // Signal chain: master → distortion → delay + reverb → analyser → output
    this.masterGain.connect(this.distortionNode);
    this.distortionNode.connect(this.delayNode);
    this.distortionNode.connect(this.reverbNode);
    this.distortionNode.connect(this.analyserNode);
    this.delayWet.connect(this.analyserNode);
    this.reverbWet.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);
  }

  getAnalyser(): AnalyserNode { return this.analyserNode; }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 256;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    const k = amount * 100;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  private generateImpulseResponse(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  noteOn(midiNote: number, velocity: number, preset: SynthPreset) {
    if (this.activeNotes.has(midiNote)) this.noteOff(midiNote);

    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const now = this.ctx.currentTime;
    const { envelope, filter, lfo, effects } = preset;

    // Oscillator
    const osc = this.ctx.createOscillator();
    osc.type = preset.oscillatorType;
    osc.frequency.value = freq;
    osc.detune.value = preset.detune;

    // Filter
    const filterNode = this.ctx.createBiquadFilter();
    filterNode.type = filter.type;
    filterNode.frequency.value = filter.cutoff;
    filterNode.Q.value = filter.resonance;

    // Gain / envelope
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime((velocity / 127) * 0.8, now + envelope.attack);
    gainNode.gain.linearRampToValueAtTime(
      (velocity / 127) * 0.8 * envelope.sustain,
      now + envelope.attack + envelope.decay
    );

    // LFO
    const lfoOsc = this.ctx.createOscillator();
    lfoOsc.frequency.value = lfo.rate;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = lfo.depth;
    lfoOsc.connect(lfoGain);

    if (lfo.target === 'pitch') lfoGain.connect(osc.detune);
    else if (lfo.target === 'filter') lfoGain.connect(filterNode.frequency);
    else if (lfo.target === 'amp') lfoGain.connect(gainNode.gain);

    // Effects
    this.distortionNode.curve = this.makeDistortionCurve(effects.distortion);
    this.delayWet.gain.value = effects.delay;
    this.delayNode.delayTime.value = effects.delayTime;
    this.reverbWet.gain.value = effects.reverb;

    // Connect chain
    osc.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    lfoOsc.start(now);

    this.activeNotes.set(midiNote, { osc, gain: gainNode, filter: filterNode, lfo: lfoOsc, lfoGain });
  }

  noteOff(midiNote: number, envelope?: ADSREnvelope) {
    const note = this.activeNotes.get(midiNote);
    if (!note) return;
    const now = this.ctx.currentTime;
    const release = envelope?.release ?? 0.3;
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(note.gain.gain.value, now);
    note.gain.gain.linearRampToValueAtTime(0.0001, now + release);
    note.osc.stop(now + release + 0.01);
    note.lfo.stop(now + release + 0.01);
    this.activeNotes.delete(midiNote);
  }

  allNotesOff() {
    this.activeNotes.forEach((_, note) => this.noteOff(note));
  }

  updateFilter(params: FilterParams) {
    this.activeNotes.forEach(note => {
      note.filter.type = params.type;
      note.filter.frequency.value = params.cutoff;
      note.filter.Q.value = params.resonance;
    });
  }

  dispose() {
    this.allNotesOff();
    this.masterGain.disconnect();
  }
}

// ---- Waveform Rendering ----

export function drawWaveform(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer | null,
  color = '#60a5fa',
  bg = 'transparent'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!buffer) return;

  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / canvas.width);
  const amp = canvas.height / 2;

  if (bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < canvas.width; i++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const val = data[i * step + j] ?? 0;
      if (val < min) min = val;
      if (val > max) max = val;
    }
    ctx.moveTo(i, amp + min * amp);
    ctx.lineTo(i, amp + max * amp);
  }
  ctx.stroke();
}

// ---- Spectrum Analyzer Renderer ----

export function drawSpectrum(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  color = '#a78bfa'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let x = 0;

  const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
  gradient.addColorStop(0, '#6d28d9');
  gradient.addColorStop(0.5, '#a78bfa');
  gradient.addColorStop(1, '#ddd6fe');

  ctx.fillStyle = gradient;
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height;
    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
    if (x > canvas.width) break;
  }
}

export function drawOscilloscope(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  color = '#34d399'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  const sliceWidth = canvas.width / bufferLength;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * canvas.height) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.stroke();
}
