// ============================================================
// Pops Session — Type Definitions v2
// Reference: Studio One 7, Serum, Massive, Sylenth1
// ============================================================

export type OscillatorType  = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type FilterType      = 'lowpass' | 'highpass' | 'bandpass';
export type LFOTarget       = 'pitch' | 'filter' | 'amp';
export type TrackType       = 'audio' | 'midi' | 'sample';
export type SampleCategory  = 'drums' | 'bass' | 'synths' | 'fx' | 'vocals';
export type Tab             = 'daw' | 'sampler' | 'synth' | 'violin';

// ─── Synth ────────────────────────────────────────────────

export interface ADSREnvelope {
  attack:  number;   // 0.001–4 s
  decay:   number;   // 0.01–4 s
  sustain: number;   // 0–1
  release: number;   // 0.01–8 s
}

export interface FilterParams {
  type:      FilterType;
  cutoff:    number;   // 20–20000 Hz
  resonance: number;   // 0–30
}

export interface LFOParams {
  rate:   number;     // 0.1–20 Hz
  depth:  number;     // 0–1
  target: LFOTarget;
}

export interface EffectsParams {
  reverb:        number;   // 0–1 wet
  delay:         number;   // 0–1 wet
  delayTime:     number;   // seconds
  delayFeedback: number;   // 0–0.95
  distortion:    number;   // 0–1
}

export interface SynthPreset {
  id:             string;
  name:           string;
  category?:      string;   // "lead" | "bass" | "pad" | "keys" | "fx"
  oscillatorType: OscillatorType;
  envelope:       ADSREnvelope;
  filter:         FilterParams;
  lfo:            LFOParams;
  effects:        EffectsParams;
  octave:         number;    // 1–7
  detune:         number;    // cents, -100–100
  unisonVoices?:  number;    // 1 | 2 | 3 | 5 | 7
  unisonSpread?:  number;    // cents total spread across voices
}

// ─── Sample Browser ───────────────────────────────────────

export interface Sample {
  id:          string;
  name:        string;
  category:    SampleCategory;
  subcategory?: string;   // e.g. "kick", "snare", "hihat"
  duration:    number;
  color:       string;
  isBuiltIn:   boolean;
  audioBuffer?: AudioBuffer;
  url?:         string;
}

// ─── DAW / Timeline ───────────────────────────────────────

export interface Clip {
  id:          string;
  trackId:     string;
  startBeat:   number;
  lengthBeats: number;
  sampleId?:   string;
  midiNotes?:  MidiNote[];
  color:       string;
  name:        string;
  audioBuffer?: AudioBuffer;
}

export interface MidiNote {
  id:          string;
  pitch:       number;   // 0–127
  startBeat:   number;
  lengthBeats: number;
  velocity:    number;   // 0–127
}

export interface Track {
  id:      string;
  name:    string;
  type:    TrackType;
  color:   string;
  volume:  number;   // 0–1
  pan:     number;   // -1–1
  muted:   boolean;
  soloed:  boolean;
  clips:   Clip[];
}

export interface TransportState {
  bpm:               number;
  timeSignatureNum:  number;
  timeSignatureDen:  number;
  isPlaying:         boolean;
  isRecording:       boolean;
  isLooping:         boolean;
  currentBeat:       number;
  loopStart:         number;
  loopEnd:           number;
  metronomeEnabled:  boolean;
}

// ─── App State ────────────────────────────────────────────

export interface AppState {
  activeTab:       Tab;
  tracks:          Track[];
  transport:       TransportState;
  samples:         Sample[];
  selectedTrackId: string | null;
  selectedClipId:  string | null;
  pianoRollClipId: string | null;
  synthPreset:     SynthPreset;
  savedPresets:    SynthPreset[];
  pixelsPerBeat:   number;
  scrollLeft:      number;
}
