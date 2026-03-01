'use client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  AppState, Track, Clip, TransportState, Sample,
  SynthPreset, MidiNote, Tab, OscillatorType
} from '@/types';

const DEFAULT_PRESET: SynthPreset = {
  id: 'default',
  name: 'Default Synth',
  oscillatorType: 'sawtooth',
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.5 },
  filter: { type: 'lowpass', cutoff: 3000, resonance: 5 },
  lfo: { rate: 2, depth: 0.3, target: 'pitch' },
  effects: { reverb: 0.2, delay: 0.1, delayTime: 0.3, distortion: 0 },
  octave: 4,
  detune: 0,
};

const DEFAULT_TRACKS: Track[] = [
  { id: 't1', name: 'ドラムス', type: 'sample', color: '#ef4444', volume: 0.8, pan: 0, muted: false, soloed: false, clips: [] },
  { id: 't2', name: 'ベース', type: 'midi', color: '#f97316', volume: 0.8, pan: 0, muted: false, soloed: false, clips: [] },
  { id: 't3', name: 'シンセ', type: 'midi', color: '#a78bfa', volume: 0.8, pan: 0, muted: false, soloed: false, clips: [] },
  { id: 't4', name: 'オーディオ', type: 'audio', color: '#22d3ee', volume: 0.8, pan: 0, muted: false, soloed: false, clips: [] },
];

const INITIAL_STATE: AppState = {
  activeTab: 'daw',
  tracks: DEFAULT_TRACKS,
  transport: {
    bpm: 120,
    timeSignatureNum: 4,
    timeSignatureDen: 4,
    isPlaying: false,
    isRecording: false,
    isLooping: false,
    currentBeat: 0,
    loopStart: 0,
    loopEnd: 16,
    metronomeEnabled: false,
  },
  samples: [],
  selectedTrackId: null,
  selectedClipId: null,
  pianoRollClipId: null,
  synthPreset: DEFAULT_PRESET,
  savedPresets: [DEFAULT_PRESET],
  pixelsPerBeat: 40,
  scrollLeft: 0,
};

interface Actions {
  setActiveTab: (tab: Tab) => void;
  // Transport
  setTransport: (partial: Partial<TransportState>) => void;
  setBPM: (bpm: number) => void;
  togglePlay: () => void;
  toggleRecord: () => void;
  toggleLoop: () => void;
  toggleMetronome: () => void;
  setCurrentBeat: (beat: number) => void;
  // Tracks
  addTrack: (type: Track['type']) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, partial: Partial<Track>) => void;
  selectTrack: (id: string | null) => void;
  // Clips
  addClip: (trackId: string, clip: Omit<Clip, 'id'>) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, partial: Partial<Clip>) => void;
  selectClip: (id: string | null) => void;
  moveClip: (clipId: string, fromTrackId: string, toTrackId: string, startBeat: number) => void;
  openPianoRoll: (clipId: string | null) => void;
  // MIDI
  addMidiNote: (clipId: string, note: Omit<MidiNote, 'id'>) => void;
  removeMidiNote: (clipId: string, noteId: string) => void;
  // Samples
  setSamples: (samples: Sample[]) => void;
  addSample: (sample: Sample) => void;
  // Synth
  setSynthPreset: (preset: SynthPreset) => void;
  updateSynthPreset: (partial: Partial<SynthPreset>) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  // View
  setPixelsPerBeat: (ppb: number) => void;
  setScrollLeft: (s: number) => void;
}

