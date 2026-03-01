/**
 * MIDI Map — configurable CC-to-parameter mapping with export/import
 */

export type ViolinParam =
  | 'bowPressure'
  | 'bowSpeed'
  | 'bowPosition'
  | 'vibrato'
  | 'brightness'
  | 'bowNoise'
  | 'stringResonance'
  | 'volume';

export interface MIDIMapping {
  cc: number;
  param: ViolinParam;
  min: number;    // parameter range min
  max: number;    // parameter range max
  curve: 'linear' | 'exponential' | 'logarithmic';
  label: string;  // human-readable label
}

export interface MIDIMapPreset {
  name: string;
  version: number;
  bendRange: number;
  mappings: MIDIMapping[];
}

// Default SWAM-style mapping
export const DEFAULT_MIDI_MAP: MIDIMapPreset = {
  name: "SWAM Violin Default",
  version: 1,
  bendRange: 2,
  mappings: [
    { cc: 1,  param: 'bowPressure',     min: 0, max: 1,    curve: 'exponential',  label: 'Modulation → 弓圧' },
    { cc: 2,  param: 'bowSpeed',        min: 0, max: 1,    curve: 'linear',       label: 'Breath → 弓速' },
    { cc: 7,  param: 'volume',          min: 0, max: 1,    curve: 'logarithmic',  label: 'Volume' },
    { cc: 11, param: 'bowPosition',     min: 0.05, max: 0.25, curve: 'linear',    label: 'Expression → 弓位置' },
    { cc: 71, param: 'brightness',      min: 0, max: 1,    curve: 'linear',       label: 'Timbre → ブライトネス' },
    { cc: 74, param: 'vibrato',         min: 0, max: 50,   curve: 'linear',       label: 'Brightness → ビブラート' },
    { cc: 75, param: 'bowNoise',        min: 0, max: 0.1,  curve: 'linear',       label: 'Sound Ctrl 6 → 弓ノイズ' },
    { cc: 76, param: 'stringResonance', min: 0, max: 1,    curve: 'linear',       label: 'Sound Ctrl 7 → 共鳴弦' },
  ],
};

// Alternative: keyboard-centric mapping (fewer CCs needed)
export const KEYBOARD_MIDI_MAP: MIDIMapPreset = {
  name: "Keyboard Player",
  version: 1,
  bendRange: 2,
  mappings: [
    { cc: 1,  param: 'bowPressure',     min: 0, max: 1,    curve: 'exponential',  label: 'Mod Wheel → 弓圧' },
    { cc: 7,  param: 'volume',          min: 0, max: 1,    curve: 'logarithmic',  label: 'Volume' },
    { cc: 11, param: 'bowSpeed',        min: 0, max: 1,    curve: 'linear',       label: 'Expression → 弓速' },
    { cc: 74, param: 'vibrato',         min: 0, max: 50,   curve: 'linear',       label: 'Cutoff → ビブラート' },
  ],
};

// Wind controller mapping (EWI, Sylphyo etc.)
export const WIND_MIDI_MAP: MIDIMapPreset = {
  name: "Wind Controller",
  version: 1,
  bendRange: 12,
  mappings: [
    { cc: 2,  param: 'bowPressure',     min: 0, max: 1,    curve: 'exponential',  label: 'Breath → 弓圧' },
    { cc: 1,  param: 'vibrato',         min: 0, max: 50,   curve: 'linear',       label: 'Mod → ビブラート' },
    { cc: 7,  param: 'volume',          min: 0, max: 1,    curve: 'logarithmic',  label: 'Volume' },
    { cc: 11, param: 'bowSpeed',        min: 0, max: 1,    curve: 'linear',       label: 'Expression → 弓速' },
    { cc: 74, param: 'brightness',      min: 0, max: 1,    curve: 'linear',       label: 'Cutoff → ブライトネス' },
  ],
};

export const BUILT_IN_MAPS: MIDIMapPreset[] = [DEFAULT_MIDI_MAP, KEYBOARD_MIDI_MAP, WIND_MIDI_MAP];

// Apply curve to 0-1 normalized CC value
export function applyCurve(value: number, curve: MIDIMapping['curve']): number {
  switch (curve) {
    case 'exponential': return value * value;
    case 'logarithmic': return value > 0 ? Math.log(value * 9 + 1) / Math.log(10) : 0;
    default: return value;
  }
}

// Map CC value (0-127) to parameter value using mapping
export function mapCCToParam(ccValue: number, mapping: MIDIMapping): number {
  const normalized = ccValue / 127;
  const curved = applyCurve(normalized, mapping.curve);
  return mapping.min + curved * (mapping.max - mapping.min);
}

// Export map as JSON string
export function exportMidiMap(map: MIDIMapPreset): string {
  return JSON.stringify(map, null, 2);
}

// Import map from JSON string
export function importMidiMap(json: string): MIDIMapPreset | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.name || !parsed.mappings || !Array.isArray(parsed.mappings)) return null;
    // Validate each mapping
    for (const m of parsed.mappings) {
      if (typeof m.cc !== 'number' || !m.param || typeof m.min !== 'number' || typeof m.max !== 'number') return null;
    }
    return {
      name: parsed.name,
      version: parsed.version || 1,
      bendRange: parsed.bendRange || 2,
      mappings: parsed.mappings,
    };
  } catch {
    return null;
  }
}

// Save to localStorage
export function saveMidiMap(key: string, map: MIDIMapPreset) {
  localStorage.setItem(`midimap_${key}`, exportMidiMap(map));
}

// Load from localStorage
export function loadMidiMap(key: string): MIDIMapPreset | null {
  const json = localStorage.getItem(`midimap_${key}`);
  if (!json) return null;
  return importMidiMap(json);
}

// List saved maps
export function listSavedMaps(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('midimap_')) keys.push(k.replace('midimap_', ''));
  }
  return keys;
}
