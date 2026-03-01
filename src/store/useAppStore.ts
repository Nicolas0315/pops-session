'use client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  AppState, Track, Clip, TransportState, Sample,
  SynthPreset, MidiNote, Tab,
} from '@/types';
import { DEFAULT_PRESET, ALL_PRESETS } from '@/lib/presets';

const DEFAULT_TRACKS: Track[] = [
  { id: 't1', name: 'ドラムス',   type: 'sample', color: '#ef4444', volume: 0.82, pan: 0, muted: false, soloed: false, clips: [] },
  { id: 't2', name: 'ベース',     type: 'midi',   color: '#f97316', volume: 0.80, pan: 0, muted: false, soloed: false, clips: [] },
  { id: 't3', name: 'シンセ',     type: 'midi',   color: '#a78bfa', volume: 0.78, pan: 0, muted: false, soloed: false, clips: [] },
  { id: 't4', name: 'オーディオ', type: 'audio',  color: '#22d3ee', volume: 0.75, pan: 0, muted: false, soloed: false, clips: [] },
];

const INITIAL_STATE: AppState = {
  activeTab: 'daw',
  tracks: DEFAULT_TRACKS,
  transport: {
    bpm: 128,
    timeSignatureNum: 4,
    timeSignatureDen: 4,
    isPlaying:   false,
    isRecording: false,
    isLooping:   false,
    currentBeat: 0,
    loopStart:   0,
    loopEnd:     16,
    metronomeEnabled: false,
  },
  samples:         [],
  selectedTrackId: null,
  selectedClipId:  null,
  pianoRollClipId: null,
  synthPreset:     DEFAULT_PRESET,
  savedPresets:    ALL_PRESETS,
  pixelsPerBeat:   40,
  scrollLeft:      0,
};

interface Actions {
  setActiveTab: (tab: Tab) => void;
  // Transport
  setTransport: (partial: Partial<TransportState>) => void;
  setBPM:             (bpm: number) => void;
  togglePlay:         () => void;
  toggleRecord:       () => void;
  toggleLoop:         () => void;
  toggleMetronome:    () => void;
  setCurrentBeat:     (beat: number) => void;
  // Tracks
  addTrack:   (type: Track['type']) => void;
  removeTrack:(id: string) => void;
  updateTrack:(id: string, partial: Partial<Track>) => void;
  selectTrack:(id: string | null) => void;
  // Clips
  addClip:    (trackId: string, clip: Omit<Clip, 'id'>) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, partial: Partial<Clip>) => void;
  selectClip: (id: string | null) => void;
  moveClip:   (clipId: string, fromTrackId: string, toTrackId: string, startBeat: number) => void;
  openPianoRoll:(clipId: string | null) => void;
  // MIDI
  addMidiNote:   (clipId: string, note: Omit<MidiNote, 'id'>) => void;
  removeMidiNote:(clipId: string, noteId: string) => void;
  // Samples
  setSamples:(samples: Sample[]) => void;
  addSample: (sample: Sample) => void;
  // Synth
  setSynthPreset:    (preset: SynthPreset) => void;
  updateSynthPreset: (partial: Partial<SynthPreset>) => void;
  savePreset:  (name: string) => void;
  loadPreset:  (id: string) => void;
  deletePreset:(id: string) => void;
  // View
  setPixelsPerBeat:(ppb: number) => void;
  setScrollLeft:   (s: number) => void;
}

