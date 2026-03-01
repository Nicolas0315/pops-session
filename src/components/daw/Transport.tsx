'use client';
import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getAudioContext, Metronome } from '@/lib/audioEngine';
import {
  Play, Square, Circle, Repeat, Music, SkipBack,
  Metronome as MetronomeIcon,
  ZoomIn, ZoomOut
} from 'lucide-react';

let metronomeInstance: Metronome | null = null;
let playbackInterval: ReturnType<typeof setInterval> | null = null;

export default function Transport() {
  const {
    transport, setBPM, togglePlay, toggleRecord, toggleLoop, toggleMetronome,
    setCurrentBeat, setTransport, pixelsPerBeat, setPixelsPerBeat,
  } = useAppStore();

  const { bpm, timeSignatureNum, timeSignatureDen, isPlaying, isRecording, isLooping, metronomeEnabled, currentBeat } = transport;

  // Playback clock
  useEffect(() => {
    if (isPlaying) {
      const ctx = getAudioContext();
      const startTime = ctx.currentTime;
      const startBeat = currentBeat;
      const secondsPerBeat = 60 / bpm;

      if (playbackInterval) clearInterval(playbackInterval);
      playbackInterval = setInterval(() => {
        const elapsed = ctx.currentTime - startTime;
        const newBeat = startBeat + elapsed / secondsPerBeat;
        setCurrentBeat(newBeat);
      }, 50);
    } else {
      if (playbackInterval) { clearInterval(playbackInterval); playbackInterval = null; }
    }
    return () => { if (playbackInterval) clearInterval(playbackInterval); };
  }, [isPlaying, bpm]);

  // Metronome
  useEffect(() => {
    const ctx = getAudioContext();
    if (!metronomeInstance) metronomeInstance = new Metronome(ctx);
    if (isPlaying && metronomeEnabled) {
      metronomeInstance.start(bpm, timeSignatureNum);
    } else {
      metronomeInstance.stop();
    }
  }, [isPlaying, metronomeEnabled, bpm, timeSignatureNum]);

  const handleStop = () => {
    if (transport.isPlaying) togglePlay();
    setCurrentBeat(0);
  };

  const formatBeat = (beat: number) => {
    const bar = Math.floor(beat / timeSignatureNum) + 1;
    const b = Math.floor(beat % timeSignatureNum) + 1;
    return `${bar}:${b}`;
  };

  const btnBase = 'flex items-center justify-center rounded-lg transition-all duration-150 border';

  return (
    <div className="flex items-center gap-3 bg-gray-900 border-b border-gray-700 px-4 py-2 select-none flex-wrap">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Music size={14} className="text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Pops Session</span>
      </div>

      {/* Transport buttons */}
      <div className="flex items-center gap-1.5">
        {/* Skip back */}
        <button
          onClick={() => setCurrentBeat(0)}
          className={`${btnBase} w-8 h-8 border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white`}
          title="先頭へ"
        >
          <SkipBack size={14} />
        </button>

        {/* Play */}
        <button
          onClick={togglePlay}
          className={`${btnBase} w-10 h-10 ${isPlaying
            ? 'border-green-500 bg-green-500/20 text-green-400'
            : 'border-gray-600 hover:border-green-500 text-gray-300 hover:text-green-400'}`}
          title="再生/停止"
        >
          {isPlaying
            ? <div className="flex gap-0.5"><div className="w-1 h-4 bg-current rounded-sm"/><div className="w-1 h-4 bg-current rounded-sm"/></div>
            : <Play size={16} fill="currentColor" />}
        </button>

        {/* Stop */}
        <button
          onClick={handleStop}
          className={`${btnBase} w-8 h-8 border-gray-600 hover:border-red-500 text-gray-300 hover:text-red-400`}
          title="停止"
        >
          <Square size={14} fill="currentColor" />
        </button>

        {/* Record */}
        <button
          onClick={toggleRecord}
          className={`${btnBase} w-8 h-8 ${isRecording
            ? 'border-red-500 bg-red-500/20 text-red-400 animate-pulse'
            : 'border-gray-600 hover:border-red-500 text-gray-300 hover:text-red-400'}`}
          title="録音"
        >
          <Circle size={14} fill="currentColor" />
        </button>

        {/* Loop */}
        <button
          onClick={toggleLoop}
          className={`${btnBase} w-8 h-8 ${isLooping
            ? 'border-violet-500 bg-violet-500/20 text-violet-400'
            : 'border-gray-600 hover:border-violet-500 text-gray-300 hover:text-violet-400'}`}
          title="ループ"
        >
          <Repeat size={14} />
        </button>

        {/* Metronome */}
        <button
          onClick={toggleMetronome}
          className={`${btnBase} w-8 h-8 ${metronomeEnabled
            ? 'border-amber-500 bg-amber-500/20 text-amber-400'
            : 'border-gray-600 hover:border-amber-500 text-gray-300 hover:text-amber-400'}`}
          title="メトロノーム"
        >
          <Music size={14} />
        </button>
      </div>

      {/* Position display */}
      <div className="bg-black border border-gray-700 rounded px-3 py-1 font-mono text-green-400 text-sm min-w-[70px] text-center">
        {formatBeat(currentBeat)}
      </div>

      {/* BPM */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 text-xs">BPM</span>
        <input
          type="number"
          value={bpm}
          min={40} max={240}
          onChange={e => setBPM(Number(e.target.value))}
          className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-green-400 font-mono text-sm text-center focus:outline-none focus:border-violet-500"
        />
        <div className="flex flex-col gap-0.5">
          <button onClick={() => setBPM(Math.min(240, bpm + 1))} className="text-gray-500 hover:text-white text-xs leading-none">▲</button>
          <button onClick={() => setBPM(Math.max(40, bpm - 1))} className="text-gray-500 hover:text-white text-xs leading-none">▼</button>
        </div>
      </div>

      {/* Time signature */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-xs">拍子</span>
        <select
          value={timeSignatureNum}
          onChange={e => setTransport({ timeSignatureNum: Number(e.target.value) })}
          className="bg-black border border-gray-700 rounded px-1.5 py-1 text-gray-300 text-xs focus:outline-none focus:border-violet-500"
        >
          {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-gray-500 text-xs">/</span>
        <select
          value={timeSignatureDen}
          onChange={e => setTransport({ timeSignatureDen: Number(e.target.value) })}
          className="bg-black border border-gray-700 rounded px-1.5 py-1 text-gray-300 text-xs focus:outline-none focus:border-violet-500"
        >
          {[4, 8, 16].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-gray-400 text-xs">ズーム</span>
        <button
          onClick={() => setPixelsPerBeat(Math.max(10, pixelsPerBeat - 10))}
          className="w-7 h-7 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center"
        >
          <ZoomOut size={12} />
        </button>
        <button
          onClick={() => setPixelsPerBeat(Math.min(200, pixelsPerBeat + 10))}
          className="w-7 h-7 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center"
        >
          <ZoomIn size={12} />
        </button>
      </div>
    </div>
  );
}
