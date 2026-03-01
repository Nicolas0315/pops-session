// ============================================================
// Pops Session — Factory Presets
// Inspired by: Serum, Massive, Sylenth1, Nexus, Mai Tai
// ============================================================

import type { SynthPreset } from '@/types';

export const FACTORY_PRESETS: SynthPreset[] = [
  // ── 1. Serum Init — supersaw, bright, thin filter, chorus-like unison ──
  {
    id:             'preset-serum-supersaw',
    name:           '✦ Serum Supersaw',
    category:       'lead',
    oscillatorType: 'sawtooth',
    envelope:       { attack: 0.005, decay: 0.3,  sustain: 0.7,  release: 0.6 },
    filter:         { type: 'lowpass', cutoff: 4200, resonance: 8 },
    lfo:            { rate: 0.5, depth: 0.04, target: 'pitch' },
    effects:        { reverb: 0.18, delay: 0.12, delayTime: 0.25, delayFeedback: 0.35, distortion: 0.05 },
    octave:         4,
    detune:         0,
    unisonVoices:   7,
    unisonSpread:   28,
  },

  // ── 2. Massive Bass — detuned saws, LP closed, slow LFO filter sweep ──
  {
    id:             'preset-massive-bass',
    name:           '⬛ Massive Bass',
    category:       'bass',
    oscillatorType: 'sawtooth',
    envelope:       { attack: 0.01, decay: 0.4,  sustain: 0.6,  release: 0.25 },
    filter:         { type: 'lowpass', cutoff: 620,  resonance: 14 },
    lfo:            { rate: 1.2, depth: 0.22, target: 'filter' },
    effects:        { reverb: 0.04, delay: 0.0,  delayTime: 0.25, delayFeedback: 0.25, distortion: 0.18 },
    octave:         3,
    detune:         -5,
    unisonVoices:   3,
    unisonSpread:   18,
  },

  // ── 3. Sylenth Pad — warm, slow attack, sine-heavy, wide stereo ──
  {
    id:             'preset-sylenth-pad',
    name:           '☁  Sylenth Pad',
    category:       'pad',
    oscillatorType: 'sine',
    envelope:       { attack: 1.2,  decay: 0.8,  sustain: 0.85, release: 2.0 },
    filter:         { type: 'lowpass', cutoff: 2800, resonance: 3 },
    lfo:            { rate: 0.3, depth: 0.08, target: 'pitch' },
    effects:        { reverb: 0.55, delay: 0.15, delayTime: 0.5,  delayFeedback: 0.4,  distortion: 0.0 },
    octave:         4,
    detune:         3,
    unisonVoices:   5,
    unisonSpread:   20,
  },

  // ── 4. Nexus Lead — bright square pluck, fast decay, minimal reverb ──
  {
    id:             'preset-nexus-lead',
    name:           '▶ Nexus Lead',
    category:       'lead',
    oscillatorType: 'square',
    envelope:       { attack: 0.003, decay: 0.18, sustain: 0.55, release: 0.35 },
    filter:         { type: 'lowpass', cutoff: 5500, resonance: 10 },
    lfo:            { rate: 4.5, depth: 0.1,  target: 'pitch' },
    effects:        { reverb: 0.1,  delay: 0.22, delayTime: 0.375, delayFeedback: 0.3, distortion: 0.06 },
    octave:         5,
    detune:         0,
    unisonVoices:   1,
    unisonSpread:   0,
  },

  // ── 5. Mai Tai Keys — clean electric piano, slight chorusing detune ──
  {
    id:             'preset-maitai-keys',
    name:           '🎹 Mai Tai Keys',
    category:       'keys',
    oscillatorType: 'sine',
    envelope:       { attack: 0.004, decay: 0.9,  sustain: 0.25, release: 1.1 },
    filter:         { type: 'lowpass', cutoff: 7000, resonance: 2 },
    lfo:            { rate: 5.2, depth: 0.03, target: 'amp' },
    effects:        { reverb: 0.22, delay: 0.0,  delayTime: 0.3,  delayFeedback: 0.3,  distortion: 0.0 },
    octave:         4,
    detune:         1,
    unisonVoices:   2,
    unisonSpread:   8,
  },

  // ── 6. Lo-Fi Pad — RC-20 style: slow, saturated, dark filter, vinyl crunch ──
  {
    id:             'preset-lofi-pad',
    name:           '📼 Lo-Fi Pad',
    category:       'pad',
    oscillatorType: 'triangle',
    envelope:       { attack: 0.8,  decay: 1.2,  sustain: 0.7,  release: 2.5 },
    filter:         { type: 'lowpass', cutoff: 1100, resonance: 5 },
    lfo:            { rate: 0.15, depth: 0.2,  target: 'filter' },
    effects:        { reverb: 0.4,  delay: 0.08, delayTime: 0.42, delayFeedback: 0.45, distortion: 0.35 },
    octave:         3,
    detune:         -8,
    unisonVoices:   3,
    unisonSpread:   15,
  },

  // ── 7. 808 Sub — pure sine, fast pitch drop, no effects ──
  {
    id:             'preset-808-sub',
    name:           '💀 808 Sub',
    category:       'bass',
    oscillatorType: 'sine',
    envelope:       { attack: 0.001, decay: 1.8,  sustain: 0.0,  release: 0.3 },
    filter:         { type: 'lowpass', cutoff: 280,  resonance: 1 },
    lfo:            { rate: 0.1, depth: 0.0,  target: 'pitch' },
    effects:        { reverb: 0.0,  delay: 0.0,  delayTime: 0.25, delayFeedback: 0.0,  distortion: 0.05 },
    octave:         2,
    detune:         0,
    unisonVoices:   1,
    unisonSpread:   0,
  },

  // ── 8. Reese Bass — classic detuned saws, slow filter LFO, gnarly ──
  {
    id:             'preset-reese-bass',
    name:           '🔊 Reese Bass',
    category:       'bass',
    oscillatorType: 'sawtooth',
    envelope:       { attack: 0.02, decay: 0.5,  sustain: 0.8,  release: 0.4 },
    filter:         { type: 'bandpass', cutoff: 800,  resonance: 18 },
    lfo:            { rate: 0.8, depth: 0.45, target: 'filter' },
    effects:        { reverb: 0.05, delay: 0.0,  delayTime: 0.25, delayFeedback: 0.25, distortion: 0.25 },
    octave:         2,
    detune:         -12,
    unisonVoices:   2,
    unisonSpread:   35,
  },
];

export const DEFAULT_PRESET: SynthPreset = {
  id:             'default',
  name:           '— Init —',
  category:       'lead',
  oscillatorType: 'sawtooth',
  envelope:       { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.5 },
  filter:         { type: 'lowpass', cutoff: 3000, resonance: 5 },
  lfo:            { rate: 2, depth: 0.1, target: 'pitch' },
  effects:        { reverb: 0.1, delay: 0.08, delayTime: 0.3, delayFeedback: 0.35, distortion: 0 },
  octave:         4,
  detune:         0,
  unisonVoices:   1,
  unisonSpread:   0,
};

export const ALL_PRESETS: SynthPreset[] = [DEFAULT_PRESET, ...FACTORY_PRESETS];
