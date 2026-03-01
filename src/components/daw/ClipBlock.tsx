'use client';
import React, { useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Clip, Track } from '@/types';

interface Props {
  clip: Clip;
  track: Track;
  pixelsPerBeat: number;
}

export default function ClipBlock({ clip, track, pixelsPerBeat }: Props) {
  const { removeClip, selectClip, selectedClipId, updateClip, openPianoRoll } = useAppStore();
  const isSelected = selectedClipId === clip.id;
  const isDragging = useRef(false);
  const [dragging, setDragging] = useState(false);

  const left  = clip.startBeat * pixelsPerBeat;
  const width = Math.max(clip.lengthBeats * pixelsPerBeat, 24);

  /* ── Drag to move ── */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).dataset.resize) return;
    e.stopPropagation();
    selectClip(clip.id);
    isDragging.current = true;
    setDragging(true);

    const startX  = e.clientX;
    const startBeat = clip.startBeat;

    const onMove = (ev: MouseEvent) => {
      const dx    = ev.clientX - startX;
      const delta = dx / pixelsPerBeat;
      const snap  = Math.round((startBeat + delta) * 4) / 4;
      updateClip(track.id, clip.id, { startBeat: Math.max(0, snap) });
    };
    const onUp = () => {
      isDragging.current = false;
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [clip, track.id, pixelsPerBeat, selectClip, updateClip]);

  /* ── Double-click → piano roll (MIDI) ── */
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (track.type === 'midi') openPianoRoll(clip.id);
  };

  /* ── Right-click → delete ── */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeClip(track.id, clip.id);
  };

  /* ── Resize handle ── */
  const handleResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX   = e.clientX;
    const startLen = clip.lengthBeats;

    const onMove = (ev: MouseEvent) => {
      const dx     = ev.clientX - startX;
      const newLen = Math.max(0.25, Math.round((startLen + dx / pixelsPerBeat) * 4) / 4);
      updateClip(track.id, clip.id, { lengthBeats: newLen });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const hasNotes = (clip.midiNotes?.length ?? 0) > 0;

  return (
    <div
      className={`absolute top-1.5 bottom-1.5 rounded-lg overflow-hidden select-none
        cursor-grab active:cursor-grabbing transition-[box-shadow,opacity]
        ${isSelected ? 'ring-2 ring-white/70 shadow-xl' : 'hover:ring-1 hover:ring-white/30'}
        ${dragging ? 'opacity-75 shadow-2xl scale-[1.01]' : ''}
      `}
      style={{
        left,
        width,
        background: `linear-gradient(135deg, ${clip.color}dd 0%, ${clip.color}99 100%)`,
        borderLeft: `3px solid ${clip.color}`,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      title={`${clip.name}${track.type === 'midi' ? ' (ダブルクリックでピアノロール)' : ''} | 右クリックで削除`}
    >
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-20"
        style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 4px)' }}
      />

      {/* Content area */}
      <div className="relative h-full flex flex-col px-1.5 py-1 gap-0.5">
        {/* Label */}
        <span className="text-[10px] font-semibold text-white/90 truncate leading-none">
          {clip.name}
        </span>

        {/* Visual preview */}
        <div className="flex-1 flex items-center">
          {track.type === 'midi' && hasNotes ? (
            <MidiMiniature clip={clip} />
          ) : track.type === 'midi' && !hasNotes ? (
            <span className="text-[9px] text-white/40 italic">空のクリップ</span>
          ) : (
            <WaveformMiniature color={clip.color} width={width} />
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        data-resize="true"
        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize
          flex items-center justify-center opacity-0 hover:opacity-100
          bg-black/20 hover:bg-black/40 transition-opacity group"
        onMouseDown={handleResizeDown}
      >
        <div className="w-0.5 h-4 bg-white/40 rounded-full" />
      </div>
    </div>
  );
}

/* ── Mini MIDI note preview ── */
function MidiMiniature({ clip }: { clip: Clip }) {
  const notes = clip.midiNotes ?? [];
  if (notes.length === 0) return null;

  const minP = Math.min(...notes.map(n => n.pitch));
  const maxP = Math.max(...notes.map(n => n.pitch));
  const range = Math.max(maxP - minP, 1);
  const totalLen = clip.lengthBeats;

  return (
    <div className="relative w-full h-full">
      {notes.map(note => {
        const xPct = (note.startBeat / totalLen) * 100;
        const yPct = ((maxP - note.pitch) / range) * 70 + 10;
        const wPct = Math.max(2, (note.lengthBeats / totalLen) * 100);
        return (
          <div
            key={note.id}
            className="absolute h-[3px] rounded-sm bg-white/80"
            style={{ left: `${xPct}%`, top: `${yPct}%`, width: `${wPct}%` }}
          />
        );
      })}
    </div>
  );
}

/* ── Waveform-like bars ── */
function WaveformMiniature({ color, width }: { color: string; width: number }) {
  const bars = Math.max(4, Math.floor(width / 5));
  // Deterministic pseudo-random heights based on bar index
  return (
    <div className="flex items-center gap-[1px] w-full h-full opacity-50">
      {Array.from({ length: bars }, (_, i) => {
        const h = 20 + ((Math.sin(i * 1.3) + Math.sin(i * 0.7)) * 0.5 + 0.5) * 60;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-white/70"
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}
