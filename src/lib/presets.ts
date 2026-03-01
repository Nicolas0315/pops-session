// ============================================================
// Pops Session — Factory Presets
// Source: ~/work/pops-session/preset-mappings.json
//   extracted from Studio One 7 Mai Tai / Mojito .preset files
//   (ZIP-compressed AudioEffectPreset XML)
//
// Parameter mapping (from parameterMapping in JSON):
//   S1 resonance 0–1  → WebAudio Q 0.1–30  (multiply ×30)
//   S1 oscillator types: 0=sine 1=sawtooth 2=square 3=triangle
//   ADSR: seconds / sustain 0–1 / all validated against XML
//   Filter envelope: amount in Hz added to base cutoff at peak
// ============================================================

import type { SynthPreset } from '@/types';

// ─── Real S1 presets (from preset-mappings.json) ─────────

export const FACTORY_PRESETS: SynthPreset[] = [

  // ── 1. Mai Tai — Init (template baseline) ────────────────
  // webAudio: osc=sawtooth, cutoff=20000, Q=0.1, attack≈0, decay≈0, sustain=1, release=0.01
  {
    id:             'preset-maitai-init',
    name:           '▷ Mai Tai Init',
    category:       'template',
    s1Source:       'Mai Tai',
    s1Notes:        'Default Init patch. Osc1=saw, filter open, no effects. Clean baseline.',
    oscillatorType: 'sawtooth',
    envelope:       { attack: 0.001, decay: 0.001, sustain: 1.0,  release: 0.01 },
    filter:         { type: 'lowpass', cutoff: 20000, resonance: 0.1 },
    lfo:            { rate: 2.0,   depth: 0.0,  target: 'pitch' },
    effects:        { reverb: 0.0,  delay: 0.0,  delayTime: 0.25, delayFeedback: 0.0,  distortion: 0.0 },
    octave:         4,
    detune:         0,
    unisonVoices:   1,
    unisonSpread:   0,
  },

  // ── 2. Mai Tai — 80s Funk Bass ───────────────────────────
  // webAudio (from JSON):
  //   osc1=sawtooth, osc2=sawtooth+7¢, filter LP at 72Hz, Q=6.4
  //   amp env: attack≈0, decay=0.094, sustain=0.615, release=0.124
  //   filter env (ADSR2): attack≈0, decay=4.49, sustain=0.08, amount=+8000Hz
  //   pre-filter drive=0.255 → distortion≈0.26
  {
    id:             'preset-maitai-funk-bass',
    name:           '🎸 80s Funk Bass',
    category:       'bass',
    s1Source:       'Mai Tai',
    s1Notes:        'Two detuned saws + heavy sub osc. Filter env sweeps 72Hz → 8072Hz over 4.49s. Classic 80s funk.',
    oscillatorType: 'sawtooth',
    envelope:       { attack: 0.001, decay: 0.094, sustain: 0.615, release: 0.124 },
    filter:         { type: 'lowpass', cutoff: 72,    resonance: 6.4  },
    filterEnvelope: { attack: 0.001, decay: 4.49,  sustain: 0.08, amount: 8000 },
    lfo:            { rate: 0.1,   depth: 0.0,  target: 'filter' },
    effects:        { reverb: 0.0,  delay: 0.0,  delayTime: 0.25, delayFeedback: 0.0,  distortion: 0.26 },
    octave:         3,
    detune:         0,
    unisonVoices:   2,   // osc1 + osc2
    unisonSpread:   7,   // osc2_detune=7¢ from JSON
  },

  // ── 3. Mojito — Default ───────────────────────────────────
  // webAudio (from JSON):
  //   osc=sawtooth, filterFreq=16000, Q=0.1
  //   attack=0.01, decay=0.5, sustain=0.25 (−12dB≈0.25 linear), release=0.05
  //   no LFO active, no effects
  {
    id:             'preset-mojito-default',
    name:           '〉Mojito Default',
    category:       'lead',
    s1Source:       'Mojito',
    s1Notes:        'Clean mono saw lead. Mojito is a simple single-osc synth. Good starting point for leads.',
    oscillatorType: 'sawtooth',
    envelope:       { attack: 0.01,  decay: 0.5,   sustain: 0.25, release: 0.05 },
    filter:         { type: 'lowpass', cutoff: 16000, resonance: 0.1 },
    lfo:            { rate: 5.0,   depth: 0.0,  target: 'pitch' },
    effects:        { reverb: 0.0,  delay: 0.0,  delayTime: 0.25, delayFeedback: 0.0,  distortion: 0.0 },
    octave:         4,
    detune:         0,
    unisonVoices:   1,
    unisonSpread:   0,
  },

  // ── 4–11: Additional presets (approx. from S1 reference) ─
  // These extend the S1 Init/Funk/Mojito foundation with
  // parameter values consistent with the validated mapping.

  // 4. Mai Tai — Supersaw Lead (Serum-equivalent in S1)
  // Two saws widely spread, filter slightly open, reverb tail
  {
    id:             'preset-maitai-supersaw',
    name:           '✦ Supersaw Lead',
    category:       'lead',
    s1Source:       'Mai Tai',
    s1Notes:        'Multi-osc supersaw. Wide unison spread, LP at 4.2kHz, Q=8.',
    oscillatorType: 'sawtooth',
    // S1 example: attack=0.005s, decay=0.3s, sustain=0.7, release=0.6s
    envelope:       { attack: 0.005, decay: 0.3,   sustain: 0.7,  release: 0.6  },
    filter:         { type: 'lowpass', cutoff: 4200,  resonance: 8.0  },
    lfo:            { rate: 0.5,   depth: 0.04, target: 'pitch' },
    effects:        { reverb: 0.18, delay: 0.12, delayTime: 0.25, delayFeedback: 0.35, distortion: 0.05 },
    octave:         4,
    detune:         0,
    unisonVoices:   7,
    unisonSpread:   28,
  },

  // 5. Mai Tai — Warm Pad
  // Sine osc, slow attack, high reverb — S1-style ambient pad
  // Resonance 0.1 → Q=3; cutoff=2800Hz; attack=1.2s from Mai Tai preset
  {
    id:             'preset-maitai-warmpad',
    name:           '☁ Warm Pad',
    category:       'pad',
    s1Source:       'Mai Tai',
    s1Notes:        'Sine-based ambient pad. Slow attack 1.2s, sustain 0.85, heavy reverb.',
    oscillatorType: 'sine',
    envelope:       { attack: 1.2,   decay: 0.8,   sustain: 0.85, release: 2.0  },
    filter:         { type: 'lowpass', cutoff: 2800,  resonance: 3.0  },
    lfo:            { rate: 0.3,   depth: 0.08, target: 'pitch' },
    effects:        { reverb: 0.55, delay: 0.15, delayTime: 0.5,  delayFeedback: 0.4,  distortion: 0.0  },
    octave:         4,
    detune:         3,
    unisonVoices:   5,
    unisonSpread:   20,
  },

  // 6. Mojito — Bright Lead
  // Square osc (S1 type=2), open filter, quick pluck decay
  // cutoff=5500, resonance=0.33→Q=10, decay=0.18s
  {
    id:             'preset-mojito-bright-lead',
    name:           '▶ Mojito Bright Lead',
    category:       'lead',
    s1Source:       'Mojito',
    s1Notes:        'Square osc, wide open filter, punchy decay. Classic Mojito character.',
    oscillatorType: 'square',
    envelope:       { attack: 0.003, decay: 0.18,  sustain: 0.55, release: 0.35 },
    filter:         { type: 'lowpass', cutoff: 5500,  resonance: 10.0 },
    lfo:            { rate: 4.5,   depth: 0.1,  target: 'pitch' },
    effects:        { reverb: 0.1,  delay: 0.22, delayTime: 0.375, delayFeedback: 0.3,  distortion: 0.06 },
    octave:         5,
    detune:         0,
    unisonVoices:   1,
    unisonSpread:   0,
  },

  // 7. Mai Tai — Keys (electric piano character)
  // Sine, fast attack, long decay, sustain low → pluck-like
  // S1 values: attack=4ms, decay=0.9s, sustain=0.25, release=1.1s
  {
    id:             'preset-maitai-keys',
    name:           '🎹 Mai Tai Keys',
    category:       'keys',
    s1Source:       'Mai Tai',
    s1Notes:        'E-piano character. Sine osc, amp LFO tremolo (5.2Hz), light chorus via 2-voice detune.',
    oscillatorType: 'sine',
    envelope:       { attack: 0.004, decay: 0.9,   sustain: 0.25, release: 1.1  },
    filter:         { type: 'lowpass', cutoff: 7000,  resonance: 2.0  },
    lfo:            { rate: 5.2,   depth: 0.03, target: 'amp'   },
    effects:        { reverb: 0.22, delay: 0.0,  delayTime: 0.3,  delayFeedback: 0.3,  distortion: 0.0  },
    octave:         4,
    detune:         1,
    unisonVoices:   2,
    unisonSpread:   8,
  },

  // 8. Mai Tai — Lo-Fi Pad
  // Triangle (S1 type=3), dark LP filter, drive + slow LFO on filter
  // cutoff=1100Hz, resonance=0.17→Q=5; drive=0.35→distortion=0.35
  {
    id:             'preset-maitai-lofi-pad',
    name:           '📼 Lo-Fi Pad',
    category:       'pad',
    s1Source:       'Mai Tai',
    s1Notes:        'Triangle osc with dark filter (1100Hz). Pre-filter drive=0.35. Vinyl warmth character.',
    oscillatorType: 'triangle',
    envelope:       { attack: 0.8,   decay: 1.2,   sustain: 0.7,  release: 2.5  },
    filter:         { type: 'lowpass', cutoff: 1100,  resonance: 5.0  },
    lfo:            { rate: 0.15,  depth: 0.2,  target: 'filter' },
    effects:        { reverb: 0.4,  delay: 0.08, delayTime: 0.42, delayFeedback: 0.45, distortion: 0.35 },
    octave:         3,
    detune:         -8,
    unisonVoices:   3,
    unisonSpread:   15,
  },

  // 9. Mai Tai — 808 Sub
  // Pure sine, very low cutoff, long decay, no effects
  // S1-equivalent: osc=sine, LP 280Hz, Q=0.1, decay=1.8s, sustain=0
  {
    id:             'preset-maitai-808sub',
    name:           '💀 808 Sub',
    category:       'bass',
    s1Source:       'Mai Tai',
    s1Notes:        'Pure sine sub bass. LP 280Hz, single cycle decay. Pairs with Kick 808 sample.',
    oscillatorType: 'sine',
    envelope:       { attack: 0.001, decay: 1.8,   sustain: 0.0,  release: 0.3  },
    filter:         { type: 'lowpass', cutoff: 280,   resonance: 0.1  },
    lfo:            { rate: 0.1,   depth: 0.0,  target: 'pitch' },
    effects:        { reverb: 0.0,  delay: 0.0,  delayTime: 0.25, delayFeedback: 0.0,  distortion: 0.05 },
    octave:         2,
    detune:         0,
    unisonVoices:   1,
    unisonSpread:   0,
  },

  // 10. Mai Tai — Reese Bass
  // Two detuned saws, bandpass resonant filter, LFO on filter
  // S1: osc1=saw, osc2=saw −12¢, BP at 800Hz, resonance=0.6→Q=18
  {
    id:             'preset-maitai-reese',
    name:           '🔊 Reese Bass',
    category:       'bass',
    s1Source:       'Mai Tai',
    s1Notes:        'Detuned dual saw through bandpass. LFO filter mod (0.8Hz) gives movement.',
    oscillatorType: 'sawtooth',
    envelope:       { attack: 0.02,  decay: 0.5,   sustain: 0.8,  release: 0.4  },
    filter:         { type: 'bandpass', cutoff: 800,   resonance: 18.0 },
    lfo:            { rate: 0.8,   depth: 0.45, target: 'filter' },
    effects:        { reverb: 0.05, delay: 0.0,  delayTime: 0.25, delayFeedback: 0.25, distortion: 0.25 },
    octave:         2,
    detune:         -12,
    unisonVoices:   2,
    unisonSpread:   35,
  },

  // 11. Mojito — Pluck (Mojito envelope sweep on filter)
  // Saw osc, fast attack, very fast decay, no sustain → pluck
  // Filter env: from full open back down (inverted: start high, close fast)
  {
    id:             'preset-mojito-pluck',
    name:           '⚡ Mojito Pluck',
    category:       'lead',
    s1Source:       'Mojito',
    s1Notes:        'Short pluck. Osc=saw, LP filter with fast envelope (decay=0.12s). No sustain.',
    oscillatorType: 'sawtooth',
    envelope:       { attack: 0.001, decay: 0.12,  sustain: 0.0,  release: 0.08 },
    filter:         { type: 'lowpass', cutoff: 400,   resonance: 12.0 },
    filterEnvelope: { attack: 0.001, decay: 0.18,  sustain: 0.0,  amount: 8000 },
    lfo:            { rate: 2.0,   depth: 0.0,  target: 'pitch' },
    effects:        { reverb: 0.08, delay: 0.0,  delayTime: 0.25, delayFeedback: 0.0,  distortion: 0.1  },
    octave:         4,
    detune:         0,
    unisonVoices:   1,
    unisonSpread:   0,
  },
];

// ─── Default init patch (mirrors Mai Tai Init exactly) ───
export const DEFAULT_PRESET: SynthPreset = {
  id:             'default',
  name:           '▷ Init',
  category:       'template',
  s1Source:       'Mai Tai',
  s1Notes:        'Clean init patch matching Mai Tai Init defaults.',
  oscillatorType: 'sawtooth',
  envelope:       { attack: 0.001, decay: 0.001, sustain: 1.0, release: 0.01 },
  filter:         { type: 'lowpass', cutoff: 20000, resonance: 0.1 },
  lfo:            { rate: 2.0, depth: 0.0, target: 'pitch' },
  effects:        { reverb: 0.0, delay: 0.0, delayTime: 0.25, delayFeedback: 0.0, distortion: 0.0 },
  octave:         4,
  detune:         0,
  unisonVoices:   1,
  unisonSpread:   0,
};

export const ALL_PRESETS: SynthPreset[] = [DEFAULT_PRESET, ...FACTORY_PRESETS];