export const useAppStore = create<AppState & Actions>()(
  immer((set) => ({
    ...INITIAL_STATE,

    setActiveTab: (tab) => set(s => { s.activeTab = tab; }),

    // ── Transport ──────────────────────────────────────────
    setTransport:    (p)    => set(s => { Object.assign(s.transport, p); }),
    setBPM:          (bpm)  => set(s => { s.transport.bpm = bpm; }),
    togglePlay:      ()     => set(s => { s.transport.isPlaying   = !s.transport.isPlaying; }),
    toggleRecord:    ()     => set(s => { s.transport.isRecording = !s.transport.isRecording; }),
    toggleLoop:      ()     => set(s => { s.transport.isLooping   = !s.transport.isLooping; }),
    toggleMetronome: ()     => set(s => { s.transport.metronomeEnabled = !s.transport.metronomeEnabled; }),
    setCurrentBeat:  (beat) => set(s => { s.transport.currentBeat = beat; }),

    // ── Tracks ────────────────────────────────────────────
    addTrack: (type) => set(s => {
      const palette = ['#ef4444','#f97316','#eab308','#22c55e','#22d3ee','#818cf8','#a78bfa','#ec4899','#14b8a6','#f43f5e'];
      const color   = palette[s.tracks.length % palette.length];
      const label:  Record<Track['type'], string> = { audio: 'オーディオ', midi: 'MIDI', sample: 'サンプル' };
      s.tracks.push({
        id: `t${Date.now()}`, name: `${label[type]} ${s.tracks.length + 1}`,
        type, color, volume: 0.8, pan: 0, muted: false, soloed: false, clips: [],
      });
    }),
    removeTrack: (id) => set(s => { s.tracks = s.tracks.filter(t => t.id !== id); }),
    updateTrack: (id, p) => set(s => {
      const t = s.tracks.find(t => t.id === id);
      if (t) Object.assign(t, p);
    }),
    selectTrack: (id) => set(s => { s.selectedTrackId = id; }),

    // ── Clips ─────────────────────────────────────────────
    addClip: (trackId, clip) => set(s => {
      const t = s.tracks.find(t => t.id === trackId);
      if (t) t.clips.push({ ...clip, id: `c${Date.now()}${Math.random().toString(36).slice(2)}` });
    }),
    removeClip: (trackId, clipId) => set(s => {
      const t = s.tracks.find(t => t.id === trackId);
      if (t) t.clips = t.clips.filter(c => c.id !== clipId);
    }),
    updateClip: (trackId, clipId, p) => set(s => {
      const c = s.tracks.find(t => t.id === trackId)?.clips.find(c => c.id === clipId);
      if (c) Object.assign(c, p);
    }),
    selectClip: (id) => set(s => { s.selectedClipId = id; }),
    moveClip: (clipId, fromId, toId, startBeat) => set(s => {
      const from = s.tracks.find(t => t.id === fromId);
      const idx  = from?.clips.findIndex(c => c.id === clipId) ?? -1;
      if (!from || idx === -1) return;
      const [clip] = from.clips.splice(idx, 1);
      clip.startBeat = startBeat; clip.trackId = toId;
      s.tracks.find(t => t.id === toId)?.clips.push(clip);
    }),
    openPianoRoll: (clipId) => set(s => { s.pianoRollClipId = clipId; }),

    // ── MIDI ──────────────────────────────────────────────
    addMidiNote: (clipId, note) => set(s => {
      for (const track of s.tracks) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) {
          if (!clip.midiNotes) clip.midiNotes = [];
          clip.midiNotes.push({ ...note, id: `n${Date.now()}${Math.random().toString(36).slice(2)}` });
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

    // ── Samples ───────────────────────────────────────────
    setSamples: (samples) => set(s => { s.samples = samples; }),
    addSample:  (sample)  => set(s => { s.samples.push(sample); }),

    // ── Synth ─────────────────────────────────────────────
    setSynthPreset:    (preset) => set(s => { s.synthPreset = preset; }),
    updateSynthPreset: (p)      => set(s => { Object.assign(s.synthPreset, p); }),
    savePreset: (name) => set(s => {
      const p: SynthPreset = { ...s.synthPreset, id: `user-${Date.now()}`, name };
      s.savedPresets.push(p);
      s.synthPreset = p;
    }),
    loadPreset: (id) => set(s => {
      const p = s.savedPresets.find(p => p.id === id);
      if (p) s.synthPreset = { ...p };
    }),
    deletePreset: (id) => set(s => {
      if (!id.startsWith('preset-') && id !== 'default') {
        s.savedPresets = s.savedPresets.filter(p => p.id !== id);
      }
    }),

    // ── View ──────────────────────────────────────────────
    setPixelsPerBeat: (ppb) => set(s => { s.pixelsPerBeat = ppb; }),
    setScrollLeft:    (sl)  => set(s => { s.scrollLeft = sl; }),
  }))
);
