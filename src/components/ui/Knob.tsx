'use client';
import React, { useRef, useCallback } from 'react';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label?: string;
  size?: number;
  color?: string;
  logarithmic?: boolean;
}

export default function Knob({ value, min, max, onChange, label, size = 44, color = '#a78bfa', logarithmic }: KnobProps) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const toNorm = (v: number) => {
    if (logarithmic) {
      return (Math.log(v / min)) / (Math.log(max / min));
    }
    return (v - min) / (max - min);
  };

  const fromNorm = (n: number) => {
    if (logarithmic) {
      return min * Math.pow(max / min, n);
    }
    return min + n * (max - min);
  };

  const norm = toNorm(value);
  const angle = -135 + norm * 270;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dy = startY.current - ev.clientY;
      const delta = dy / 150;
      const newNorm = Math.max(0, Math.min(1, toNorm(startVal.current) + delta));
      onChange(fromNorm(newNorm));
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [value, min, max, onChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY / 500;
    const newNorm = Math.max(0, Math.min(1, toNorm(value) + delta));
    onChange(fromNorm(newNorm));
  }, [value]);

  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const rad = (angle * Math.PI) / 180;
  const markerX = cx + r * Math.sin(rad);
  const markerY = cy - r * Math.cos(rad);

  return (
    <div className="flex flex-col items-center gap-0.5 select-none" style={{ width: size }}>
      <svg
        width={size} height={size}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        className="cursor-grab active:cursor-grabbing"
      >
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#374151" strokeWidth={3} />
        {/* Value arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${norm * 1.5 * Math.PI * r} ${2 * Math.PI * r}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-135, ${cx}, ${cy})`}
        />
        {/* Marker line */}
        <line
          x1={cx} y1={cy}
          x2={markerX} y2={markerY}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={size * 0.08} fill="#1f2937" stroke={color} strokeWidth={1.5} />
      </svg>
      {label && (
        <span className="text-[10px] text-gray-400 text-center leading-tight" style={{ maxWidth: size }}>
          {label}
        </span>
      )}
    </div>
  );
}
