'use client';
import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Track } from '@/types';
import { Trash2, Mic, Piano, Layers } from 'lucide-react';

const TYPE_META: Record<Track['type'], { label: string; icon: React.ReactNode; color: string }> = {
  audio:  { label: 'AUDIO', icon: <Mic size={9} />,    color: '#22d3ee' },
  midi:   { label: 'MIDI',  icon: <Piano size={9} />,  color: '#a78bfa' },
  sample: { label: 'SMPL',  icon: <Layers size={9} />, color: '#f97316' },
};

interface Props { track: Track; }

export default function TrackHeader({ track }: Props) {
  const { updateTrack, removeTrack, selectTrack, selectedTrackId } = useAppStore();
  const isSelected = selectedTrackId === track.id;
  const meta = TYPE_META[track.type];

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-2 border-b border-gray-800/70 cursor-pointer
        h-[68px] transition-all group
        ${isSelected ? 'bg-gray-800/60' : 'hover:bg-gray-800/30'}`}
      style={isSelected ? { boxShadow: `inset 3px 0 0 ${track.color}` } : { boxShadow: 'inset 3px 0 0 transparent' }}
      onClick={() => selectTrack(track.id)}
    >
      {/* Color strip */}
      <div className="w-1 self-stretch rounded-full flex-shrink-0 opacity-90" style={{ background: track.color }} />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Name + type badge */}
        <div className="flex items-center gap-1">
          <input
            value={track.name}
            onChange={e => updateTrack(track.id, { name: e.target.value })}
            onClick={e => e.stopPropagation()}
            className="bg-transparent text-white text-[11px] font-semibold w-full focus:outline-none truncate placeholder-gray-600"
            maxLength={16}
          />
          <span
            className="flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
            style={{ background: `${meta.color}22`, color: meta.color }}
          >
            {meta.icon}
            {meta.label}
          </span>
        </div>

        {/* Volume fader */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-600 w-3 text-right flex-shrink-0">
            {Math.round(track.volume * 100)}
          </span>
          <input
            type="range" min={0} max={1} step={0.01}
            value={track.volume}
            onChange={e => updateTrack(track.id, { volume: Number(e.target.value) })}
            onClick={e => e.stopPropagation()}
            className="flex-1 h-1"
            style={{ accentColor: track.color }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        {/* Mute */}
        <button
          onClick={e => { e.stopPropagation(); updateTrack(track.id, { muted: !track.muted }); }}
          title="ミュート"
          className={`w-5 h-5 rounded text-[9px] font-black border transition-all flex items-center justify-center
            ${track.muted
              ? 'border-yellow-500/70 bg-yellow-500/20 text-yellow-400'
              : 'border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
            }`}
        >M</button>

        {/* Solo */}
        <button
          onClick={e => { e.stopPropagation(); updateTrack(track.id, { soloed: !track.soloed }); }}
          title="ソロ"
          className={`w-5 h-5 rounded text-[9px] font-black border transition-all flex items-center justify-center
            ${track.soloed
              ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-400'
              : 'border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
            }`}
        >S</button>

        {/* Delete – only on hover */}
        <button
          onClick={e => { e.stopPropagation(); removeTrack(track.id); }}
          title="トラック削除"
          className="w-5 h-5 rounded border border-transparent text-transparent
            group-hover:border-gray-700 group-hover:text-gray-700
            hover:!border-red-500 hover:!text-red-400 transition-all flex items-center justify-center"
        >
          <Trash2 size={9} />
        </button>
      </div>
    </div>
  );
}
