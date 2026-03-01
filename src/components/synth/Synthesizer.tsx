'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { OscillatorType, FilterType, LFOTarget } from '@/types';
import { getAudioContext, SynthEngine, drawSpectrum, drawOscilloscope } from '@/lib/audioEngine';
import Knob from '@/components/ui/Knob';
import { Save, Trash2, ChevronDown } from 'lucide-react';

// ---- Keyboard mapping ----
const KEY_NOTE_MAP: Record<string, number> = {
  'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65,
  't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71,
  'k': 72, 'o': 73, 'l': 74, 'p': 75, ';': 76,
};

const PIANO_KEYS = [
  { note: 0, name: 'C', black: false },
  { note: 1, name: 'C#', black: true },
  { note: 2, name: 'D', black: false },
  { note: 3, name: 'D#', black: true },
  { note: 4, name: 'E', black: false },
  { note: 5, name: 'F', black: false },
  { note: 6, name: 'F#', black: true },
  { note: 7, name: 'G', black: false },
  { note: 8, name: 'G#', black: true },
  { note: 9, name: 'A', black: false },
  { note: 10, name: 'A#', black: true },
  { note: 11, name: 'B', black: false },
];

let synthEngine: SynthEngine | null = null;

export default function Synthesizer() {
  const { synthPreset, updateSynthPreset, savedPresets, savePreset, loadPreset, deletePreset } = useAppStore();
  const { oscillatorType, envelope, filter, lfo, effects, octave, detune } = synthPreset;

  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const oscCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const pressedKeys = useRef<Set<string>>(new Set());
  const pressedNotes = useRef<Set<number>>(new Set());
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [analyserMode, setAnalyserMode] = useState<'spectrum' | 'oscilloscope'>('spectrum');
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // Initialize engine
  useEffect(() => {
    const ctx = getAudioContext();
    if (!synthEngine) synthEngine = new SynthEngine(ctx);

    // Start animation loop
    const animate = () => {
      if (!synthEngine) return;
      const analyser = synthEngine.getAnalyser();
      if (spectrumCanvasRef.current && analyserMode === 'spectrum') {
        drawSpectrum(spectrumCanvasRef.current, analyser);
      }
      if (oscCanvasRef.current && analyserMode === 'oscilloscope') {
        drawOscilloscope(oscCanvasRef.current, analyser);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [analyserMode]);

  const noteOn = useCallback((midiNote: number) => {
    if (!synthEngine) return;
    const ctx = getAudioContext();
    if (!synthEngine) synthEngine = new SynthEngine(ctx);
    synthEngine.noteOn(midiNote, 100, synthPreset);
    setActiveNotes(prev => new Set([...prev, midiNote]));
    pressedNotes.current.add(midiNote);
  }, [synthPreset]);

  const noteOff = useCallback((midiNote: number) => {
    if (!synthEngine) return;
    synthEngine.noteOff(midiNote, synthPreset.envelope);
    setActiveNotes(prev => { const s = new Set(prev); s.delete(midiNote); return s; });
    pressedNotes.current.delete(midiNote);
  }, [synthPreset.envelope]);

  // Computer keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const key = e.key.toLowerCase();
      if (KEY_NOTE_MAP[key] !== undefined && !pressedKeys.current.has(key)) {
        pressedKeys.current.add(key);
        const midiNote = KEY_NOTE_MAP[key] + (octave - 4) * 12;
        noteOn(midiNote);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (KEY_NOTE_MAP[key] !== undefined) {
        pressedKeys.current.delete(key);
        const midiNote = KEY_NOTE_MAP[key] + (octave - 4) * 12;
        noteOff(midiNote);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [octave, noteOn, noteOff]);

  const OSC_TYPES: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];
  const OSC_LABELS: Record<OscillatorType, string> = {
    sine: 'サイン', square: '矩形波', sawtooth: 'ノコギリ', triangle: '三角波',
  };
  const OSC_ICONS: Record<OscillatorType, string> = {
    sine: '∿', square: '⊓', sawtooth: '⋀', triangle: '∧',
  };

  const FILTER_TYPES: FilterType[] = ['lowpass', 'highpass', 'bandpass'];
  const FILTER_LABELS: Record<FilterType, string> = {
    lowpass: 'ローパス', highpass: 'ハイパス', bandpass: 'バンドパス',
  };
  const LFO_TARGETS: LFOTarget[] = ['pitch', 'filter', 'amp'];
  const LFO_TARGET_LABELS: Record<LFOTarget, string> = {
    pitch: 'ピッチ', filter: 'フィルター', amp: 'アンプ',
  };

  const section = 'bg-gray-900 border border-gray-700 rounded-xl p-4';
  const sectionTitle = 'text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5';

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-auto">
      {/* Analyser */}
      <div className="bg-black border-b border-gray-800 relative" style={{ height: 80 }}>
        <canvas
          ref={spectrumCanvasRef}
          width={800} height={80}
          className={`w-full h-full absolute inset-0 ${analyserMode === 'spectrum' ? '' : 'hidden'}`}
        />
        <canvas
          ref={oscCanvasRef}
          width={800} height={80}
          className={`w-full h-full absolute inset-0 ${analyserMode === 'oscilloscope' ? '' : 'hidden'}`}
        />
        <div className="absolute top-2 right-2 flex gap-1">
          {(['spectrum', 'oscilloscope'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setAnalyserMode(mode)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                analyserMode === mode
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {mode === 'spectrum' ? 'スペクトル' : 'オシロ'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Preset bar */}
        <div className="flex items-center gap-2">
          <select
            value={synthPreset.id}
            onChange={e => loadPreset(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
          >
            {savedPresets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setPresetName(synthPreset.name); setSaveModalOpen(true); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg transition-colors"
          >
            <Save size={12} />
            保存
          </button>
          {synthPreset.id !== 'default' && (
            <button
              onClick={() => deletePreset(synthPreset.id)}
              className="p-1.5 text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-500 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Oscillator */}
          <div className={section}>
            <div className={sectionTitle}>
              <span>〜</span> オシレーター
            </div>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {OSC_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => updateSynthPreset({ oscillatorType: type })}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-all ${
                    oscillatorType === type
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className="text-lg font-mono">{OSC_ICONS[type]}</span>
                  <span className="text-[10px]">{OSC_LABELS[type]}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <Knob
                value={octave}
                min={1} max={7}
                onChange={v => updateSynthPreset({ octave: Math.round(v) })}
                label={`オクターブ ${octave}`}
                color="#a78bfa"
              />
              <Knob
                value={detune}
                min={-100} max={100}
                onChange={v => updateSynthPreset({ detune: v })}
                label={`デチューン ${Math.round(detune)}`}
                color="#60a5fa"
              />
            </div>
          </div>

          {/* ADSR Envelope */}
          <div className={section}>
            <div className={sectionTitle}>
              <span>⊿</span> エンベロープ (ADSR)
            </div>
            <div className="flex gap-3 justify-center">
              {[
                { key: 'attack', label: 'A アタック', min: 0.001, max: 2, color: '#34d399' },
                { key: 'decay', label: 'D ディケイ', min: 0.01, max: 2, color: '#60a5fa' },
                { key: 'sustain', label: 'S サスティン', min: 0, max: 1, color: '#f59e0b' },
                { key: 'release', label: 'R リリース', min: 0.01, max: 5, color: '#f87171' },
              ].map(param => (
                <div key={param.key} className="flex flex-col items-center gap-1">
                  <Knob
                    value={(envelope as any)[param.key]}
                    min={param.min} max={param.max}
                    onChange={v => updateSynthPreset({ envelope: { ...envelope, [param.key]: v } })}
                    label={`${((envelope as any)[param.key]).toFixed(2)}`}
                    color={param.color}
                    size={40}
                  />
                  <span className="text-[9px] text-gray-500">{param.label}</span>
                </div>
              ))}
            </div>
            {/* Visual ADSR */}
            <ADSRDisplay envelope={envelope} />
          </div>

          {/* Filter */}
          <div className={section}>
            <div className={sectionTitle}>
              <span>⌇</span> フィルター
            </div>
            <div className="flex gap-1 mb-3">
              {FILTER_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => updateSynthPreset({ filter: { ...filter, type } })}
                  className={`flex-1 py-1 rounded text-xs transition-all border ${
                    filter.type === type
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                      : 'border-gray-700 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {FILTER_LABELS[type]}
                </button>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <Knob
                value={filter.cutoff}
                min={20} max={20000}
                onChange={v => updateSynthPreset({ filter: { ...filter, cutoff: v } })}
                label={`${filter.cutoff >= 1000 ? (filter.cutoff / 1000).toFixed(1) + 'kHz' : Math.round(filter.cutoff) + 'Hz'}`}
                color="#22d3ee"
                logarithmic
              />
              <Knob
                value={filter.resonance}
                min={0} max={30}
                onChange={v => updateSynthPreset({ filter: { ...filter, resonance: v } })}
                label={`Q: ${filter.resonance.toFixed(1)}`}
                color="#f97316"
              />
            </div>
          </div>

          {/* LFO */}
          <div className={section}>
            <div className={sectionTitle}>
              <span>∿</span> LFO
            </div>
            <div className="flex gap-1 mb-3">
              {LFO_TARGETS.map(target => (
                <button
                  key={target}
                  onClick={() => updateSynthPreset({ lfo: { ...lfo, target } })}
                  className={`flex-1 py-1 rounded text-xs transition-all border ${
                    lfo.target === target
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-gray-700 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {LFO_TARGET_LABELS[target]}
                </button>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <Knob
                value={lfo.rate}
                min={0.1} max={20}
                onChange={v => updateSynthPreset({ lfo: { ...lfo, rate: v } })}
                label={`${lfo.rate.toFixed(1)}Hz`}
                color="#fbbf24"
              />
              <Knob
                value={lfo.depth}
                min={0} max={1}
                onChange={v => updateSynthPreset({ lfo: { ...lfo, depth: v } })}
                label={`デプス ${(lfo.depth * 100).toFixed(0)}%`}
                color="#fb923c"
              />
            </div>
          </div>

          {/* Effects */}
          <div className={section}>
            <div className={sectionTitle}>
              <span>✦</span> エフェクト
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <Knob
                value={effects.reverb}
                min={0} max={1}
                onChange={v => updateSynthPreset({ effects: { ...effects, reverb: v } })}
                label={`リバーブ ${(effects.reverb * 100).toFixed(0)}%`}
                color="#818cf8"
                size={40}
              />
              <Knob
                value={effects.delay}
                min={0} max={1}
                onChange={v => updateSynthPreset({ effects: { ...effects, delay: v } })}
                label={`ディレイ ${(effects.delay * 100).toFixed(0)}%`}
                color="#60a5fa"
                size={40}
              />
              <Knob
                value={effects.delayTime}
                min={0.05} max={1}
                onChange={v => updateSynthPreset({ effects: { ...effects, delayTime: v } })}
                label={`遅延 ${effects.delayTime.toFixed(2)}s`}
                color="#38bdf8"
                size={40}
              />
              <Knob
                value={effects.distortion}
                min={0} max={1}
                onChange={v => updateSynthPreset({ effects: { ...effects, distortion: v } })}
                label={`歪み ${(effects.distortion * 100).toFixed(0)}%`}
                color="#f87171"
                size={40}
              />
            </div>
          </div>
        </div>

        {/* Piano keyboard */}
        <PianoKeyboard octave={octave} activeNotes={activeNotes} onNoteOn={noteOn} onNoteOff={noteOff} />

        <div className="text-center text-xs text-gray-600 pb-2">
          キーボード: A-L でノートを演奏 / W,E,T,Y,U,O,P で黒鍵
        </div>
      </div>

      {/* Save preset modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80">
            <h3 className="text-white font-semibold mb-4">プリセットを保存</h3>
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="プリセット名"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 mb-4"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') { savePreset(presetName); setSaveModalOpen(false); }
                if (e.key === 'Escape') setSaveModalOpen(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={() => { if (presetName) { savePreset(presetName); setSaveModalOpen(false); } }}
                className="flex-1 py-2 text-sm text-white bg-violet-600 hover:bg-violet-500 rounded-lg"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- ADSR Visual ----
function ADSRDisplay({ envelope }: { envelope: { attack: number; decay: number; sustain: number; release: number } }) {
  const w = 200, h = 40;
  const pad = 5;
  const aEnd = pad + (envelope.attack / 4) * (w - pad * 3);
  const dEnd = aEnd + (envelope.decay / 4) * (w - pad * 3);
  const sY = h - pad - envelope.sustain * (h - pad * 2);
  const rEnd = w - pad;

  const path = `M ${pad},${h - pad} L ${aEnd},${pad} L ${dEnd},${sY} L ${dEnd + (w - pad * 2) * 0.3},${sY} L ${rEnd},${h - pad}`;

  return (
    <svg width={w} height={h} className="mt-2 mx-auto">
      <path d={path} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinejoin="round" />
      <path d={`${path} L ${pad},${h - pad}`} fill="#a78bfa22" />
    </svg>
  );
}

// ---- Piano Keyboard ----
function PianoKeyboard({
  octave, activeNotes, onNoteOn, onNoteOff,
}: {
  octave: number;
  activeNotes: Set<number>;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
}) {
  const octaves = [octave, octave + 1];
  const whiteKeys = PIANO_KEYS.filter(k => !k.black);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
        <span>🎹</span> ピアノキーボード (オクターブ {octave}–{octave + 1})
      </div>
      <div className="relative flex select-none" style={{ height: 100 }}>
        {octaves.flatMap((oct, oi) =>
          PIANO_KEYS.map(key => {
            const midi = (oct + 1) * 12 + key.note;
            const isActive = activeNotes.has(midi);

            if (key.black) {
              // Find position after previous white key
              const whiteIndex = oi * 7 + whiteKeys.findIndex(
                (_, wi) => PIANO_KEYS.filter(k => !k.black).indexOf(PIANO_KEYS.filter(k => !k.black)[wi]) >= 0 &&
                PIANO_KEYS.indexOf(key) > PIANO_KEYS.indexOf(PIANO_KEYS.filter(k => !k.black)[wi])
              );
              return null; // handle below
            }
            return null;
          })
        )}
        {/* Render all white keys first, then black keys on top */}
        {[0, 1].map(oi => {
          const oct = octaves[oi];
          return whiteKeys.map((key, wi) => {
            const midi = (oct + 1) * 12 + key.note;
            const isActive = activeNotes.has(midi);
            const totalWhite = 7;
            const xPct = ((oi * totalWhite + wi) / (octaves.length * totalWhite)) * 100;

            return (
              <div
                key={`w-${oct}-${key.note}`}
                className={`absolute bottom-0 border border-gray-400 rounded-b-md cursor-pointer transition-colors select-none ${
                  isActive ? 'bg-violet-400' : 'bg-gray-100 hover:bg-gray-200 active:bg-violet-300'
                }`}
                style={{
                  left: `${xPct}%`,
                  width: `${100 / (octaves.length * 7)}%`,
                  height: '100%',
                  zIndex: 1,
                }}
                onMouseDown={() => onNoteOn(midi)}
                onMouseUp={() => onNoteOff(midi)}
                onMouseLeave={() => { if (activeNotes.has(midi)) onNoteOff(midi); }}
              >
                <div className="absolute bottom-1 w-full text-center text-[8px] text-gray-400">
                  {key.name}{oct - 1}
                </div>
              </div>
            );
          });
        })}
        {/* Black keys */}
        {[0, 1].map(oi => {
          const oct = octaves[oi];
          const blackOffsets = [1, 2, 4, 5, 6]; // white key indices before each black key
          return [
            { note: 1, wBefore: 0 },
            { note: 3, wBefore: 1 },
            { note: 6, wBefore: 3 },
            { note: 8, wBefore: 4 },
            { note: 10, wBefore: 5 },
          ].map(({ note, wBefore }) => {
            const midi = (oct + 1) * 12 + note;
            const isActive = activeNotes.has(midi);
            const totalWhite = 7;
            const xPct = ((oi * totalWhite + wBefore + 0.6) / (octaves.length * totalWhite)) * 100;

            return (
              <div
                key={`b-${oct}-${note}`}
                className={`absolute top-0 border border-gray-900 rounded-b-md cursor-pointer transition-colors select-none ${
                  isActive ? 'bg-violet-500' : 'bg-gray-900 hover:bg-gray-800 active:bg-violet-600'
                }`}
                style={{
                  left: `${xPct}%`,
                  width: `${60 / (octaves.length * 7)}%`,
                  height: '60%',
                  zIndex: 10,
                }}
                onMouseDown={e => { e.stopPropagation(); onNoteOn(midi); }}
                onMouseUp={e => { e.stopPropagation(); onNoteOff(midi); }}
                onMouseLeave={() => { if (activeNotes.has(midi)) onNoteOff(midi); }}
              />
            );
          });
        })}
      </div>
    </div>
  );
}
