'use client';
import React, { useRef, useState } from 'react';
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
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartBeat = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const left = clip.startBeat * pixelsPerBeat;
  const width = Math.max(clip.lengthBeats * pixelsPerBeat, 20);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectClip(clip.id);
    dragging.current = true;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartBeat.current = clip.startBeat;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragStartX.current;
      const beatDelta = dx / pixelsPerBeat;
      const newStart = Math.max(0, Math.round((dragStartBeat.current + beatDelta) * 2) / 2);
      updateClip(track.id, clip.id, { startBeat: newStart });
    };

    const onUp = () => {
      dragging.current = false;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (track.type === 'midi') openPianoRoll(clip.id);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeClip(track.id, clip.id);
  };

  // Resize handle
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startLen = clip.lengthBeats;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newLen = Math.max(0.5, Math.round((startLen + dx / pixelsPerBeat) * 2) / 2);
      updateClip(track.id, clip.id, { lengthBeats: newLen });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className={`absolute top-1 bottom-1 rounded overflow-hidden cursor-grab active:cursor-grabbing group transition-shadow ${
        isSelected ? 'ring-2 ring-white shadow-lg' : 'hover:ring-1 hover:ring-gray-400'
      } ${isDragging ? 'opacity-80 shadow-xl' : ''}`}
      style={{
        left, width,
        background: `${clip.color}cc`,
        borderLeft: `3px solid ${clip.color}`,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      title="右クリックで削除 / ダブルクリックでピアノロール"
    >
      {/* Mini waveform for sample/audio clips */}
      <div className="w-full h-full flex items-center px-1.5">
        {track.type === 'midi' ? (
          <MiniMidiPreview clip={clip} />
        ) : (
          <div className="flex items-center gap-0.5 w-full h-full opacity-60">
            {Array.from({ length: Math.max(4, Math.floor(width / 6)) }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 flex-shrink-0 rounded-full"
                style={{
                  background: 'white',
                  height: `${20 + Math.sin(i * 1.5) * 40 + Math.random() * 20}%`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name label */}
      <div className="absolute top-0.5 left-1.5 text-[10px] text-white font-semibold truncate leading-tight pointer-events-none" style={{ maxWidth: width - 20 }}>
        {clip.name}
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}

function MiniMidiPreview({ clip }: { clip: Clip }) {
  const notes = clip.midiNotes ?? [];
  if (notes.length === 0) {
    return <div className="text-white/40 text-[9px]">MIDI</div>;
  }
  const minP = Math.min(...notes.map(n => n.pitch));
  const maxP = Math.max(...notes.map(n => n.pitch));
  const range = Math.max(maxP - minP, 1);

  return (
    <div className="w-full h-full relative">
      {notes.map(note => {
        const x = (note.startBeat / (clip.lengthBeats || 1)) * 100;
        const y = ((maxP - note.pitch) / range) * 80;
        const w = Math.max(2, (note.lengthBeats / (clip.lengthBeats || 1)) * 100);
        return (
          <div
            key={note.id}
            className="absolute h-1 rounded-sm"
            style={{
              left: `${x}%`, top: `${10 + y}%`, width: `${w}%`,
              background: 'white', opacity: 0.9
            }}
          />
        );
      })}
    </div>
  );
}
