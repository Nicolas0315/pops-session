'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Sample, SampleCategory } from '@/types';
import {
  getAudioContext, playBuffer, drawWaveform,
  generateKick808, generateKickAcoustic,
  generateSnareCrack, generateSnareLofi,
  generateHihatClosed, generateHihatOpen,
  generateClap, generateRim, generateConga, generateShaker,
  generateBassPluck, generatePad, generateSynthLead,
  generateFxRiser, generateVocalChop,
} from '@/lib/audioEngine';
import { Upload, Play, Square, Waves, Music2, GripVertical, Search } from 'lucide-react';

// ─── Category config ────────────────────────────────────

interface CategoryConfig {
  id: SampleCategory;
  label: string;
  icon: string;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'drums',  label: 'ドラム',   icon: '🥁', color: '#ef4444' },
  { id: 'bass',   label: 'ベース',   icon: '🎸', color: '#f97316' },
  { id: 'synths', label: 'シンセ',   icon: '🎹', color: '#a78bfa' },
  { id: 'fx',     label: 'FX',       icon: '✨', color: '#22d3ee' },
  { id: 'vocals', label: 'ボーカル', icon: '🎤', color: '#f472b6' },
];

// ─── Built-in sample definitions ────────────────────────

interface SampleDef {
  name:       string;
  sub:        string;
  category:   SampleCategory;
  color:      string;
  gen:        (ctx: AudioContext) => AudioBuffer;
}

const BUILT_IN_DEFS: SampleDef[] = [
  // Drums — 808 & acoustic kicks
  { name: 'Kick 808',        sub: 'kick',  category: 'drums',  color: '#ef4444', gen: generateKick808 },
  { name: 'Kick Acoustic',   sub: 'kick',  category: 'drums',  color: '#dc2626', gen: generateKickAcoustic },
  // Snares
  { name: 'Snare Crack',     sub: 'snare', category: 'drums',  color: '#f97316', gen: generateSnareCrack },
  { name: 'Snare Lo-Fi',     sub: 'snare', category: 'drums',  color: '#ea580c', gen: generateSnareLofi },
  // Hi-hats
  { name: 'HiHat Closed',    sub: 'hihat', category: 'drums',  color: '#eab308', gen: generateHihatClosed },
  { name: 'HiHat Open',      sub: 'hihat', category: 'drums',  color: '#ca8a04', gen: generateHihatOpen },
  // Clap / Rim / Perc
  { name: 'Clap',            sub: 'clap',  category: 'drums',  color: '#f472b6', gen: generateClap },
  { name: 'Rim Shot',        sub: 'rim',   category: 'drums',  color: '#e879f9', gen: generateRim },
  { name: 'Conga',           sub: 'perc',  category: 'drums',  color: '#c084fc', gen: generateConga },
  { name: 'Shaker',          sub: 'perc',  category: 'drums',  color: '#a78bfa', gen: generateShaker },
  // Bass
  { name: 'Bass Pluck',      sub: 'bass',  category: 'bass',   color: '#22d3ee', gen: generateBassPluck },
  // Synths
  { name: 'Pad Chord (Am)',   sub: 'pad',   category: 'synths', color: '#818cf8', gen: generatePad },
  { name: 'Synth Lead',      sub: 'lead',  category: 'synths', color: '#a78bfa', gen: generateSynthLead },
  // FX
  { name: 'FX Riser',        sub: 'riser', category: 'fx',     color: '#34d399', gen: generateFxRiser },
  // Vocals
  { name: 'Vocal Chop',      sub: 'vocal', category: 'vocals', color: '#fb923c', gen: generateVocalChop },
];

// ─── Single sample row ──────────────────────────────────

interface RowProps {
  sample:    Sample;
  onPreview: (s: Sample) => void;
  onStop:    () => void;
  isPlaying: boolean;
  compact?:  boolean;
}

