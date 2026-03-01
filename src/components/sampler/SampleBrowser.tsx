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
import { Upload, Play, Square, Music2, Waves } from 'lucide-react';

const CATEGORIES: { id: SampleCategory; label: string; icon: string }[] = [
  { id: 'drums', label: 'ドラム', icon: '🥁' },
  { id: 'bass', label: 'ベース', icon: '🎸' },
  { id: 'synths', label: 'シンセ', icon: '🎹' },
  { id: 'fx', label: 'エフェクト', icon: '✨' },
  { id: 'vocals', label: 'ボーカル', icon: '🎤' },
];

const BUILT_IN_DEFS: { name: string; category: SampleCategory; color: string; gen: (ctx: AudioContext) => AudioBuffer }[] = [
  { name: 'Kick', category: 'drums', color: '#ef4444', gen: generateKick },
  { name: 'Snare', category: 'drums', color: '#f97316', gen: generateSnare },
  { name: 'HiHat (Closed)', category: 'drums', color: '#eab308', gen: ctx => generateHihat(ctx) },
  { name: 'HiHat (Open)', category: 'drums', color: '#84cc16', gen: ctx => generateHihat(ctx, 0.15, true) },
  { name: 'Clap', category: 'drums', color: '#f472b6', gen: generateClap },
  { name: 'Bass Pluck', category: 'bass', color: '#22d3ee', gen: generateBassPluck },
  { name: 'Pad Chord', category: 'synths', color: '#818cf8', gen: generatePad },
  { name: 'Synth Lead', category: 'synths', color: '#a78bfa', gen: generateSynthLead },
  { name: 'FX Riser', category: 'fx', color: '#34d399', gen: generateFxRiser },
  { name: 'Vocal Chop', category: 'vocals', color: '#fb923c', gen: generateVocalChop },
];

function SampleRow({ sample, onPreview, onStop, isPlaying }: {
  sample: Sample;
  onPreview: (s: Sample) => void;
  onStop: () => void;
  isPlaying: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && sample.audioBuffer) {
      drawWaveform(canvasRef.current, sample.audioBuffer, sample.color);
    }
  }, [sample]);

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded group cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-700 transition-all"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('sampleId', sample.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {/* Play button */}
      <button
        onClick={() => isPlaying ? onStop() : onPreview(sample)}
        className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
          isPlaying
            ? 'bg-green-500/20 text-green-400 border border-green-500'
            : 'text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500'
        }`}
      >
        {isPlaying ? <Square size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
      </button>

      {/* Waveform preview */}
      <canvas
        ref={canvasRef}
        width={60} height={24}
        className="rounded flex-shrink-0 bg-gray-900"
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-200 truncate">{sample.name}</div>
        <div className="text-[10px] text-gray-500">{sample.duration.toFixed(2)}s</div>
      </div>

      {/* Color dot */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sample.color }} />
    </div>
  );
}

export default function SampleBrowser() {
  const { samples, setSamples, addSample } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<SampleCategory>('drums');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const currentSource = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Generate built-in samples on first use
  const initSamples = useCallback(async () => {
    if (initialized) return;
    setInitialized(true);
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
  }, [initialized, setSamples]);

  useEffect(() => {
    initSamples();
  }, [initSamples]);

  const handlePreview = useCallback((sample: Sample) => {
    if (!sample.audioBuffer) return;
    const ctx = getAudioContext();
    if (currentSource.current) {
      try { currentSource.current.stop(); } catch {}
    }
    const src = playBuffer(ctx, sample.audioBuffer, 0.8);
    currentSource.current = src;
    setPlayingId(sample.id);
    src.onended = () => setPlayingId(null);
  }, []);

  const handleStop = useCallback(() => {
    if (currentSource.current) {
      try { currentSource.current.stop(); } catch {}
      currentSource.current = null;
    }
    setPlayingId(null);
  }, []);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const ctx = getAudioContext();
    for (const file of Array.from(files)) {
      const arrayBuffer = await file.arrayBuffer();
      try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const sample: Sample = {
          id: `user-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.[^.]+$/, ''),
          category: 'fx',
          duration: audioBuffer.duration,
          color: '#60a5fa',
          isBuiltIn: false,
          audioBuffer,
        };
        addSample(sample);
      } catch {
        console.error('Failed to decode audio file:', file.name);
      }
    }
    e.target.value = '';
  };

  const filtered = samples.filter(s =>
    s.category === activeCategory &&
    (searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Waves className="text-violet-400" size={16} />
            <h2 className="text-white font-semibold text-sm">サンプルブラウザ</h2>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 hover:border-gray-500 transition-colors"
          >
            <Upload size={11} />
            インポート
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.flac,.ogg,.aiff"
            multiple
            className="hidden"
            onChange={handleFileImport}
          />
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="サンプルを検索..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-1 px-2 py-2 border-b border-gray-800 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
              activeCategory === cat.id
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sample list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
            <Music2 size={24} className="mb-2" />
            <p className="text-xs">サンプルがありません</p>
          </div>
        ) : (
          filtered.map(sample => (
            <SampleRow
              key={sample.id}
              sample={sample}
              onPreview={handlePreview}
              onStop={handleStop}
              isPlaying={playingId === sample.id}
            />
          ))
        )}
      </div>

      {/* Drag hint */}
      <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-600 text-center">
        サンプルをタイムラインにドラッグ&ドロップ
      </div>
    </div>
  );
}
