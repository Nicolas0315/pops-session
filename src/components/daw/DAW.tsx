'use client';
import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import Transport from './Transport';
import TrackHeader from './TrackHeader';
import Timeline from './Timeline';
import PianoRoll from './PianoRoll';
import { Mic, Piano, Layers, PlusCircle } from 'lucide-react';

export default function DAW() {
  const { tracks, addTrack } = useAppStore();

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <Transport />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Track headers ── */}
        <div className="w-44 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
          {/* Spacer aligns with ruler */}
          <div className="h-6 bg-gray-950 border-b border-gray-800 flex-shrink-0" />

          {tracks.map(track => (
            <TrackHeader key={track.id} track={track} />
          ))}

          {/* Add track buttons */}
          <div className="mt-auto border-t border-gray-800 p-2 space-y-0.5">
            <p className="text-[9px] uppercase tracking-widest text-gray-700 px-1 mb-1">トラック追加</p>
            {([
              { type: 'audio',  label: 'オーディオ', icon: <Mic  size={11} />, color: 'text-cyan-400' },
              { type: 'midi',   label: 'MIDI',       icon: <Piano size={11} />, color: 'text-violet-400' },
              { type: 'sample', label: 'サンプル',    icon: <Layers size={11} />, color: 'text-orange-400' },
            ] as const).map(({ type, label, icon, color }) => (
              <button
                key={type}
                onClick={() => addTrack(type)}
                className="flex items-center gap-2 w-full text-[11px] text-gray-500 hover:text-white
                  px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-all group"
              >
                <span className={`${color} group-hover:scale-110 transition-transform`}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Timeline ── */}
        <Timeline />
      </div>

      {/* ── Piano Roll modal ── */}
      <PianoRoll />
    </div>
  );
}
