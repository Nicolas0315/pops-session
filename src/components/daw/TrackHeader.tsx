'use client';
import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Track } from '@/types';
import { Volume2, VolumeX, Trash2 } from 'lucide-react';

interface Props {
  track: Track;
}

export default function TrackHeader({ track }: Props) {
  const { updateTrack, removeTrack, selectTrack, selectedTrackId } = useAppStore();
  const isSelected = selectedTrackId === track.id;

  const typeLabel: Record<Track['type'], string> = {
    audio: 'AUDIO',
    midi: 'MIDI',
    sample: 'SMPL',
  };

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 border-b border-gray-800 cursor-pointer h-[72px] transition-colors ${
        isSelected ? 'bg-gray-700' : 'bg-gray-850 hover:bg-gray-800'
      }`}
      style={{ background: isSelected ? `${track.color}22` : undefined }}
      onClick={() => selectTrack(track.id)}
    >
      {/* Color bar */}
      <div className="w-1 h-14 rounded-full flex-shrink-0" style={{ background: track.color }} />

      <div className="flex-1 min-w-0">
        {/* Track name */}
        <input
          value={track.name}
          onChange={e => updateTrack(track.id, { name: e.target.value })}
          onClick={e => e.stopPropagation()}
          className="bg-transparent text-white text-xs font-medium w-full focus:outline-none truncate"
          maxLength={20}
        />

        {/* Type badge */}
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className="text-[9px] font-bold px-1 py-0.5 rounded"
            style={{ background: `${track.color}33`, color: track.color }}
          >
            {typeLabel[track.type]}
          </span>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-1 mt-1">
          <Volume2 size={10} className="text-gray-500 flex-shrink-0" />
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={track.volume}
            onChange={e => updateTrack(track.id, { volume: Number(e.target.value) })}
            onClick={e => e.stopPropagation()}
            className="w-full h-1 accent-violet-400"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); updateTrack(track.id, { muted: !track.muted }); }}
          className={`w-6 h-6 rounded text-[10px] font-bold border transition-colors ${
            track.muted
              ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
              : 'border-gray-700 text-gray-500 hover:border-gray-500'
          }`}
          title="ミュート"
        >
          M
        </button>
        <button
          onClick={e => { e.stopPropagation(); updateTrack(track.id, { soloed: !track.soloed }); }}
          className={`w-6 h-6 rounded text-[10px] font-bold border transition-colors ${
            track.soloed
              ? 'border-green-500 bg-green-500/20 text-green-400'
              : 'border-gray-700 text-gray-500 hover:border-gray-500'
          }`}
          title="ソロ"
        >
          S
        </button>
        <button
          onClick={e => { e.stopPropagation(); removeTrack(track.id); }}
          className="w-6 h-6 rounded border border-gray-700 text-gray-600 hover:border-red-500 hover:text-red-400 transition-colors flex items-center justify-center"
          title="削除"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}
