'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { OscillatorType, FilterType, LFOTarget } from '@/types';
import { getAudioContext, SynthEngine, drawSpectrum, drawOscilloscope } from '@/lib/audioEngine';
import Knob from '@/components/ui/Knob';
import { Save, Trash2, Zap, ChevronDown } from 'lucide-react';

// ─── Computer keyboard → MIDI note map ──────────────────
// Lower row (Z–/) = octave 4, Upper row (Q–P) = octave 5
const KEY_MIDI: Record<string, number> = {
  z:48, s:49, x:50, d:51, c:52, v:53, g:54, b:55, h:56, n:57, j:58, m:59,
  ',':60, 'l':61, '.':62, ';':63, '/':64,
  q:60, '2':61, w:62, '3':63, e:64, r:65, '5':66, t:67, '6':68, y:69, '7':70, u:71,
  i:72, '9':73, o:74, '0':75, p:76,
};

// ─── Piano geometry ──────────────────────────────────────
const OCTAVE_DEF = [
  { semi:0,  black:false, name:'C'  },
  { semi:1,  black:true,  name:'C#' },
  { semi:2,  black:false, name:'D'  },
  { semi:3,  black:true,  name:'D#' },
  { semi:4,  black:false, name:'E'  },
  { semi:5,  black:false, name:'F'  },
  { semi:6,  black:true,  name:'F#' },
  { semi:7,  black:false, name:'G'  },
  { semi:8,  black:true,  name:'G#' },
  { semi:9,  black:false, name:'A'  },
  { semi:10, black:true,  name:'A#' },
  { semi:11, black:false, name:'B'  },
];
const WHITE_ONLY = OCTAVE_DEF.filter(k => !k.black);
const BLACK_ONLY = OCTAVE_DEF.filter(k =>  k.black);
// Semi → index of left-neighbouring white key within octave
const BLACK_POS: Record<number,number> = { 1:0, 3:1, 6:3, 8:4, 10:5 };

// ─── Category → accent colour ────────────────────────────
const CAT_COLOR: Record<string,string> = {
  lead:'#a78bfa', bass:'#f97316', pad:'#22d3ee', keys:'#fbbf24', fx:'#34d399',
};

let _engine: SynthEngine | null = null;

