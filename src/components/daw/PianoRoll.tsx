'use client';
import React, { useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getAudioContext, SynthEngine } from '@/lib/audioEngine';

const PITCH_H    = 16;    // px per pitch row
const NOTE_RANGE = 48;    // C3 – B6
const BASE_PITCH = 48;    // C3
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BLACK_KEYS = new Set([1,3,6,8,10]);

let _synth: SynthEngine | null = null;

export default function PianoRoll() {
  const { tracks, pianoRollClipId, openPianoRoll, addMidiNote, removeMidiNote, pixelsPerBeat, synthPreset } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Find clip */
  const { clip, track } = useMemo(() => {
    for (const t of tracks) {
      const c = t.clips.find(c => c.id === pianoRollClipId);
      if (c) return { clip: c, track: t };
    }
    return { clip: null, track: null };
  }, [tracks, pianoRollClipId]);

  if (!pianoRollClipId || !clip) return null;

  const totalWidth = clip.lengthBeats * pixelsPerBeat;
  const totalH     = NOTE_RANGE * PITCH_H;
  const subBeats   = clip.lengthBeats * 4; // sixteenth-note grid

  /* Play note on click */
  const ensureSynth = () => {
    const ctx = getAudioContext();
    if (!_synth) _synth = new SynthEngine(ctx);
    return _synth;
  };

  const handleGridClick = (e: React.MouseEvent, rowIdx: number) => {
    if ((e.target as HTMLElement).closest('[data-note]')) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    const x = e.clientX - rect.left + scrollLeft;
    const beatStart = Math.round((x / pixelsPerBeat) * 4) / 4;
    const pitch = BASE_PITCH + NOTE_RANGE - 1 - rowIdx;

    addMidiNote(clip.id, { pitch, startBeat: beatStart, lengthBeats: 0.5, velocity: 100 });

    // Audition note
    try {
      const s = ensureSynth();
      s.noteOn(pitch, 100, synthPreset);
      setTimeout(() => s.noteOff(pitch, synthPreset.envelope), 300);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-sm" style={{ background: clip.color }} />
            <h3 className="text-white font-semibold text-sm">{clip.name}</h3>
            <span className="text-xs text-gray-500">ピアノロール</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>クリック: ノート追加</span>
            <span>右クリック: 削除</span>
            <button
              onClick={() => openPianoRoll(null)}
              className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 flex items-center justify-center transition-all ml-2"
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Piano keys column */}
          <div className="flex-shrink-0 w-14 overflow-y-auto bg-gray-950 border-r border-gray-800">
            {Array.from({ length: NOTE_RANGE }, (_, i) => {
              const pitch     = BASE_PITCH + NOTE_RANGE - 1 - i;
              const noteIdx   = pitch % 12;
              const isBlack   = BLACK_KEYS.has(noteIdx);
              const noteName  = NOTE_NAMES[noteIdx];
              const isC       = noteIdx === 0;
              const octave    = Math.floor(pitch / 12) - 1;

              return (
                <div
                  key={i}
                  className={`flex items-center justify-end pr-1.5 border-b select-none
                    ${isBlack ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}
                  `}
                  style={{ height: PITCH_H }}
                >
                  <span className={`text-[8px] font-mono leading-none ${isBlack ? 'text-gray-500' : isC ? 'text-gray-700 font-bold' : 'text-gray-500'}`}>
                    {isC ? `C${octave}` : isBlack ? '' : noteName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid + notes */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div
              className="relative"
              style={{ width: totalWidth, height: totalH }}
              onClick={e => {
                if ((e.target as HTMLElement).closest('[data-note]')) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const y = e.clientY - rect.top;
                const rowIdx = Math.floor(y / PITCH_H);
                handleGridClick(e, rowIdx);
              }}
            >
              {/* Row backgrounds */}
              {Array.from({ length: NOTE_RANGE }, (_, i) => {
                const pitch   = BASE_PITCH + NOTE_RANGE - 1 - i;
                const noteIdx = pitch % 12;
                const isBlack = BLACK_KEYS.has(noteIdx);
                const isC     = noteIdx === 0;
                return (
                  <div
                    key={i}
                    className={`absolute w-full border-b cursor-crosshair
                      ${isBlack ? 'bg-gray-800/30 border-gray-800' : 'border-gray-800/40'}
                      ${isC ? 'border-b border-gray-600/50' : ''}
                    `}
                    style={{ top: i * PITCH_H, height: PITCH_H }}
                  />
                );
              })}

              {/* Beat/sub-beat grid */}
              {Array.from({ length: Math.ceil(clip.lengthBeats * 4) + 1 }, (_, i) => {
                const beat = i / 4;
                const isBar = i % (4 * 1) === 0; // quarter note
                const isBeat = i % 4 === 0;
                return (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 w-px pointer-events-none
                      ${isBeat ? 'bg-gray-600/50' : 'bg-gray-800/40'}
                    `}
                    style={{ left: beat * pixelsPerBeat }}
                  />
                );
              })}

              {/* MIDI notes */}
              {(clip.midiNotes ?? []).map(note => {
                const rowIdx = BASE_PITCH + NOTE_RANGE - 1 - note.pitch;
                const top    = rowIdx * PITCH_H;
                const left   = note.startBeat * pixelsPerBeat;
                const width  = Math.max(8, note.lengthBeats * pixelsPerBeat - 2);

                return (
                  <div
                    key={note.id}
                    data-note="true"
                    className="absolute rounded-sm cursor-pointer group"
                    style={{
                      top: top + 1,
                      left,
                      width,
                      height: PITCH_H - 2,
                      background: `linear-gradient(90deg, ${clip.color}, ${clip.color}aa)`,
                      boxShadow: `0 1px 4px ${clip.color}66`,
                    }}
                    onContextMenu={e => { e.preventDefault(); removeMidiNote(clip.id, note.id); }}
                    title="右クリックで削除"
                  >
                    {/* Velocity indicator */}
                    <div
                      className="absolute left-0 bottom-0 w-full rounded-b-sm opacity-40"
                      style={{ height: `${(note.velocity / 127) * 40}%`, background: 'white' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats footer */}
        <div className="px-5 py-2 border-t border-gray-800 flex items-center gap-4 text-xs text-gray-600 flex-shrink-0">
          <span>ノート数: <span className="text-gray-400">{clip.midiNotes?.length ?? 0}</span></span>
          <span>長さ: <span className="text-gray-400">{clip.lengthBeats} beats</span></span>
          <span>解像度: <span className="text-gray-400">1/4 beat</span></span>
        </div>
      </div>
    </div>
  );
}
