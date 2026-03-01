'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Sample, SampleCategory } from '@/types';
import {
  getAudioContext, playBuffer, drawWaveform,
  generateKick, generateSnare, generateHihat, generateClap,
  generateBassPluck, generatePad, generateSynthLead,
  generateFxRiser, generateVocalChop
} from '@/lib/audioEngine';
import { Upload, Play, Square, Waves, Music2, GripVertical } from 'lucide-react';

const CATEGORIES: { id: SampleCategory; label: string; icon: string; color: string }[] = [
  { id: 'drums',  label: 'ドラム',  icon: '🥁', color: '#ef4444' },
  { id: 'bass',   label: 'ベース',  icon: '🎸', color: '#f97316' },
  { id: 'synths', label: 'シンセ',  icon: '🎹', color: '#a78bfa' },
  { id: 'fx',     label: 'FX',      icon: '✨', color: '#22d3ee' },
  { id: 'vocals', label: 'ボーカル',icon: '🎤', color: '#f472b6' },
];

const BUILT_IN_DEFS: {
  name: string; category: SampleCategory; color: string;
  gen: (ctx: AudioContext) => AudioBuffer;
}[] = [
  { name: 'Kick',          category: 'drums',  color: '#ef4444', gen: c => generateKick(c) },
  { name: 'Snare',         category: 'drums',  color: '#f97316', gen: c => generateSnare(c) },
  { name: 'HiHat Closed',  category: 'drums',  color: '#eab308', gen: c => generateHihat(c) },
  { name: 'HiHat Open',    category: 'drums',  color: '#84cc16', gen: c => generateHihat(c, 0.15, true) },
  { name: 'Clap',          category: 'drums',  color: '#f472b6', gen: c => generateClap(c) },
  { name: 'Bass Pluck',    category: 'bass',   color: '#22d3ee', gen: c => generateBassPluck(c) },
  { name: 'Pad Chord',     category: 'synths', color: '#818cf8', gen: c => generatePad(c) },
  { name: 'Synth Lead',    category: 'synths', color: '#a78bfa', gen: c => generateSynthLead(c) },
  { name: 'FX Riser',      category: 'fx',     color: '#34d399', gen: c => generateFxRiser(c) },
  { name: 'Vocal Chop',    category: 'vocals', color: '#fb923c', gen: c => generateVocalChop(c) },
];

interface SampleRowProps {
  sample: Sample;
  onPreview: (s: Sample) => void;
  onStop: () => void;
  isPlaying: boolean;
  compact?: boolean;
}

function SampleRow({ sample, onPreview, onStop, isPlaying, compact }: SampleRowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cat = CATEGORIES.find(c => c.id === sample.category);

  useEffect(() => {
    if (canvasRef.current && sample.audioBuffer) {
      drawWaveform(canvasRef.current, sample.audioBuffer, sample.color);
    }
  }, [sample]);

  return (
    <div
      className={`group flex items-center gap-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing
        border-transparent hover:border-gray-700 hover:bg-gray-800/60
        ${isPlaying ? 'bg-gray-800/80 border-gray-700' : ''}
        ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('sampleId', sample.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {/* Drag handle */}
      <GripVertical size={12} className="text-gray-700 group-hover:text-gray-500 flex-shrink-0" />

      {/* Play/Stop button */}
      <button
        onClick={e => { e.stopPropagation(); isPlaying ? onStop() : onPreview(sample); }}
        className={`flex-shrink-0 rounded-md flex items-center justify-center transition-all
          ${compact ? 'w-6 h-6' : 'w-7 h-7'}
          ${isPlaying
            ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-sm'
            : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-white hover:border-gray-500 group-hover:bg-gray-700'
          }`}
      >
        {isPlaying
          ? <Square size={compact ? 8 : 9} fill="currentColor" />
          : <Play size={compact ? 8 : 9} fill="currentColor" />}
      </button>

      {/* Mini waveform */}
      <canvas
        ref={canvasRef}
        width={compact ? 44 : 64}
        height={compact ? 20 : 26}
        className="rounded flex-shrink-0 bg-gray-900/80"
      />

      {/* Name + info */}
      <div className="flex-1 min-w-0">
        <div className={`text-gray-200 truncate font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {sample.name}
        </div>
        {!compact && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px]">{cat?.icon}</span>
            <span className="text-[10px] text-gray-600">{sample.duration.toFixed(2)}s</span>
          </div>
        )}
      </div>

      {/* Color swatch */}
      <div
        className="w-1.5 h-6 rounded-full flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: sample.color }}
      />
    </div>
  );
}

