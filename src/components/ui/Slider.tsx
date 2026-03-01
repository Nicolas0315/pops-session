'use client';
import React from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  vertical?: boolean;
  color?: string;
  className?: string;
}

export default function Slider({ value, min, max, step = 0.01, onChange, label, vertical, color = '#a78bfa', className = '' }: SliderProps) {
  const norm = (value - min) / (max - min);

  return (
    <div className={`flex ${vertical ? 'flex-col-reverse items-center' : 'flex-col'} gap-1 ${className}`}>
      {label && <span className="text-[10px] text-gray-400">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`${vertical ? 'slider-vertical' : 'w-full'} accent-violet-400`}
        style={vertical ? { writingMode: 'vertical-lr', direction: 'rtl', height: '80px' } : {}}
      />
    </div>
  );
}
