'use client';
import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import Transport from './Transport';
import TrackHeader from './TrackHeader';
import Timeline from './Timeline';
import PianoRoll from './PianoRoll';
import { Plus, AudioLines, Piano, Layers } from 'lucide-react';

export default function DAW() {
  const { tracks, addTrack } = useAppStore();

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <Transport />

      <div className="flex flex-1 overflow-hidden">
        {/* Track headers */}
        <div className="w-48 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col overflow-y-auto">
          {/* Ruler spacer */}
          <div className="h-6 bg-gray-950 border-b border-gray-700 flex-shrink-0" />

          {tracks.map(track => (
            <TrackHeader key={track.id} track={track} />
          ))}

          {/* Add track buttons */}
          <div className="p-2 flex flex-col gap-1 border-t border-gray-800 mt-auto">
            <p className="text-[10px] text-gray-500 mb-1">トラック追加</p>
            <button
              onClick={() => addTrack('audio')}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
            >
              <AudioLines size={12} className="text-cyan-400" />
              オーディオ
            </button>
            <button
              onClick={() => addTrack('midi')}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
            >
              <Piano size={12} className="text-violet-400" />
              MIDI
            </button>
            <button
              onClick={() => addTrack('sample')}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
            >
              <Layers size={12} className="text-orange-400" />
              サンプル
            </button>
          </div>
        </div>

        {/* Timeline */}
        <Timeline />
      </div>

      {/* Piano Roll Modal */}
      <PianoRoll />
    </div>
  );
}