interface Props { fullView?: boolean; }

export default function SampleBrowser({ fullView = false }: Props) {
  const { samples, setSamples, addSample } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<SampleCategory>('drums');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const currentSource = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  const initSamples = useCallback(async () => {
    if (initialized || samples.length > 0) return;
    setInitialized(true);
    try {
      const ctx = getAudioContext();
      const builtIn: Sample[] = BUILT_IN_DEFS.map((def, i) => {
        const buf = def.gen(ctx);
        return {
          id: `builtin-${i}`,
          name: def.name,
          category: def.category,
          duration: buf.duration,
          color: def.color,
          isBuiltIn: true,
          audioBuffer: buf,
        };
      });
      setSamples(builtIn);
    } catch (e) {
      console.warn('Sample init failed:', e);
    }
  }, [initialized, samples.length, setSamples]);

  useEffect(() => { initSamples(); }, [initSamples]);

  const handlePreview = useCallback((sample: Sample) => {
    if (!sample.audioBuffer) return;
    const ctx = getAudioContext();
    try { currentSource.current?.stop(); } catch {}
    const src = playBuffer(ctx, sample.audioBuffer, 0.8);
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
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const cat = CATEGORIES.find(c =>
          file.name.toLowerCase().includes(c.id) ||
          file.name.toLowerCase().includes(c.label)
        )?.id ?? 'fx';
        addSample({
          id: `user-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.[^.]+$/, ''),
          category: cat as SampleCategory,
          duration: audioBuffer.duration,
          color: '#60a5fa',
          isBuiltIn: false,
          audioBuffer,
        });
      } catch { console.warn('Failed to decode:', file.name); }
    }
    e.target.value = '';
  };

  const filtered = samples.filter(s =>
    s.category === activeCategory &&
    (searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const compact = !fullView;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className={`border-b border-gray-800 flex-shrink-0 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Waves size={14} className="text-cyan-400" />
            <span className={`font-semibold text-gray-100 ${compact ? 'text-xs' : 'text-sm'}`}>
              {compact ? 'サンプラー' : 'サンプルブラウザ'}
            </span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-md border border-gray-700 hover:border-gray-600 transition-all"
          >
            <Upload size={10} />
            {!compact && 'インポート'}
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*,.wav,.mp3,.flac,.ogg,.aiff" multiple className="hidden" onChange={handleFileImport} />
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="検索..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-violet-600 transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className={`flex border-b border-gray-800 flex-shrink-0 overflow-x-auto ${compact ? 'gap-0' : 'gap-0 px-1 py-1'}`}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 flex items-center transition-all font-medium
              ${compact ? 'flex-col gap-0.5 px-2 py-2 text-[10px]' : 'flex-row gap-1.5 px-3 py-2 text-xs rounded-md m-0.5'}
              ${activeCategory === cat.id
                ? compact
                  ? 'text-white border-b-2'
                  : 'bg-gray-800 text-white'
                : 'text-gray-500 hover:text-gray-300'
              }`}
            style={activeCategory === cat.id && compact ? { borderColor: cat.color, color: cat.color } : undefined}
          >
            <span className={compact ? 'text-base' : 'text-sm'}>{cat.icon}</span>
            <span>{compact ? cat.icon !== cat.label ? cat.label : '' : cat.label}</span>
          </button>
        ))}
      </div>

      {/* Sample list */}
      <div className="flex-1 overflow-y-auto py-1 px-1.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-700 gap-2">
            <Music2 size={20} />
            <p className="text-xs">サンプルなし</p>
          </div>
        ) : (
          <div className={fullView ? 'grid grid-cols-2 gap-1' : 'space-y-0.5'}>
            {filtered.map(s => (
              <SampleRow
                key={s.id}
                sample={s}
                onPreview={handlePreview}
                onStop={handleStop}
                isPlaying={playingId === s.id}
                compact={compact}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-gray-800 flex-shrink-0">
        <p className="text-[10px] text-gray-700 text-center">
          {compact ? 'タイムラインへドラッグ' : 'サンプルをタイムラインにドラッグ&ドロップ'}
        </p>
      </div>
    </div>
  );
}