export const useAppStore = create<AppState & Actions>()(
  immer((set, get) => ({
    ...INITIAL_STATE,

    setActiveTab: (tab) => set(s => { s.activeTab = tab; }),

    // Transport
    setTransport: (partial) => set(s => { Object.assign(s.transport, partial); }),
    setBPM: (bpm) => set(s => { s.transport.bpm = bpm; }),
    togglePlay: () => set(s => { s.transport.isPlaying = !s.transport.isPlaying; }),
    toggleRecord: () => set(s => { s.transport.isRecording = !s.transport.isRecording; }),
    toggleLoop: () => set(s => { s.transport.isLooping = !s.transport.isLooping; }),
    toggleMetronome: () => set(s => { s.transport.metronomeEnabled = !s.transport.metronomeEnabled; }),
    setCurrentBeat: (beat) => set(s => { s.transport.currentBeat = beat; }),

    // Tracks
    addTrack: (type) => set(s => {
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#22d3ee', '#818cf8', '#a78bfa', '#ec4899'];
      const color = colors[s.tracks.length % colors.length];
      const names: Record<Track['type'], string> = { audio: 'オーディオ', midi: 'MIDI', sample: 'サンプル' };
      s.tracks.push({
        id: `t${Date.now()}`,
        name: `${names[type]} ${s.tracks.length + 1}`,
        type, color, volume: 0.8, pan: 0,
        muted: false, soloed: false, clips: [],
      });
    }),
    removeTrack: (id) => set(s => { s.tracks = s.tracks.filter(t => t.id !== id); }),
    updateTrack: (id, partial) => set(s => {
      const t = s.tracks.find(t => t.id === id);
      if (t) Object.assign(t, partial);
    }),
    selectTrack: (id) => set(s => { s.selectedTrackId = id; }),

    // Clips
    addClip: (trackId, clip) => set(s => {
      const track = s.tracks.find(t => t.id === trackId);
      if (track) track.clips.push({ ...clip, id: `c${Date.now()}${Math.random()}` });
    }),
    removeClip: (trackId, clipId) => set(s => {
      const track = s.tracks.find(t => t.id === trackId);
      if (track) track.clips = track.clips.filter(c => c.id !== clipId);
    }),
    updateClip: (trackId, clipId, partial) => set(s => {
      const track = s.tracks.find(t => t.id === trackId);
      const clip = track?.clips.find(c => c.id === clipId);
      if (clip) Object.assign(clip, partial);
    }),
    selectClip: (id) => set(s => { s.selectedClipId = id; }),
    moveClip: (clipId, fromTrackId, toTrackId, startBeat) => set(s => {
      const from = s.tracks.find(t => t.id === fromTrackId);
      const clipIdx = from?.clips.findIndex(c => c.id === clipId) ?? -1;
      if (!from || clipIdx === -1) return;
      const [clip] = from.clips.splice(clipIdx, 1);
      clip.startBeat = startBeat;
      clip.trackId = toTrackId;
      const to = s.tracks.find(t => t.id === toTrackId);
      if (to) to.clips.push(clip);
    }),
    openPianoRoll: (clipId) => set(s => { s.pianoRollClipId = clipId; }),

    // MIDI
    addMidiNote: (clipId, note) => set(s => {
      for (const track of s.tracks) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) {
          if (!clip.midiNotes) clip.midiNotes = [];
          clip.midiNotes.push({ ...note, id: `n${Date.now()}${Math.random()}` });
          break;
        }
      }
    }),
    removeMidiNote: (clipId, noteId) => set(s => {
      for (const track of s.tracks) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip?.midiNotes) {
          clip.midiNotes = clip.midiNotes.filter(n => n.id !== noteId);
          break;
        }
      }
    }),

    // Samples
    setSamples: (samples) => set(s => { s.samples = samples; }),
    addSample: (sample) => set(s => { s.samples.push(sample); }),

    // Synth
    setSynthPreset: (preset) => set(s => { s.synthPreset = preset; }),
    updateSynthPreset: (partial) => set(s => { Object.assign(s.synthPreset, partial); }),
    savePreset: (name) => set(s => {
      const preset: SynthPreset = {
        ...s.synthPreset,
        id: `p${Date.now()}`,
        name,
      };
      s.savedPresets.push(preset);
      s.synthPreset = preset;
    }),
    loadPreset: (id) => set(s => {
      const p = s.savedPresets.find(p => p.id === id);
      if (p) s.synthPreset = { ...p };
    }),
    deletePreset: (id) => set(s => {
      s.savedPresets = s.savedPresets.filter(p => p.id !== id);
    }),

    // View
    setPixelsPerBeat: (ppb) => set(s => { s.pixelsPerBeat = ppb; }),
    setScrollLeft: (sl) => set(s => { s.scrollLeft = sl; }),
  }))
);
