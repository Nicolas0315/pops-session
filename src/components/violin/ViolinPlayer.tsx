"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { SWAMViolin } from "@/lib/swamViolin";
import { midiEngine, midiToName, type MIDIDevice } from "@/lib/midiEngine";
import {
  type MIDIMapPreset, type MIDIMapping,
  DEFAULT_MIDI_MAP, BUILT_IN_MAPS,
  mapCCToParam, exportMidiMap, importMidiMap,
  saveMidiMap, loadMidiMap, listSavedMaps,
} from "@/lib/midiMap";

export default function ViolinPlayer() {
  const [engine, setEngine] = useState<SWAMViolin | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [midiReady, setMidiReady] = useState(false);
  const [midiDevices, setMidiDevices] = useState<MIDIDevice[]>([]);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [bowPressure, setBowPressure] = useState(0.5);
  const [bowSpeed, setBowSpeed] = useState(0.5);
  const [bowPosition, setBowPosition] = useState(0.12);
  const [vibrato, setVibrato] = useState(0);
  const [pitchBend, setPitchBend] = useState(0);
  const [brightness, setBrightness] = useState(0.5);
  const [bowNoise, setBowNoise] = useState(0.02);
  const [bendRange, setBendRange] = useState(2);
  const [lastCC, setLastCC] = useState("");
  const [midiMap, setMidiMap] = useState<MIDIMapPreset>(DEFAULT_MIDI_MAP);
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [learnMode, setLearnMode] = useState<string | null>(null); // param name being learned
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const initAudio = useCallback(async () => {
    const ctx = new AudioContext();
    const violin = new SWAMViolin(ctx);
    violin.start();
    setEngine(violin);
    setIsPlaying(true);
    const ok = await midiEngine.init();
    setMidiReady(ok);
    if (ok) setMidiDevices(midiEngine.getDevices());
  }, []);

  useEffect(() => {
    if (!engine) return;
    const off1 = midiEngine.onNoteOn(({ note, velocity }) => {
      engine.noteOn(note, velocity);
      setActiveNotes(p => new Set(p).add(note));
    });
    const off2 = midiEngine.onNoteOff(({ note }) => {
      engine.noteOff(note);
      setActiveNotes(p => { const n = new Set(p); n.delete(note); return n; });
    });
    const off3 = midiEngine.onCC(({ controller, value }) => {
      setLastCC(`CC${controller}: ${value}`);

      // MIDI Learn mode
      if (learnMode) {
        setMidiMap(prev => {
          const updated = { ...prev, mappings: prev.mappings.map(m =>
            m.param === learnMode ? { ...m, cc: controller } : m
          )};
          // If no mapping exists for this param, add one
          if (!updated.mappings.find(m => m.param === learnMode)) {
            updated.mappings.push({ cc: controller, param: learnMode as MIDIMapping['param'], min: 0, max: 1, curve: 'linear', label: `CC${controller} → ${learnMode}` });
          }
          return updated;
        });
        setLearnMode(null);
        return;
      }

      // Apply MIDI map
      const mapping = midiMap.mappings.find(m => m.cc === controller);
      if (!mapping) return;
      const val = mapCCToParam(value, mapping);

      switch (mapping.param) {
        case 'bowPressure': engine.bowPressure = val; setBowPressure(val); break;
        case 'bowSpeed': engine.bowSpeed = val; setBowSpeed(val); break;
        case 'bowPosition': engine.bowPositionRatio = val; setBowPosition(val); break;
        case 'vibrato': engine.vibrato = val; setVibrato(val); break;
        case 'brightness': engine.brightness = val; setBrightness(val); break;
        case 'bowNoise': engine.bowNoise = val; setBowNoise(val); break;
        case 'stringResonance': engine.stringResonance = val; break;
        case 'volume': engine.volume = val; break;
      }
    });
    const off4 = midiEngine.onPitchBend((value) => {
      engine.pitchBend = value;
      setPitchBend(value);
    });
    const off5 = midiEngine.onPolyAftertouch((note, pressure) => {
      engine.polyAftertouch(note, pressure);
    });
    const off6 = midiEngine.onChannelAftertouch((pressure) => {
      engine.channelAftertouch(pressure);
    });
    const off7 = midiEngine.onDeviceChange(d => setMidiDevices(d));
    return () => { off1(); off2(); off3(); off4(); off5(); off6(); off7(); };
  }, [engine]);

  useEffect(() => {
    if (!engine || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const c = canvas.getContext("2d")!;
    const an = engine.getAnalyser();
    const buf = new Float32Array(an.frequencyBinCount);
    const strings = [
      { name: "G3", note: 55, color: "#ef4444" },
      { name: "D4", note: 62, color: "#f59e0b" },
      { name: "A4", note: 69, color: "#22c55e" },
      { name: "E5", note: 76, color: "#3b82f6" },
    ];
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      an.getFloatTimeDomainData(buf);
      c.fillStyle = "#0a0a0a"; c.fillRect(0, 0, canvas.width, canvas.height);
      c.lineWidth = 2; c.strokeStyle = "#f59e0b"; c.beginPath();
      const sw = canvas.width / buf.length;
      for (let i = 0; i < buf.length; i++) {
        const y = (buf[i] * 0.5 + 0.5) * canvas.height;
        i === 0 ? c.moveTo(i * sw, y) : c.lineTo(i * sw, y);
      }
      c.stroke();
      strings.forEach((s, idx) => {
        const y = ((idx + 1) / 5) * canvas.height;
        const active = activeNotes.has(s.note);
        c.strokeStyle = active ? s.color : s.color + "33";
        c.lineWidth = active ? 3 : 1; c.beginPath();
        if (active) {
          for (let x = 0; x < canvas.width; x++) {
            const a = 8 * Math.sin(x / canvas.width * Math.PI);
            const w = a * Math.sin((x * 0.05 + Date.now() * 0.01) * (1 + idx * 0.3));
            x === 0 ? c.moveTo(x, y + w) : c.lineTo(x, y + w);
          }
        } else { c.moveTo(0, y); c.lineTo(canvas.width, y); }
        c.stroke();
      });
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [engine, activeNotes]);

  useEffect(() => {
    if (!engine) return;
    const km: Record<string, number> = {
      a:55,s:57,d:59,f:60,g:62,h:64,j:65,k:67,l:69,z:71,x:72,c:74,v:76,b:77,n:79,m:81
    };
    const pressed = new Set<string>();
    const dn = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (km[k] && !pressed.has(k)) { pressed.add(k); engine.noteOn(km[k], 100); setActiveNotes(p => new Set(p).add(km[k])); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (km[k]) { pressed.delete(k); engine.noteOff(km[k]); setActiveNotes(p => { const n = new Set(p); n.delete(km[k]); return n; }); }
    };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, [engine]);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-amber-400">🎻 SWAM Violin</h2>
          <p className="text-xs text-zinc-500 mt-1">Physical Modeling — Karplus-Strong + Bow Friction</p>
        </div>
        {!isPlaying ? (
          <button onClick={initAudio} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition">起動</button>
        ) : (
          <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-sm text-green-400">Active</span></div>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className={`px-3 py-1 rounded-full ${midiReady ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"}`}>
          MIDI: {midiReady ? `${midiDevices.length}台検出` : "未接続"}
        </div>
        {midiDevices.map(d => <span key={d.id} className="text-zinc-400">{d.name}</span>)}
        {lastCC && <span className="text-zinc-500 ml-auto">{lastCC}</span>}
      </div>
      <canvas ref={canvasRef} width={800} height={200} className="w-full h-48 rounded-lg bg-zinc-950" />
      <div className="flex gap-2 min-h-[32px] flex-wrap">
        {Array.from(activeNotes).sort().map(n => (
          <span key={n} className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded font-mono">{midiToName(n)}</span>
        ))}
      </div>
      {/* Pitch Bend Display */}
      {pitchBend !== 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <span className="text-xs text-purple-400 font-mono">Pitch Bend</span>
          <div className="flex-1 h-2 bg-zinc-800 rounded-full relative">
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-zinc-600" />
            <div className="absolute top-0 h-full bg-purple-500 rounded-full transition-all"
              style={{ left: `${50 + pitchBend * 50}%`, width: '4px', marginLeft: '-2px' }} />
          </div>
          <span className="text-xs text-purple-300 font-mono w-20 text-right">
            {(pitchBend * bendRange > 0 ? '+' : '')}{(pitchBend * bendRange).toFixed(2)} st
          </span>
        </div>
      )}
      {/* Bow Parameters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">弓圧 (CC1)</label>
          <input type="range" min={0} max={1} step={0.01} value={bowPressure}
            onChange={e => { const v = parseFloat(e.target.value); setBowPressure(v); if (engine) engine.bowPressure = v; }}
            className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-red-500" />
          <div className="text-xs text-zinc-500 text-right">{(bowPressure*100).toFixed(0)}%</div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">弓速 (CC2)</label>
          <input type="range" min={0} max={1} step={0.01} value={bowSpeed}
            onChange={e => { const v = parseFloat(e.target.value); setBowSpeed(v); if (engine) engine.bowSpeed = v; }}
            className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-amber-500" />
          <div className="text-xs text-zinc-500 text-right">{(bowSpeed*100).toFixed(0)}%</div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">弓位置 (CC11)</label>
          <input type="range" min={0} max={1} step={0.01} value={bowPosition*4}
            onChange={e => { const v = parseFloat(e.target.value)/4; setBowPosition(v); if (engine) engine.bowPositionRatio = v; }}
            className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-green-500" />
          <div className="text-xs text-zinc-500 text-right">{(bowPosition*100).toFixed(0)}%</div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">ビブラート (CC74)</label>
          <input type="range" min={0} max={1} step={0.01} value={vibrato/50}
            onChange={e => { const v = parseFloat(e.target.value)*50; setVibrato(v); if (engine) engine.vibrato = v; }}
            className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-blue-500" />
          <div className="text-xs text-zinc-500 text-right">{vibrato.toFixed(0)} cents</div>
        </div>
      </div>
      {/* Extended Parameters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">ブライトネス (CC71)</label>
          <input type="range" min={0} max={1} step={0.01} value={brightness}
            onChange={e => { const v = parseFloat(e.target.value); setBrightness(v); if (engine) engine.brightness = v; }}
            className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-yellow-500" />
          <div className="text-xs text-zinc-500 text-right">{(brightness*100).toFixed(0)}%</div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">弓ノイズ (松脂)</label>
          <input type="range" min={0} max={0.1} step={0.001} value={bowNoise}
            onChange={e => { const v = parseFloat(e.target.value); setBowNoise(v); if (engine) engine.bowNoise = v; }}
            className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-orange-500" />
          <div className="text-xs text-zinc-500 text-right">{(bowNoise*1000).toFixed(0)}</div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">ベンド幅</label>
          <input type="range" min={1} max={12} step={1} value={bendRange}
            onChange={e => { const v = parseInt(e.target.value); setBendRange(v); if (engine) engine.bendRange = v; }}
            className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-purple-500" />
          <div className="text-xs text-zinc-500 text-right">±{bendRange} st</div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">共鳴弦</label>
          <input type="range" min={0} max={1} step={0.01} value={0.5}
            onChange={e => { if (engine) engine.stringResonance = parseFloat(e.target.value); }}
            className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-teal-500" />
          <div className="text-xs text-zinc-500 text-right">50%</div>
        </div>
      </div>
      <div className="text-xs text-zinc-600 text-center">
        キーボード: A=G3 S=A3 D=B3 F=C4 G=D4 H=E4 J=F4 K=G4 L=A4 Z=B4 X=C5 C=D5 V=E5
      </div>

      {/* MIDI Map Section */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowMapEditor(!showMapEditor)}
            className="text-sm font-medium text-zinc-300 hover:text-white transition">
            🎛️ MIDI Map: {midiMap.name} {showMapEditor ? '▲' : '▼'}
          </button>
          <div className="flex gap-2">
            {learnMode && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded animate-pulse">
                LEARN: {learnMode} — CC入力待ち...
              </span>
            )}
          </div>
        </div>

        {showMapEditor && (
          <div className="space-y-4">
            {/* Preset selector */}
            <div className="flex gap-2 flex-wrap">
              {BUILT_IN_MAPS.map(preset => (
                <button key={preset.name}
                  onClick={() => { setMidiMap(preset); if (engine) engine.bendRange = preset.bendRange; }}
                  className={`px-3 py-1 text-xs rounded-full border transition ${
                    midiMap.name === preset.name
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : 'text-zinc-500 border-zinc-700 hover:border-zinc-500'
                  }`}>
                  {preset.name}
                </button>
              ))}
              {listSavedMaps().map(key => (
                <button key={key}
                  onClick={() => { const m = loadMidiMap(key); if (m) { setMidiMap(m); if (engine) engine.bendRange = m.bendRange; } }}
                  className="px-3 py-1 text-xs rounded-full border text-zinc-500 border-zinc-700 hover:border-zinc-500 transition">
                  💾 {key}
                </button>
              ))}
            </div>

            {/* Mapping table */}
            <div className="bg-zinc-950 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="px-3 py-2 text-left">CC</th>
                    <th className="px-3 py-2 text-left">パラメータ</th>
                    <th className="px-3 py-2 text-left">範囲</th>
                    <th className="px-3 py-2 text-left">カーブ</th>
                    <th className="px-3 py-2 text-right">Learn</th>
                  </tr>
                </thead>
                <tbody>
                  {midiMap.mappings.map((m, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 text-zinc-300">
                      <td className="px-3 py-2 font-mono">CC{m.cc}</td>
                      <td className="px-3 py-2">{m.label}</td>
                      <td className="px-3 py-2 font-mono text-zinc-500">{m.min}–{m.max}</td>
                      <td className="px-3 py-2 text-zinc-500">{m.curve}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setLearnMode(learnMode === m.param ? null : m.param)}
                          className={`px-2 py-0.5 rounded text-xs ${
                            learnMode === m.param
                              ? 'bg-red-500 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}>
                          {learnMode === m.param ? '...' : 'Learn'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Export / Import / Save */}
            <div className="flex gap-2">
              <button onClick={() => {
                const json = exportMidiMap(midiMap);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = `${midiMap.name.replace(/\s+/g, '_')}.midimap.json`;
                a.click(); URL.revokeObjectURL(url);
              }} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded hover:bg-zinc-700 transition">
                📤 エクスポート
              </button>
              <label className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded hover:bg-zinc-700 transition cursor-pointer">
                📥 インポート
                <input type="file" accept=".json,.midimap.json" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const map = importMidiMap(reader.result as string);
                    if (map) { setMidiMap(map); if (engine) engine.bendRange = map.bendRange; }
                    else alert('無効なMIDIマップファイル');
                  };
                  reader.readAsText(file);
                }} />
              </label>
              <button onClick={() => {
                const name = prompt('マップ名:', midiMap.name);
                if (name) { const saved = { ...midiMap, name }; saveMidiMap(name, saved); setMidiMap(saved); }
              }} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-xs rounded hover:bg-amber-500/30 transition">
                💾 保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
