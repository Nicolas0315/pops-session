'use client';
import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getAudioContext, Metronome } from '@/lib/audioEngine';
import { Play, Square, Circle, Repeat, SkipBack, ZoomIn, ZoomOut, Music2 } from 'lucide-react';

let metronomeInstance: Metronome | null = null;
let playbackInterval: ReturnType<typeof setInterval> | null = null;

export default function Transport() {
  const {
    transport, setBPM, togglePlay, toggleRecord, toggleLoop, toggleMetronome,
    setCurrentBeat, setTransport, pixelsPerBeat, setPixelsPerBeat,
  } = useAppStore();

  const { bpm, timeSignatureNum, timeSignatureDen, isPlaying, isRecording,
          isLooping, metronomeEnabled, currentBeat } = transport;

  // High-accuracy playback clock using Web Audio time
  useEffect(() => {
    if (isPlaying) {
      const ctx = getAudioContext();
      const startAudioTime = ctx.currentTime;
      const startBeat = currentBeat;
      const spb = 60 / bpm;

      if (playbackInterval) clearInterval(playbackInterval);
      playbackInterval = setInterval(() => {
        const elapsed = ctx.currentTime - startAudioTime;
        setCurrentBeat(startBeat + elapsed / spb);
      }, 33);
    } else {
      if (playbackInterval) { clearInterval(playbackInterval); playbackInterval = null; }
    }
    return () => { if (playbackInterval) { clearInterval(playbackInterval); playbackInterval = null; } };
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
    if (isPlaying) togglePlay();
    setCurrentBeat(0);
  };

  const formatPosition = (beat: number) => {
    const bar = Math.floor(beat / timeSignatureNum) + 1;
    const b   = Math.floor(beat % timeSignatureNum) + 1;
    const t   = Math.floor((beat * 4) % 4);
    return `${String(bar).padStart(3,'0')}:${b}:${t}`;
  };

  const btn = (active: boolean, activeClass: string) =>
    `flex items-center justify-center rounded-lg border transition-all duration-150 select-none
     ${active ? activeClass : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`;

  return (
    <div className="flex items-center gap-2 bg-gray-900 border-b border-gray-800 px-3 py-2 select-none flex-wrap min-h-[52px]">

      {/* ── Transport controls ── */}
      <div className="flex items-center gap-1">
        <button onClick={() => setCurrentBeat(0)}
          className={`${btn(false,'')} w-8 h-8`} title="先頭へ (Home)">
          <SkipBack size={13} />
        </button>

        <button onClick={togglePlay}
          className={`${btn(isPlaying, 'border-emerald-500 bg-emerald-500/15 text-emerald-400 glow-green')} w-10 h-10`}
          title={isPlaying ? '一時停止 (Space)' : '再生 (Space)'}>
          {isPlaying
            ? <div className="flex gap-[3px]"><div className="w-[3px] h-4 bg-current rounded-sm"/><div className="w-[3px] h-4 bg-current rounded-sm"/></div>
            : <Play size={16} fill="currentColor" />}
        </button>

        <button onClick={handleStop}
          className={`${btn(false,'')} w-8 h-8`} title="停止 (Esc)">
          <Square size={12} fill="currentColor" />
        </button>

        <button onClick={toggleRecord}
          className={`${btn(isRecording, 'border-red-500 bg-red-500/15 text-red-400 glow-red animate-pulse')} w-8 h-8`}
          title="録音 (R)">
          <Circle size={13} fill="currentColor" />
        </button>

        <div className="w-px h-6 bg-gray-800 mx-1" />

        <button onClick={toggleLoop}
          className={`${btn(isLooping, 'border-violet-500 bg-violet-500/15 text-violet-400')} w-8 h-8`}
          title="ループ (L)">
          <Repeat size={13} />
        </button>

        <button onClick={toggleMetronome}
          className={`${btn(metronomeEnabled, 'border-amber-500 bg-amber-500/15 text-amber-400')} w-8 h-8`}
          title="メトロノーム (M)">
          <Music2 size={13} />
        </button>
      </div>

      {/* ── Position readout ── */}
      <div className="bg-black border border-gray-800 rounded-lg px-3 py-1.5 font-mono text-emerald-400 text-sm tracking-widest min-w-[100px] text-center shadow-inner">
        {formatPosition(currentBeat)}
      </div>

      {/* ── BPM ── */}
      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">BPM</span>
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              value={bpm}
              min={40} max={250}
              onChange={e => setBPM(Number(e.target.value))}
              className="w-14 bg-black border border-gray-800 rounded-md px-1.5 py-1 text-amber-400 font-mono text-sm text-center focus:outline-none focus:border-violet-600 transition-colors"
            />
            <div className="flex flex-col">
              <button onClick={() => setBPM(Math.min(250, bpm + 1))} className="text-gray-600 hover:text-white text-[10px] leading-none px-0.5">▲</button>
              <button onClick={() => setBPM(Math.max(40,  bpm - 1))} className="text-gray-600 hover:text-white text-[10px] leading-none px-0.5">▼</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Time signature ── */}
      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">拍子</span>
          <div className="flex items-center gap-1">
            <select
              value={timeSignatureNum}
              onChange={e => setTransport({ timeSignatureNum: Number(e.target.value) })}
              className="bg-black border border-gray-800 rounded-md px-1.5 py-1 text-gray-300 text-xs focus:outline-none focus:border-violet-600 transition-colors"
            >
              {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-700 text-sm">/</span>
            <select
              value={timeSignatureDen}
              onChange={e => setTransport({ timeSignatureDen: Number(e.target.value) })}
              className="bg-black border border-gray-800 rounded-md px-1.5 py-1 text-gray-300 text-xs focus:outline-none focus:border-violet-600 transition-colors"
            >
              {[4,8,16].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Zoom ── */}
      <div className="ml-auto flex items-center gap-1">
        <span className="text-[10px] text-gray-600">ズーム</span>
        <button onClick={() => setPixelsPerBeat(Math.max(10, pixelsPerBeat - 10))}
          className="w-7 h-7 bg-gray-900 border border-gray-800 rounded-md text-gray-500 hover:text-white hover:border-gray-600 flex items-center justify-center transition-all">
          <ZoomOut size={12} />
        </button>
        <div className="text-[10px] text-gray-600 w-8 text-center font-mono">{pixelsPerBeat}</div>
        <button onClick={() => setPixelsPerBeat(Math.min(200, pixelsPerBeat + 10))}
          className="w-7 h-7 bg-gray-900 border border-gray-800 rounded-md text-gray-500 hover:text-white hover:border-gray-600 flex items-center justify-center transition-all">
          <ZoomIn size={12} />
        </button>
      </div>
    </div>
  );
}
