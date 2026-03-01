'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { OscillatorType, FilterType, LFOTarget } from '@/types';
import { getAudioContext, SynthEngine, drawSpectrum, drawOscilloscope } from '@/lib/audioEngine';
import Knob from '@/components/ui/Knob';
import { Save, Trash2, Zap } from 'lucide-react';

/* ─── Computer keyboard → MIDI ─── */
const KEY_MIDI: Record<string, number> = {
  z:48, s:49, x:50, d:51, c:52, v:53, g:54, b:55, h:56, n:57, j:58, m:59,
  ',':60, 'l':61, '.':62, ';':63, '/':64,
  q:60, '2':61, w:62, '3':63, e:64, r:65, '5':66, t:67, '6':68, y:69, '7':70, u:71,
  i:72, '9':73, o:74, '0':75, p:76,
};

/* ─── Piano key layout ─── */
const OCTAVE_KEYS = [
  { semi: 0, black: false, name: 'C' },
  { semi: 1, black: true,  name: 'C#' },
  { semi: 2, black: false, name: 'D' },
  { semi: 3, black: true,  name: 'D#' },
  { semi: 4, black: false, name: 'E' },
  { semi: 5, black: false, name: 'F' },
  { semi: 6, black: true,  name: 'F#' },
  { semi: 7, black: false, name: 'G' },
  { semi: 8, black: true,  name: 'G#' },
  { semi: 9, black: false, name: 'A' },
  { semi: 10, black: true, name: 'A#' },
  { semi: 11, black: false, name: 'B' },
];
const WHITE_KEYS = OCTAVE_KEYS.filter(k => !k.black);
const BLACK_KEYS = OCTAVE_KEYS.filter(k =>  k.black);

// Map semitone → position among white keys (left neighbour index)
const BLACK_POS: Record<number, number> = { 1:0, 3:1, 6:3, 8:4, 10:5 };

let _engine: SynthEngine | null = null;