function SampleRow({ sample, onPreview, onStop, isPlaying, compact }: RowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && sample.audioBuffer)
      drawWaveform(canvasRef.current, sample.audioBuffer, sample.color);
  }, [sample]);

  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing
        border-transparent hover:border-gray-700/70 hover:bg-[#1a1f2e]
        ${isPlaying ? 'bg-[#1a1f2e] border-gray-700/70' : ''}
        ${compact ? 'px-1.5 py-1' : 'px-2.5 py-2'}`}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('sampleId', sample.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {/* Drag grip */}
      <GripVertical size={10} className="text-gray-700 group-hover:text-gray-500 flex-shrink-0 transition-colors" />

      {/* Play button */}
      <button
        onClick={e => { e.stopPropagation(); isPlaying ? onStop() : onPreview(sample); }}
        className={`flex-shrink-0 rounded flex items-center justify-center transition-all
          ${compact ? 'w-5 h-5' : 'w-6 h-6'}
          ${isPlaying
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60'
            : 'bg-gray-800/80 text-gray-500 border border-gray-700/50 hover:text-white hover:border-gray-500 group-hover:bg-gray-700/80'
          }`}
      >
        {isPlaying
          ? <Square size={compact ? 7 : 8} fill="currentColor" />
          : <Play   size={compact ? 7 : 8} fill="currentColor" />}
      </button>

      {/* Mini waveform */}
      <canvas
        ref={canvasRef}
        width={compact ? 40 : 56}
        height={compact ? 18 : 22}
        className="rounded flex-shrink-0 bg-gray-900/60"
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className={`text-gray-200 truncate font-medium leading-none ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {sample.name}
        </div>
        {!compact && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] text-gray-600">{sample.subcategory ?? ''}</span>
            <span className="text-[9px] text-gray-700">·</span>
            <span className="text-[9px] text-gray-600">{sample.duration.toFixed(2)}s</span>
          </div>
        )}
      </div>

      {/* Color strip */}
      <div className="w-[3px] self-stretch rounded-full flex-shrink-0 opacity-60 group-hover:opacity-90 transition-opacity"
        style={{ background: sample.color }} />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────

interface Props { fullView?: boolean; }

