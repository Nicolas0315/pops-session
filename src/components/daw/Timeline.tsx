'use client';
import React, { useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ClipBlock from './ClipBlock';

const TRACK_HEIGHT = 68;

export default function Timeline() {
  const { tracks, transport, pixelsPerBeat, addClip, selectClip, samples } = useAppStore();
  const { currentBeat, timeSignatureNum, bpm } = transport;
  const containerRef = useRef<HTMLDivElement>(null);

  const totalBeats = 128;
  const totalWidth = totalBeats * pixelsPerBeat;

  // Grid lines
  const barLines: number[] = [];
  const beatLines: number[] = [];
  for (let b = 0; b <= totalBeats; b++) {
    if (b % timeSignatureNum === 0) barLines.push(b);
    else beatLines.push(b);
  }

  const handleLaneClick = (e: React.MouseEvent, trackId: string, trackType: string) => {
    // Don't create if clicking on an existing clip
    if ((e.target as HTMLElement).closest('[data-clip]')) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const scrollLeft = containerRef.current?.scrollLeft ?? 0;
    const x = e.clientX - rect.left + scrollLeft;
    const beat = Math.round((x / pixelsPerBeat) * 4) / 4; // snap to 1/4 beat
    const track = tracks.find(t => t.id === trackId);

    addClip(trackId, {
      trackId,
      startBeat: beat,
      lengthBeats: timeSignatureNum,
      color: track?.color ?? '#818cf8',
      name: trackType === 'midi' ? 'MIDI クリップ' : trackType === 'sample' ? 'サンプル' : 'オーディオ',
      midiNotes: trackType === 'midi' ? [] : undefined,
    });
  };

  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const sampleId = e.dataTransfer.getData('sampleId');
    if (!sampleId) return;
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const scrollLeft = containerRef.current?.scrollLeft ?? 0;
    const x = e.clientX - rect.left + scrollLeft;
    const beat = Math.round((x / pixelsPerBeat) * 4) / 4;
    const lengthBeats = Math.max(1, (sample.duration / (60 / bpm)));

    addClip(trackId, {
      trackId,
      startBeat: beat,
      lengthBeats,
      color: sample.color,
      name: sample.name,
      sampleId,
    });
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-gray-950" style={{ scrollbarGutter: 'stable' }}>
      <div style={{ width: totalWidth, minHeight: tracks.length * TRACK_HEIGHT + 24 }} className="relative">

        {/* ── Ruler ── */}
        <div className="sticky top-0 z-20 bg-gray-950 border-b border-gray-800" style={{ height: 24, width: totalWidth }}>
          {barLines.map(b => (
            <React.Fragment key={b}>
              <div className="absolute top-0 bottom-0 flex items-end pb-0.5" style={{ left: b * pixelsPerBeat }}>
                <div className="absolute top-0 bottom-0 w-px bg-gray-700" />
                <span className="text-[10px] text-gray-500 ml-1 font-mono select-none leading-none">
                  {Math.floor(b / timeSignatureNum) + 1}
                </span>
              </div>
            </React.Fragment>
          ))}
          {beatLines.map(b => (
            <div key={b} className="absolute top-3 bottom-0 w-px bg-gray-800/60" style={{ left: b * pixelsPerBeat }} />
          ))}
        </div>

        {/* ── Track lanes ── */}
        {tracks.map((track) => (
          <div
            key={track.id}
            className="relative border-b border-gray-800/50"
            style={{ height: TRACK_HEIGHT }}
            onClick={e => handleLaneClick(e, track.id, track.type)}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={e => handleDrop(e, track.id)}
          >
            {/* Bar lines */}
            {barLines.map(b => (
              <div key={b} className="absolute top-0 bottom-0 w-px bg-gray-800/70 pointer-events-none" style={{ left: b * pixelsPerBeat }} />
            ))}
            {/* Beat lines */}
            {beatLines.map(b => (
              <div key={b} className="absolute top-0 bottom-0 w-px bg-gray-800/25 pointer-events-none" style={{ left: b * pixelsPerBeat }} />
            ))}

            {/* Subtle lane stripe */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
              style={{ background: `linear-gradient(90deg, ${track.color}, transparent 30%)` }} />

            {/* Clips */}
            {track.clips.map(clip => (
              <div key={clip.id} data-clip="true" className="absolute inset-0 pointer-events-none">
                <div className="pointer-events-auto">
                  <ClipBlock clip={clip} track={track} pixelsPerBeat={pixelsPerBeat} />
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* ── Playhead ── */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-30"
          style={{ left: currentBeat * pixelsPerBeat, width: 2 }}
        >
          {/* Needle */}
          <div className="w-full h-full bg-red-500/80" />
          {/* Head triangle */}
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '8px solid #ef4444',
            }}
          />
        </div>
      </div>
    </div>
  );
}