export default function Synthesizer() {
  const { synthPreset, updateSynthPreset, savedPresets, savePreset, loadPreset, deletePreset } = useAppStore();
  const { oscillatorType, envelope, filter, lfo, effects, octave, detune } = synthPreset;

  const specRef  = useRef<HTMLCanvasElement>(null);
  const oscRef   = useRef<HTMLCanvasElement>(null);
  const rafRef   = useRef<number>(0);
  const held     = useRef<Set<string>>(new Set());

  const [analyserMode, setAnalyserMode] = useState<'spectrum'|'oscilloscope'>('spectrum');
  const [activeNotes,  setActiveNotes]  = useState<Set<number>>(new Set());
  const [showSave,     setShowSave]     = useState(false);
  const [presetName,   setPresetName]   = useState('');

  /* ── Init engine + animation loop ── */
  useEffect(() => {
    const ctx = getAudioContext();
    if (!_engine) _engine = new SynthEngine(ctx);

    const draw = () => {
      const a = _engine!.getAnalyser();
      if (analyserMode === 'spectrum'     && specRef.current) drawSpectrum(specRef.current, a);
      if (analyserMode === 'oscilloscope' && oscRef.current)  drawOscilloscope(oscRef.current, a);
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserMode]);

  /* ── Note on/off ── */
  const noteOn = useCallback((midi: number) => {
    if (!_engine) return;
    _engine.noteOn(midi, 100, synthPreset);
    setActiveNotes(prev => new Set([...prev, midi]));
  }, [synthPreset]);

  const noteOff = useCallback((midi: number) => {
    if (!_engine) return;
    _engine.noteOff(midi, synthPreset.envelope);
    setActiveNotes(prev => { const s = new Set(prev); s.delete(midi); return s; });
  }, [synthPreset.envelope]);

  /* ── Computer keyboard ── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (KEY_MIDI[k] !== undefined && !held.current.has(k)) {
        held.current.add(k);
        noteOn(KEY_MIDI[k] + (octave - 4) * 12);
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (KEY_MIDI[k] !== undefined) {
        held.current.delete(k);
        noteOff(KEY_MIDI[k] + (octave - 4) * 12);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [octave, noteOn, noteOff]);

  const OSC_TYPES: OscillatorType[] = ['sine','square','sawtooth','triangle'];
  const OSC_META: Record<OscillatorType, { label: string; path: string }> = {
    sine:     { label: 'サイン',   path: 'M0,12 Q4,2 8,12 Q12,22 16,12' },
    square:   { label: '矩形波',   path: 'M0,4 L0,4 L8,4 L8,20 L16,20 L16,4' },
    sawtooth: { label: 'ノコギリ', path: 'M0,20 L8,4 L8,20 L16,4' },
    triangle: { label: '三角波',   path: 'M0,20 L8,4 L16,20' },
  };

  const FILTER_TYPES: FilterType[] = ['lowpass','highpass','bandpass'];
  const FILTER_LABELS: Record<FilterType, string> = { lowpass:'ローパス', highpass:'ハイパス', bandpass:'バンドパス' };
  const LFO_TARGETS: LFOTarget[] = ['pitch','filter','amp'];
  const LFO_TARGET_LABELS: Record<LFOTarget, string> = { pitch:'ピッチ', filter:'フィルター', amp:'アンプ' };

  const card = 'bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3';
  const cardTitle = 'text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5';
  const segBtn = (active: boolean, activeClass = 'bg-gray-700 text-white border-gray-600') =>
    `flex-1 py-1.5 rounded-lg text-xs border transition-all ${active ? activeClass : 'border-gray-800 text-gray-600 hover:text-gray-300 hover:border-gray-700'}`;

  const OCTAVES = [octave, octave + 1];
  const WHITE_COUNT = OCTAVES.length * WHITE_KEYS.length;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* ── Analyser strip ── */}
      <div className="relative bg-black border-b border-gray-800 flex-shrink-0" style={{ height: 88 }}>
        <canvas ref={specRef} className={`absolute inset-0 w-full h-full ${analyserMode === 'spectrum' ? '' : 'hidden'}`} />
        <canvas ref={oscRef}  className={`absolute inset-0 w-full h-full ${analyserMode === 'oscilloscope' ? '' : 'hidden'}`} />
        <div className="absolute top-2 left-3 flex items-center gap-2">
          <Zap size={14} className="text-violet-400" />
          <span className="text-xs font-bold text-white tracking-wide">シンセサイザー</span>
        </div>
        <div className="absolute top-2 right-3 flex gap-1">
          {(['spectrum','oscilloscope'] as const).map(m => (
            <button key={m} onClick={() => setAnalyserMode(m)}
              className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${analyserMode === m ? 'border-violet-500 bg-violet-500/20 text-violet-300' : 'border-gray-800 text-gray-600 hover:text-gray-400'}`}>
              {m === 'spectrum' ? 'スペクトル' : 'オシロ'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Preset bar */}
        <div className="flex items-center gap-2">
          <select value={synthPreset.id} onChange={e => loadPreset(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600 transition-colors">
            {savedPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => { setPresetName(synthPreset.name); setShowSave(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-xs font-semibold rounded-xl transition-colors">
            <Save size={13} /> 保存
          </button>
          {synthPreset.id !== 'default' && (
            <button onClick={() => deletePreset(synthPreset.id)}
              className="p-2 text-gray-600 hover:text-red-400 border border-gray-800 hover:border-red-500/50 rounded-xl transition-all">
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Parameter grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

          {/* ── Oscillator ── */}
          <div className={card}>
            <div className={cardTitle}>〜 オシレーター</div>
            <div className="grid grid-cols-2 gap-1.5">
              {OSC_TYPES.map(type => (
                <button key={type} onClick={() => updateSynthPreset({ oscillatorType: type })}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                    oscillatorType === type
                      ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                      : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
                  }`}>
                  <svg width={20} height={24} viewBox="0 0 16 24" fill="none">
                    <path d={OSC_META[type].path} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <span className="text-[10px] font-medium">{OSC_META[type].label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 justify-center pt-1">
              <Knob value={octave} min={1} max={7} onChange={v => updateSynthPreset({ octave: Math.round(v) })}
                label={`OCT ${octave}`} color="#a78bfa" />
              <Knob value={detune} min={-100} max={100} onChange={v => updateSynthPreset({ detune: v })}
                label={`デチューン ${Math.round(detune)}`} color="#60a5fa" />
            </div>
          </div>

          {/* ── ADSR ── */}
          <div className={card}>
            <div className={cardTitle}>⊿ エンベロープ ADSR</div>
            <ADSRDisplay envelope={envelope} />
            <div className="flex gap-2 justify-center">
              {[
                { key: 'attack',  label: 'A', min: 0.001, max: 2,   color: '#34d399' },
                { key: 'decay',   label: 'D', min: 0.01,  max: 2,   color: '#60a5fa' },
                { key: 'sustain', label: 'S', min: 0,     max: 1,   color: '#fbbf24' },
                { key: 'release', label: 'R', min: 0.01,  max: 5,   color: '#f87171' },
              ].map(p => (
                <div key={p.key} className="flex flex-col items-center gap-1">
                  <Knob value={(envelope as any)[p.key]} min={p.min} max={p.max}
                    onChange={v => updateSynthPreset({ envelope: { ...envelope, [p.key]: v } })}
                    label={((envelope as any)[p.key]).toFixed(2)}
                    color={p.color} size={38} />
                  <span className="text-[9px] text-gray-600">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Filter ── */}
          <div className={card}>
            <div className={cardTitle}>⌇ フィルター</div>
            <div className="flex gap-1">
              {FILTER_TYPES.map(type => (
                <button key={type} onClick={() => updateSynthPreset({ filter: { ...filter, type } })}
                  className={segBtn(filter.type === type, 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50')}>
                  {FILTER_LABELS[type]}
                </button>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <Knob value={filter.cutoff} min={20} max={20000} logarithmic
                onChange={v => updateSynthPreset({ filter: { ...filter, cutoff: v } })}
                label={filter.cutoff >= 1000 ? `${(filter.cutoff/1000).toFixed(1)}k` : `${Math.round(filter.cutoff)}Hz`}
                color="#22d3ee" />
              <Knob value={filter.resonance} min={0} max={30}
                onChange={v => updateSynthPreset({ filter: { ...filter, resonance: v } })}
                label={`Q ${filter.resonance.toFixed(1)}`} color="#f97316" />
            </div>
          </div>

          {/* ── LFO ── */}
          <div className={card}>
            <div className={cardTitle}>∿ LFO</div>
            <div className="flex gap-1">
              {LFO_TARGETS.map(t => (
                <button key={t} onClick={() => updateSynthPreset({ lfo: { ...lfo, target: t } })}
                  className={segBtn(lfo.target === t, 'bg-amber-500/20 text-amber-300 border-amber-500/50')}>
                  {LFO_TARGET_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <Knob value={lfo.rate} min={0.1} max={20}
                onChange={v => updateSynthPreset({ lfo: { ...lfo, rate: v } })}
                label={`${lfo.rate.toFixed(1)} Hz`} color="#fbbf24" />
              <Knob value={lfo.depth} min={0} max={1}
                onChange={v => updateSynthPreset({ lfo: { ...lfo, depth: v } })}
                label={`${(lfo.depth*100).toFixed(0)}%`} color="#fb923c" />
            </div>
          </div>

          {/* ── Effects ── */}
          <div className={`${card} col-span-2 lg:col-span-2`}>
            <div className={cardTitle}>✦ エフェクト</div>
            <div className="flex gap-4 justify-center flex-wrap">
              {[
                { key: 'reverb',     label: 'リバーブ',   color: '#818cf8', min: 0, max: 1 },
                { key: 'delay',      label: 'ディレイ',   color: '#60a5fa', min: 0, max: 1 },
                { key: 'delayTime',  label: '遅延時間',   color: '#38bdf8', min: 0.05, max: 1 },
                { key: 'distortion', label: 'ディストーション', color: '#f87171', min: 0, max: 1 },
              ].map(p => (
                <div key={p.key} className="flex flex-col items-center gap-0.5">
                  <Knob value={(effects as any)[p.key]} min={p.min} max={p.max}
                    onChange={v => updateSynthPreset({ effects: { ...effects, [p.key]: v } })}
                    label={p.key === 'delayTime' ? `${((effects as any)[p.key]).toFixed(2)}s` : `${((effects as any)[p.key]*100).toFixed(0)}%`}
                    color={p.color} size={46} />
                  <span className="text-[9px] text-gray-600">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Piano keyboard ── */}
        <PianoKeyboard
          octaves={OCTAVES}
          activeNotes={activeNotes}
          onNoteOn={noteOn}
          onNoteOff={noteOff}
        />

        <p className="text-center text-[11px] text-gray-700 pb-2">
          キーボード: Z-/ (下段) | Q-P (上段) 両段で2オクターブ演奏
        </p>
      </div>

      {/* Save preset modal */}
      {showSave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-white font-bold text-sm mb-4">プリセットを保存</h3>
            <input
              autoFocus
              type="text" value={presetName} onChange={e => setPresetName(e.target.value)}
              placeholder="プリセット名を入力..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 mb-4 transition-colors"
              onKeyDown={e => {
                if (e.key === 'Enter' && presetName) { savePreset(presetName); setShowSave(false); }
                if (e.key === 'Escape') setShowSave(false);
              }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSave(false)}
                className="flex-1 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors">
                キャンセル
              </button>
              <button
                onClick={() => { if (presetName) { savePreset(presetName); setShowSave(false); } }}
                disabled={!presetName}
                className="flex-1 py-2.5 text-sm text-white bg-violet-700 hover:bg-violet-600 disabled:opacity-40 rounded-xl transition-colors font-medium">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/*  ADSR Visual Display                        */
/* ─────────────────────────────────────────── */
function ADSRDisplay({ envelope }: { envelope: { attack: number; decay: number; sustain: number; release: number } }) {
  const W = 220, H = 50, PAD = 8;
  const IW = W - PAD * 2;
  const segW = IW / 4;

  const aX  = PAD + (envelope.attack  / 2)  * segW;
  const dX  = aX  + (envelope.decay   / 2)  * segW;
  const sX  = dX  + segW * 0.5;
  const rX  = sX  + (envelope.release / 5)  * segW;

  const topY = PAD;
  const botY = H - PAD;
  const susY = botY - envelope.sustain * (botY - topY);

  const path = `M${PAD},${botY} L${aX},${topY} L${dX},${susY} L${sX},${susY} L${rX},${botY}`;

  return (
    <svg width={W} height={H} className="w-full">
      <defs>
        <linearGradient id="adsrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={`${path} L${PAD},${botY} Z`} fill="url(#adsrGrad)" />
      <path d={path} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Stage dots */}
      {[
        { x: aX, y: topY, label: 'A' },
        { x: dX, y: susY, label: 'D' },
        { x: sX, y: susY, label: 'S' },
        { x: rX, y: botY, label: 'R' },
      ].map(({ x, y, label }) => (
        <g key={label}>
          <circle cx={x} cy={y} r={3} fill="#a78bfa" />
          <text x={x} y={y - 5} textAnchor="middle" fontSize={7} fill="#7c3aed">{label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────── */
/*  Piano Keyboard                             */
/* ─────────────────────────────────────────── */
function PianoKeyboard({
  octaves, activeNotes, onNoteOn, onNoteOff,
}: {
  octaves: number[];
  activeNotes: Set<number>;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
}) {
  const totalWhite = octaves.length * WHITE_KEYS.length;
  const whiteW = `${100 / totalWhite}%`;

  const whiteList: { midi: number; label: string; oi: number; ki: number }[] = [];
  const blackList: { midi: number; oi: number; semi: number }[] = [];

  for (let oi = 0; oi < octaves.length; oi++) {
    const oct = octaves[oi];
    WHITE_KEYS.forEach((k, ki) => {
      whiteList.push({ midi: (oct + 1) * 12 + k.semi, label: `${k.name}${oct - 1}`, oi, ki });
    });
    BLACK_KEYS.forEach(k => {
      blackList.push({ midi: (oct + 1) * 12 + k.semi, oi, semi: k.semi });
    });
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <p className="text-[10px] text-gray-600 mb-3 flex items-center gap-1">
        <span>🎹</span> ピアノキーボード (オクターブ {octaves[0]}–{octaves[octaves.length-1]+1})
      </p>
      <div className="relative" style={{ height: 110, userSelect: 'none' }}>
        {/* White keys */}
        {whiteList.map(({ midi, label, oi, ki }) => {
          const active = activeNotes.has(midi);
          const xPct   = ((oi * WHITE_KEYS.length + ki) / totalWhite) * 100;
          return (
            <div
              key={midi}
              className={`piano-key absolute bottom-0 rounded-b-lg border transition-colors
                ${active
                  ? 'bg-violet-400 border-violet-300'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-400'
                }`}
              style={{ left: `${xPct}%`, width: whiteW, height: '100%', zIndex: 1 }}
              onMouseDown={e => { e.preventDefault(); onNoteOn(midi); }}
              onMouseUp={()  => onNoteOff(midi)}
              onMouseLeave={() => { if (activeNotes.has(midi)) onNoteOff(midi); }}
            >
              <span className="absolute bottom-1 left-0 right-0 text-center text-[8px] text-gray-400 select-none">
                {label}
              </span>
            </div>
          );
        })}

        {/* Black keys */}
        {blackList.map(({ midi, oi, semi }) => {
          const active   = activeNotes.has(midi);
          const wBefore  = BLACK_POS[semi]; // white key index within octave
          const globalWi = oi * WHITE_KEYS.length + wBefore;
          const xPct     = ((globalWi + 0.6) / totalWhite) * 100;
          const wPct     = (0.65 / totalWhite) * 100;

          return (
            <div
              key={midi}
              className={`piano-key absolute top-0 rounded-b-md border-x border-b transition-colors
                ${active
                  ? 'bg-violet-600 border-violet-500'
                  : 'bg-gray-950 hover:bg-gray-800 border-gray-700'
                }`}
              style={{ left: `${xPct}%`, width: `${wPct}%`, height: '62%', zIndex: 10 }}
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onNoteOn(midi); }}
              onMouseUp={e  => { e.stopPropagation(); onNoteOff(midi); }}
              onMouseLeave={() => { if (activeNotes.has(midi)) onNoteOff(midi); }}
            />
          );
        })}
      </div>
    </div>
  );
}