export default function SampleBrowser({ fullView = false }: Props) {
  const { samples, setSamples, addSample } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<SampleCategory>('drums');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [playingId,      setPlayingId]      = useState<string | null>(null);
  const currentSource = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Generate all built-in samples once
  const initSamples = useCallback(async () => {
    if (initialized || samples.length > 0) return;
    setInitialized(true);
    try {
      const ctx = getAudioContext();
      const builtIn: Sample[] = BUILT_IN_DEFS.map((def, i) => {
        const buf = def.gen(ctx);
        return {
          id:          `builtin-${i}`,
          name:        def.name,
          subcategory: def.sub,
          category:    def.category,
          duration:    buf.duration,
          color:       def.color,
          isBuiltIn:   true,
          audioBuffer: buf,
        };
      });
      setSamples(builtIn);
    } catch (e) { console.warn('Sample init:', e); }
  }, [initialized, samples.length, setSamples]);

  useEffect(() => { initSamples(); }, [initSamples]);

  const handlePreview = useCallback((sample: Sample) => {
    if (!sample.audioBuffer) return;
    const ctx = getAudioContext();
    try { currentSource.current?.stop(); } catch {}
    const src = playBuffer(ctx, sample.audioBuffer, 0.85);
    currentSource.current = src;
    setPlayingId(sample.id);
    src.onended = () => setPlayingId(null);
  }, []);

  const handleStop = useCallback(() => {
    try { currentSource.current?.stop(); } catch {}
    currentSource.current = null;
    setPlayingId(null);
  }, []);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const ctx = getAudioContext();
    for (const file of Array.from(files)) {
      try {
        const buf = await ctx.decodeAudioData(await file.arrayBuffer());
        const guessedCat = (['drums','bass','synths','fx','vocals'] as SampleCategory[])
          .find(c => file.name.toLowerCase().includes(c)) ?? 'fx';
        addSample({
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name:        file.name.replace(/\.[^.]+$/, ''),
          category:    guessedCat,
          duration:    buf.duration,
          color:       '#60a5fa',
          isBuiltIn:   false,
          audioBuffer: buf,
        });
      } catch { console.warn('decode failed:', file.name); }
    }
    e.target.value = '';
  };

  const filtered = samples.filter(s =>
    s.category === activeCategory &&
    (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const compact = !fullView;
  const cat = CATEGORIES.find(c => c.id === activeCategory);

  return (
    // Studio One dark: #1a1f2e base, #12161f header
    <div className="flex flex-col h-full bg-[#12161f]">

      {/* ── Header ── */}
      <div className={`border-b border-gray-800/80 flex-shrink-0 ${compact ? 'px-2 py-2' : 'px-4 py-3'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Waves size={13} className="text-cyan-400" />
            <span className={`font-semibold text-gray-200 ${compact ? 'text-[11px]' : 'text-sm'}`}>
              {compact ? 'サンプル' : 'サンプルブラウザ'}
            </span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white
              px-2 py-1 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700/60
              hover:border-gray-600 transition-all"
          >
            <Upload size={10} />
            {!compact && 'インポート'}
          </button>
          <input
            ref={fileInputRef} type="file"
            accept="audio/*,.wav,.mp3,.flac,.ogg,.aiff"
            multiple className="hidden" onChange={handleFileImport}
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text" placeholder="検索..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900/80 border border-gray-800 rounded pl-6 pr-2 py-1.5
              text-[11px] text-gray-300 placeholder-gray-700
              focus:outline-none focus:border-violet-700/70 transition-colors"
          />
        </div>
      </div>

      {/* ── Category tabs — Studio One style horizontal pills ── */}
      <div className="flex border-b border-gray-800/80 flex-shrink-0 overflow-x-auto">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`flex-shrink-0 flex items-center transition-all font-medium select-none
              ${compact ? 'flex-col gap-0.5 px-2.5 py-2 text-[9px]' : 'gap-1.5 px-3 py-2 text-xs'}
              ${activeCategory === c.id
                ? 'text-white bg-gray-800/60 border-b-2'
                : 'text-gray-600 hover:text-gray-400 border-b-2 border-transparent'
              }`}
            style={activeCategory === c.id ? { borderColor: c.color } : {}}
          >
            <span className={compact ? 'text-sm leading-none' : ''}>{c.icon}</span>
            <span style={activeCategory === c.id ? { color: c.color } : {}}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* ── Sample count badge ── */}
      <div className="px-2.5 py-1 flex-shrink-0 flex items-center justify-between">
        <span className="text-[9px] text-gray-700 uppercase tracking-wider">
          {cat?.icon} {cat?.label}
        </span>
        <span className="text-[9px] text-gray-700">{filtered.length} samples</span>
      </div>

      {/* ── Sample list ── */}
      <div className="flex-1 overflow-y-auto px-1 pb-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-gray-800 gap-1.5">
            <Music2 size={18} />
            <p className="text-[10px]">サンプルなし</p>
          </div>
        ) : fullView ? (
          <div className="grid grid-cols-2 gap-0.5">
            {filtered.map(s => (
              <SampleRow key={s.id} sample={s} onPreview={handlePreview} onStop={handleStop} isPlaying={playingId === s.id} compact={false} />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(s => (
              <SampleRow key={s.id} sample={s} onPreview={handlePreview} onStop={handleStop} isPlaying={playingId === s.id} compact={compact} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-2 py-1.5 border-t border-gray-800/60 flex-shrink-0">
        <p className="text-[9px] text-gray-700 text-center tracking-wide">
          {compact ? '↓ タイムラインへドラッグ' : 'サンプルをタイムラインへドラッグ&ドロップ'}
        </p>
      </div>
    </div>
  );
}
