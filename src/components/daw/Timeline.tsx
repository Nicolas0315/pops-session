'use client';
import React, { useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ClipBlock from './ClipBlock';

const TRACK_HEIGHT = 72;
const HEADER_WIDTH = 0; // handled in DAW layout

export default function Timeline() {
  const { tracks, transport, pixelsPerBeat, addClip, selectClip, samples } = useAppStore();
  const { currentBeat, timeSignatureNum } = transport;
  const containerRef = useRef<HTMLDivElement>(null);

  const totalBeats = 64;
  const totalWidth = totalBeats * pixelsPerBeat;

  // Bar lines
  const bars: number[] = [];
  for (let b = 0; b <= totalBeats; b += timeSignatureNum) bars.push(b);
  const beatLines: number[] = [];
  for (let b = 0; b <= totalBeats; b++) beatLines.push(b);

  const handleLaneClick = (e: React.MouseEvent, trackId: string, trackType: string) => {
    if ((e.target as HTMLElement).closest('[data-clip]')) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0);
    const beat = Math.round((x / pixelsPerBeat) * 2) / 2;
    const track = tracks.find(t => t.id === trackId);
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#22d3ee', '#818cf8', '#a78bfa', '#ec4899'];
    const color = track?.color ?? colors[0];

    addClip(trackId, {
      trackId,
      startBeat: beat,
      lengthBeats: timeSignatureNum,
      color,
      name: trackType === 'midi' ? 'MIDI Clip' : 'Audio Clip',
      midiNotes: trackType === 'midi' ? [] : undefined,
    });
    selectClip('');
  };

  // Handle drop from sample browser
  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const sampleId = e.dataTransfer.getData('sampleId');
    if (!sampleId) return;
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0);
    const beat = Math.round((x / pixelsPerBeat) * 2) / 2;
    const track = tracks.find(t => t.id === trackId);
    addClip(trackId, {
      trackId,
      startBeat: beat,
      lengthBeats: Math.max(1, sample.duration * (transport.bpm / 60)),
      color: sample.color,
      name: sample.name,
      sampleId,
    });
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-gray-900">
      <div style={{ width: totalWidth, minHeight: tracks.length * TRACK_HEIGHT + 24 }} className="relative">
        {/* Ruler */}
        <div className="sticky top-0 z-20 bg-gray-950 border-b border-gray-700 h-6" style={{ width: totalWidth }}>
          {bars.map(b => (
            <div key={b} className="absolute top-0 bottom-0 flex items-center" style={{ left: b * pixelsPerBeat }}>
              <div className="w-px h-full bg-gray-700" />
              <span className="text-[10px] text-gray-400 ml-1 select-none">
                {Math.floor(b / timeSignatureNum) + 1}
              </span>
            </div>
          ))}
          {beatLines.map(b => {
            if (b % timeSignatureNum === 0) return null;
            return (
              <div key={b} className="absolute top-3 bottom-0 w-px bg-gray-800" style={{ left: b * pixelsPerBeat }} />
            );
          })}
        </div>

        {/* Tracks */}
        {tracks.map((track, i) => (
          <div
            key={track.id}
            className="relative border-b border-gray-800"
            style={{ height: TRACK_HEIGHT }}
            onClick={e => handleLaneClick(e, track.id, track.type)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, track.id)}
          >
            {/* Beat grid lines */}
            {beatLines.map(b => (
              <div
                key={b}
                className={`absolute top-0 bottom-0 w-px pointer-events-none ${b % timeSignatureNum === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}
                style={{ left: b * pixelsPerBeat }}
              />
            ))}

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

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-30"
          style={{ left: currentBeat * pixelsPerBeat }}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full -ml-1 -mt-1" />
        </div>
      </div>
    </div>
  );
}
