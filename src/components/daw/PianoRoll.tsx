'use client';
import React, { useRef, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';

const PITCH_HEIGHT = 14;
const NOTE_RANGE = 48; // C2 to B5
const BASE_PITCH = 36; // C2

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_KEYS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

export default function PianoRoll() {
  const { tracks, pianoRollClipId, openPianoRoll, addMidiNote, removeMidiNote, pixelsPerBeat } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const clip = useMemo(() => {
    for (const track of tracks) {
      const c = track.clips.find(c => c.id === pianoRollClipId);
      if (c) return c;
    }
    return null;
  }, [tracks, pianoRollClipId]);

  if (!pianoRollClipId || !clip) return null;

  const totalWidth = clip.lengthBeats * pixelsPerBeat;

  const handleClick = (e: React.MouseEvent, pitch: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const beatStart = x / pixelsPerBeat;
    addMidiNote(clip.id, {
      pitch: BASE_PITCH + NOTE_RANGE - 1 - pitch,
      startBeat: Math.round(beatStart * 4) / 4,
      lengthBeats: 0.5,
      velocity: 100,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-semibold">ピアノロール — {clip.name}</h3>
          <button
            onClick={() => openPianoRoll(null)}
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Piano keys */}
          <div className="flex-shrink-0 w-14 overflow-y-auto bg-gray-950">
            {Array.from({ length: NOTE_RANGE }, (_, i) => {
              const pitch = BASE_PITCH + NOTE_RANGE - 1 - i;
              const noteIndex = pitch % 12;
              const isBlack = BLACK_KEYS.includes(noteIndex);
              const noteName = NOTE_NAMES[noteIndex];
              return (
                <div
                  key={i}
                  className={`border-b border-gray-800 flex items-center justify-end pr-1 text-[8px] font-mono select-none ${
                    isBlack ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'
                  }`}
                  style={{ height: PITCH_HEIGHT }}
                >
                  {noteIndex === 0 ? noteName + Math.floor(pitch / 12 - 1) : (isBlack ? '' : noteName)}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto" ref={containerRef}>
            <div className="relative" style={{ width: totalWidth, height: NOTE_RANGE * PITCH_HEIGHT }}>
              {/* Horizontal pitch lines */}
              {Array.from({ length: NOTE_RANGE }, (_, i) => {
                const pitch = BASE_PITCH + NOTE_RANGE - 1 - i;
                const isBlack = BLACK_KEYS.includes(pitch % 12);
                return (
                  <div
                    key={i}
                    className={`absolute w-full border-b cursor-crosshair ${
                      isBlack ? 'bg-gray-800/30 border-gray-800' : 'bg-transparent border-gray-800/50'
                    }`}
                    style={{ top: i * PITCH_HEIGHT, height: PITCH_HEIGHT }}
                    onClick={e => handleClick(e, i)}
                  />
                );
              })}

              {/* Beat grid */}
              {Array.from({ length: clip.lengthBeats * 4 }, (_, i) => (
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 w-px pointer-events-none ${
                    i % 4 === 0 ? 'bg-gray-600' : i % 2 === 0 ? 'bg-gray-700/60' : 'bg-gray-800/40'
                  }`}
                  style={{ left: (i / 4) * pixelsPerBeat }}
                />
              ))}

              {/* Notes */}
              {(clip.midiNotes ?? []).map(note => {
                const row = BASE_PITCH + NOTE_RANGE - 1 - note.pitch;
                return (
                  <div
                    key={note.id}
                    className="absolute rounded-sm cursor-pointer hover:brightness-125 group"
                    style={{
                      top: row * PITCH_HEIGHT + 1,
                      left: note.startBeat * pixelsPerBeat,
                      width: Math.max(8, note.lengthBeats * pixelsPerBeat - 2),
                      height: PITCH_HEIGHT - 2,
                      background: clip.color,
                      opacity: 0.9,
                    }}
                    onClick={e => e.stopPropagation()}
                    onContextMenu={e => { e.preventDefault(); removeMidiNote(clip.id, note.id); }}
                    title="右クリックで削除"
                  >
                    <div className="w-full h-full flex items-center px-0.5">
                      <div className="w-1 h-1 rounded-full bg-white/60 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
          クリックでノート追加 / 右クリックで削除
        </div>
      </div>
    </div>
  );
}