export default function Synthesizer() {
  const { synthPreset, updateSynthPreset, savedPresets, savePreset, loadPreset, deletePreset } = useAppStore();
  const { oscillatorType, envelope, filter, lfo, effects, octave, detune } = synthPreset;

  const specRef    = useRef<HTMLCanvasElement>(null);
  const oscRef     = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const heldKeys   = useRef<Set<string>>(new Set());

  const [analyserMode, setAnalyserMode] = useState<'spectrum'|'oscilloscope'>('spectrum');
  const [activeNotes,  setActiveNotes]  = useState<Set<number>>(new Set());
  const [showSave,     setShowSave]     = useState(false);
  const [presetName,   setPresetName]   = useState('');
  const [catFilter,    setCatFilter]    = useState<string>('all');

  // ── Init engine + animation ───────────────────────────
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

  // ── Note helpers ─────────────────────────────────────
  const noteOn = useCallback((midi: number) => {
    if (!_engine) { const ctx = getAudioContext(); _engine = new SynthEngine(ctx); }
    _engine.noteOn(midi, 100, synthPreset);
    setActiveNotes(prev => new Set([...prev, midi]));
  }, [synthPreset]);

  const noteOff = useCallback((midi: number) => {
    _engine?.noteOff(midi, synthPreset.envelope);
    setActiveNotes(prev => { const s = new Set(prev); s.delete(midi); return s; });
  }, [synthPreset.envelope]);

  // ── Computer keyboard ─────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (KEY_MIDI[k] !== undefined && !heldKeys.current.has(k)) {
        heldKeys.current.add(k);
        noteOn(KEY_MIDI[k] + (octave - 4) * 12);
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (KEY_MIDI[k] !== undefined) {
        heldKeys.current.delete(k);
        noteOff(KEY_MIDI[k] + (octave - 4) * 12);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [octave, noteOn, noteOff]);

  // ── Preset category filter ────────────────────────────
  const categories = ['all', ...Array.from(new Set(savedPresets.map(p => p.category ?? 'other')))];
  const filteredPresets = catFilter === 'all'
    ? savedPresets
    : savedPresets.filter(p => (p.category ?? 'other') === catFilter);

  // ── UI helpers ────────────────────────────────────────
  const OSC_TYPES: OscillatorType[] = ['sine','square','sawtooth','triangle'];
  const OSC_META: Record<OscillatorType,{ label:string; svgPath:string }> = {
    sine:     { label:'サイン',   svgPath:'M0,12 C4,2 12,2 16,12 C20,22 28,22 32,12' },
    square:   { label:'矩形波',   svgPath:'M0,4 L0,4 L12,4 L12,20 L24,20 L24,4 L32,4' },
    sawtooth: { label:'ノコギリ', svgPath:'M0,20 L16,4 L16,20 L32,4' },
    triangle: { label:'三角波',   svgPath:'M0,20 L8,4 L24,20 L32,4' },
  };

  const FILTER_TYPES: FilterType[] = ['lowpass','highpass','bandpass'];
  const FILTER_LABEL: Record<FilterType,string> = {
    lowpass:'ローパス', highpass:'ハイパス', bandpass:'バンドパス',
  };
  const LFO_TARGETS: LFOTarget[] = ['pitch','filter','amp'];
  const LFO_LABEL: Record<LFOTarget,string> = {
    pitch:'ピッチ', filter:'フィルター', amp:'アンプ',
  };

  // Studio One-style panel/section classes
  const panel = 'bg-[#1a1f2e] border border-gray-800/70 rounded-xl p-3.5 flex flex-col gap-3';
  const panelTitle = 'text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5';
  const seg = (active: boolean, colorClass = 'bg-violet-600/30 text-violet-300 border-violet-600/50') =>
    `flex-1 py-1.5 text-[10px] rounded-lg border transition-all font-medium
     ${active ? colorClass : 'border-gray-800 text-gray-600 hover:text-gray-400 hover:border-gray-700'}`;

  const unisonVoices = synthPreset.unisonVoices ?? 1;
  const unisonSpread = synthPreset.unisonSpread ?? 0;
  const VOICE_OPTIONS = [1,2,3,5,7];

  const currentCat = synthPreset.category ?? 'lead';
  const catAccent  = CAT_COLOR[currentCat] ?? '#a78bfa';

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">

      {/* ── Analyser strip (Studio One meter-like) ── */}
      <div className="relative bg-black border-b border-gray-800/80 flex-shrink-0" style={{ height: 88 }}>
        <canvas ref={specRef}
          className={`absolute inset-0 w-full h-full ${analyserMode === 'spectrum' ? '' : 'hidden'}`} />
        <canvas ref={oscRef}
          className={`absolute inset-0 w-full h-full ${analyserMode === 'oscilloscope' ? '' : 'hidden'}`} />

        {/* Left label */}
        <div className="absolute top-2.5 left-3 flex items-center gap-2 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: catAccent }} />
          <span className="text-[11px] font-bold text-white tracking-wide">シンセサイザー</span>
          <span className="text-[10px] text-gray-600">— {synthPreset.name}</span>
        </div>

        {/* Mode toggles */}
        <div className="absolute top-2.5 right-3 flex gap-1">
          {(['spectrum','oscilloscope'] as const).map(m => (
            <button key={m} onClick={() => setAnalyserMode(m)}
              className={`text-[9px] px-2 py-0.5 rounded border transition-all
                ${analyserMode === m
                  ? 'border-violet-600/60 bg-violet-600/20 text-violet-300'
                  : 'border-gray-800 text-gray-700 hover:text-gray-500'}`}>
              {m === 'spectrum' ? 'SPECTRUM' : 'SCOPE'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-auto p-3 space-y-3">

        {/* ── Preset selector + category ── */}
        <div className={panel}>
          <div className={panelTitle}><Zap size={11} style={{ color: catAccent }} /> プリセット</div>

          {/* Category filter pills */}
          <div className="flex gap-1 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-2 py-0.5 rounded-full text-[9px] border transition-all font-medium
                  ${catFilter === c
                    ? 'border-current text-white bg-white/10'
                    : 'border-gray-800 text-gray-600 hover:text-gray-400'}`}
                style={catFilter === c ? { borderColor: CAT_COLOR[c] ?? '#a78bfa', color: CAT_COLOR[c] ?? '#a78bfa' } : {}}>
                {c === 'all' ? 'ALL' : c.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select value={synthPreset.id} onChange={e => loadPreset(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/60 rounded-lg px-3 pr-8 py-2
                  text-sm text-gray-200 focus:outline-none focus:border-violet-600/70
                  appearance-none transition-colors">
                {filteredPresets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
            <button onClick={() => { setPresetName(synthPreset.name); setShowSave(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-white rounded-lg transition-colors"
              style={{ background: catAccent + '33', border: `1px solid ${catAccent}55` }}>
              <Save size={11} /> 保存
            </button>
            {synthPreset.id.startsWith('user-') && (
              <button onClick={() => deletePreset(synthPreset.id)}
                className="p-2 text-gray-700 hover:text-red-400 border border-gray-800 hover:border-red-500/50 rounded-lg transition-all">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── Parameter grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">

          {/* ── Oscillator ── */}
          <div className={panel}>
            <div className={panelTitle}>〜 オシレーター</div>
            <div className="grid grid-cols-2 gap-1.5">
              {OSC_TYPES.map(type => (
                <button key={type} onClick={() => updateSynthPreset({ oscillatorType: type })}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all
                    ${oscillatorType === type
                      ? 'border-violet-500/70 bg-violet-500/12 text-violet-300'
                      : 'border-gray-800/80 text-gray-600 hover:border-gray-700 hover:text-gray-400'}`}>
                  {/* SVG waveform shape */}
                  <svg width={32} height={24} viewBox="0 0 32 24" fill="none" className="overflow-visible">
                    <path d={OSC_META[type].svgPath} stroke="currentColor" strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[9px] font-medium">{OSC_META[type].label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-center pt-1">
              <Knob value={octave} min={1} max={7}
                onChange={v => updateSynthPreset({ octave: Math.round(v) })}
                label={`OCT ${octave}`} color={catAccent} />
              <Knob value={detune} min={-100} max={100}
                onChange={v => updateSynthPreset({ detune: Math.round(v) })}
                label={`${Math.round(detune)} ¢`} color="#60a5fa" />
            </div>

            {/* ── Unison (Serum-style) ── */}
            <div className="mt-1 border-t border-gray-800/60 pt-2.5 space-y-2">
              <span className="text-[9px] text-gray-600 uppercase tracking-wider">Unison</span>
              <div className="flex gap-1">
                {VOICE_OPTIONS.map(v => (
                  <button key={v} onClick={() => updateSynthPreset({ unisonVoices: v })}
                    className={`flex-1 py-1 text-[10px] rounded border transition-all font-mono
                      ${unisonVoices === v
                        ? 'border-violet-500/60 bg-violet-500/20 text-violet-300'
                        : 'border-gray-800 text-gray-700 hover:text-gray-400'}`}>
                    {v}V
                  </button>
                ))}
              </div>
              {unisonVoices > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-600 w-10 flex-shrink-0">スプレッド</span>
                  <input type="range" min={0} max={100} step={1}
                    value={unisonSpread}
                    onChange={e => updateSynthPreset({ unisonSpread: Number(e.target.value) })}
                    className="flex-1 h-1" style={{ accentColor: catAccent }} />
                  <span className="text-[9px] text-gray-500 font-mono w-8 text-right">{unisonSpread}¢</span>
                </div>
              )}
            </div>
          </div>

          {/* ── ADSR ── */}
          <div className={panel}>
            <div className={panelTitle}>⊿ エンベロープ</div>
            <ADSRDisplay envelope={envelope} accent={catAccent} />
            <div className="flex gap-2 justify-center">
              {[
                { k:'attack',  label:'A', min:0.001, max:4,   color:'#34d399' },
                { k:'decay',   label:'D', min:0.01,  max:4,   color:'#60a5fa' },
                { k:'sustain', label:'S', min:0,     max:1,   color:'#fbbf24' },
                { k:'release', label:'R', min:0.01,  max:8,   color:'#f87171' },
              ].map(p => (
                <div key={p.k} className="flex flex-col items-center gap-0.5">
                  <Knob
                    value={(envelope as any)[p.k]}
                    min={p.min} max={p.max}
                    onChange={v => updateSynthPreset({ envelope: { ...envelope, [p.k]: v } })}
                    label={`${((envelope as any)[p.k]).toFixed(2)}`}
                    color={p.color} size={36}
                  />
                  <span className="text-[9px] text-gray-600">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Filter ── */}
          <div className={panel}>
            <div className={panelTitle}>⌇ フィルター</div>
            <div className="flex gap-1">
              {FILTER_TYPES.map(type => (
                <button key={type} onClick={() => updateSynthPreset({ filter: { ...filter, type } })}
                  className={seg(filter.type === type, 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50')}>
                  {FILTER_LABEL[type]}
                </button>
              ))}
            </div>
            <FilterDisplay filter={filter} />
            <div className="flex gap-3 justify-center">
              <Knob value={filter.cutoff} min={20} max={20000} logarithmic
                onChange={v => updateSynthPreset({ filter: { ...filter, cutoff: v } })}
                label={filter.cutoff >= 1000
                  ? `${(filter.cutoff/1000).toFixed(1)}k`
                  : `${Math.round(filter.cutoff)}Hz`}
                color="#22d3ee" />
              <Knob value={filter.resonance} min={0} max={30}
                onChange={v => updateSynthPreset({ filter: { ...filter, resonance: v } })}
                label={`Q ${filter.resonance.toFixed(1)}`} color="#f97316" />
            </div>
          </div>

          {/* ── LFO ── */}
          <div className={panel}>
            <div className={panelTitle}>∿ LFO</div>
            <div className="flex gap-1">
              {LFO_TARGETS.map(t => (
                <button key={t} onClick={() => updateSynthPreset({ lfo: { ...lfo, target: t } })}
                  className={seg(lfo.target === t, 'bg-amber-500/20 text-amber-300 border-amber-500/50')}>
                  {LFO_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Knob value={lfo.rate} min={0.1} max={20}
                onChange={v => updateSynthPreset({ lfo: { ...lfo, rate: v } })}
                label={`${lfo.rate.toFixed(1)} Hz`} color="#fbbf24" />
              <Knob value={lfo.depth} min={0} max={1}
                onChange={v => updateSynthPreset({ lfo: { ...lfo, depth: v } })}
                label={`${(lfo.depth*100).toFixed(0)}%`} color="#fb923c" />
            </div>
            {/* LFO shape mini-indicator */}
            <div className="flex gap-1 justify-center mt-1">
              {['sin','tri','sqr','saw'].map(s => (
                <div key={s}
                  className="text-[8px] px-1.5 py-0.5 rounded border border-gray-800 text-gray-700 font-mono">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* ── Effects (FabFilter Pro-R/Q reference style) ── */}
          <div className={`${panel} col-span-2`}>
            <div className={panelTitle}>✦ エフェクト <span className="text-gray-700 font-normal normal-case tracking-normal">
              — Reverb / Delay / Distortion</span>
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              {[
                { k:'reverb',        label:'リバーブ',  unit:'%',  color:'#818cf8', min:0,    max:1 },
                { k:'delay',         label:'ディレイ',  unit:'%',  color:'#60a5fa', min:0,    max:1 },
                { k:'delayTime',     label:'ディレイ時間', unit:'s', color:'#38bdf8', min:0.05, max:1 },
                { k:'delayFeedback', label:'フィードバック', unit:'%', color:'#818cf8', min:0, max:0.92 },
                { k:'distortion',    label:'ドライブ',  unit:'%',  color:'#f87171', min:0,    max:1 },
              ].map(p => (
                <div key={p.k} className="flex flex-col items-center gap-0.5">
                  <Knob
                    value={(effects as any)[p.k]}
                    min={p.min} max={p.max}
                    onChange={v => updateSynthPreset({ effects: { ...effects, [p.k]: v } })}
                    label={p.unit === 's'
                      ? `${((effects as any)[p.k]).toFixed(2)}s`
                      : `${((effects as any)[p.k]*100).toFixed(0)}%`}
                    color={p.color} size={44}
                  />
                  <span className="text-[9px] text-gray-600 text-center leading-tight max-w-[48px]">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Piano keyboard ── */}
        <PianoKeyboard
          octaves={[octave, octave + 1]}
          activeNotes={activeNotes}
          accent={catAccent}
          onNoteOn={noteOn}
          onNoteOff={noteOff}
        />

        <p className="text-center text-[10px] text-gray-800 pb-2">
          キーボード下段 Z–/ (Oct {octave}) · 上段 Q–P (Oct {octave+1}) · 黒鍵は S,D,G,H,J / 2,3,5,6,7
        </p>
      </div>

      {/* ── Save preset modal ── */}
      {showSave && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1f2e] border border-gray-700/60 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-white font-bold text-sm mb-4">プリセットを保存</h3>
            <input autoFocus type="text" value={presetName} onChange={e => setPresetName(e.target.value)}
              placeholder="プリセット名..."
              className="w-full bg-gray-900 border border-gray-700/60 rounded-xl px-3 py-2.5
                text-white text-sm focus:outline-none focus:border-violet-500/70 mb-4 transition-colors"
              onKeyDown={e => {
                if (e.key === 'Enter' && presetName) { savePreset(presetName); setShowSave(false); }
                if (e.key === 'Escape') setShowSave(false);
              }} />
            <div className="flex gap-2">
              <button onClick={() => setShowSave(false)}
                className="flex-1 py-2.5 text-sm text-gray-400 border border-gray-700/60 rounded-xl hover:bg-gray-800 transition-colors">
                キャンセル
              </button>
              <button
                onClick={() => { if (presetName) { savePreset(presetName); setShowSave(false); } }}
                disabled={!presetName}
                className="flex-1 py-2.5 text-sm text-white rounded-xl transition-colors font-medium disabled:opacity-40"
                style={{ background: catAccent + '55', border: `1px solid ${catAccent}88` }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  ADSR Visual (animated)
// ─────────────────────────────────────────────────────────
function ADSRDisplay({ envelope: e, accent }: {
  envelope: { attack:number; decay:number; sustain:number; release:number };
  accent: string;
}) {
  const W=240, H=52, P=8, IW=W-P*2;
  const seg = IW / 4;

  const aX = P + Math.min(e.attack  / 4, 1) * seg;
  const dX = aX + Math.min(e.decay  / 4, 1) * seg;
  const sX = dX + seg * 0.45;
  const rX = sX + Math.min(e.release/ 8, 1) * seg;
  const tY = P, bY = H - P;
  const sY = bY - e.sustain * (bY - tY);

  const path = `M${P},${bY} L${aX},${tY} L${dX},${sY} L${sX},${sY} L${rX},${bY}`;

  return (
    <svg width={W} height={H} className="w-full">
      <defs>
        <linearGradient id={`ag${accent.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Grid */}
      <line x1={P} y1={bY} x2={W-P} y2={bY} stroke="#1e293b" strokeWidth={1} />
      <line x1={P} y1={tY} x2={W-P} y2={tY} stroke="#1e293b" strokeWidth={1} />
      {/* Fill */}
      <path d={`${path} L${P},${bY} Z`} fill={`url(#ag${accent.replace('#','')})`} />
      {/* Line */}
      <path d={path} fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {/* Stage dots */}
      {[{x:aX,y:tY,l:'A'},{x:dX,y:sY,l:'D'},{x:sX,y:sY,l:'S'},{x:rX,y:bY,l:'R'}].map(pt => (
        <g key={pt.l}>
          <circle cx={pt.x} cy={pt.y} r={2.5} fill={accent} />
          <text x={pt.x} y={pt.y - 5} textAnchor="middle" fontSize={8} fill={accent} opacity={0.8}>{pt.l}</text>
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
//  Filter response sketch (FabFilter-lite)
// ─────────────────────────────────────────────────────────
function FilterDisplay({ filter }: { filter: { type: string; cutoff: number; resonance: number } }) {
  const W=240, H=40, P=6;
  const logMin=Math.log(20), logMax=Math.log(20000);
  const cx = P + ((Math.log(filter.cutoff)-logMin)/(logMax-logMin)) * (W-P*2);

  // Simple response curve sketch
  let path = '';
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const xn = i / steps;
    const x  = P + xn * (W - P * 2);
    const freq = 20 * Math.pow(1000, xn);
    const dist = Math.log(freq/filter.cutoff) / Math.log(2); // octaves from cutoff
    let gain = 0;
    if (filter.type === 'lowpass')  gain = -Math.max(0, dist)  * 12;
    if (filter.type === 'highpass') gain = -Math.max(0, -dist) * 12;
    if (filter.type === 'bandpass') gain = -Math.abs(dist) * 12;
    // Resonance peak
    const peak = filter.resonance * Math.exp(-dist*dist * 8) * 3;
    const normGain = Math.max(-40, Math.min(6, gain + peak));
    const y = H/2 - (normGain / 40) * (H - P*2);
    path += (i === 0 ? `M${x},${y}` : ` L${x},${y}`);
  }

  return (
    <svg width={W} height={H} className="w-full opacity-80">
      <path d={path} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round" />
      {/* Cutoff marker */}
      <line x1={cx} y1={P} x2={cx} y2={H-P} stroke="#22d3ee" strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
//  Piano Keyboard
// ─────────────────────────────────────────────────────────
function PianoKeyboard({ octaves, activeNotes, accent, onNoteOn, onNoteOff }: {
  octaves: number[];
  activeNotes: Set<number>;
  accent: string;
  onNoteOn:  (n: number) => void;
  onNoteOff: (n: number) => void;
}) {
  const totalW = octaves.length * WHITE_ONLY.length;
  const wPct   = 100 / totalW;

  // Build key lists
  const whites: { midi:number; label:string; gi:number }[] = [];
  const blacks: { midi:number; xPct:number; wPct:number }[] = [];

  for (let oi = 0; oi < octaves.length; oi++) {
    const oct = octaves[oi];
    WHITE_ONLY.forEach((k, ki) => {
      whites.push({ midi: (oct+1)*12 + k.semi, label:`${k.name}${oct-1}`, gi: oi*WHITE_ONLY.length + ki });
    });
    BLACK_ONLY.forEach(k => {
      const wBefore = BLACK_POS[k.semi];
      const gi      = oi * WHITE_ONLY.length + wBefore;
      blacks.push({
        midi: (oct+1)*12 + k.semi,
        xPct: (gi + 0.62) * wPct,
        wPct: wPct * 0.65,
      });
    });
  }

  return (
    <div className="bg-[#1a1f2e] border border-gray-800/70 rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] text-gray-600 flex items-center gap-1">
          🎹 Oct {octaves[0]}–{octaves[octaves.length-1]+1}
        </span>
        <span className="text-[9px] text-gray-700">クリックまたはキーボードで演奏</span>
      </div>

      <div className="relative select-none" style={{ height: 108 }}>
        {/* White keys */}
        {whites.map(({ midi, label, gi }) => {
          const active = activeNotes.has(midi);
          return (
            <div key={midi}
              className={`piano-key absolute bottom-0 rounded-b-lg border transition-colors duration-50
                ${active ? 'border-gray-300' : 'border-gray-400 hover:bg-gray-50 active:bg-gray-100'}`}
              style={{
                left:   `${gi * wPct}%`,
                width:  `${wPct}%`,
                height: '100%',
                zIndex: 1,
                background: active ? accent : '#f3f4f6',
                boxShadow: active ? `0 0 12px ${accent}66` : undefined,
              }}
              onMouseDown={ev => { ev.preventDefault(); onNoteOn(midi); }}
              onMouseUp={()  => onNoteOff(midi)}
              onMouseLeave={() => { if (activeNotes.has(midi)) onNoteOff(midi); }}
            >
              <span className="absolute bottom-1 left-0 right-0 text-center text-[7px] text-gray-400 select-none font-mono">
                {label}
              </span>
            </div>
          );
        })}

        {/* Black keys */}
        {blacks.map(({ midi, xPct, wPct: bwPct }) => {
          const active = activeNotes.has(midi);
          return (
            <div key={midi}
              className="piano-key absolute top-0 rounded-b-md border-x border-b transition-colors duration-50"
              style={{
                left:    `${xPct}%`,
                width:   `${bwPct}%`,
                height:  '62%',
                zIndex:  10,
                background: active ? accent : '#111827',
                borderColor: active ? accent : '#374151',
                boxShadow: active ? `0 0 10px ${accent}88` : undefined,
              }}
              onMouseDown={ev => { ev.stopPropagation(); ev.preventDefault(); onNoteOn(midi); }}
              onMouseUp={ev  => { ev.stopPropagation(); onNoteOff(midi); }}
              onMouseLeave={() => { if (activeNotes.has(midi)) onNoteOff(midi); }}
            />
          );
        })}
      </div>
    </div>
  );
}
