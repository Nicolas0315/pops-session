"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { SWAMViolin } from "@/lib/swamViolin";
import { midiEngine, midiToName, type MIDIDevice } from "@/lib/midiEngine";

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
  const [lastCC, setLastCC] = useState("");
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
      const n = value / 127;
      setLastCC(`CC${controller}: ${value}`);
      if (controller === 1) { engine.bowPressure = n; setBowPressure(n); }
      if (controller === 2) { engine.bowSpeed = n; setBowSpeed(n); }
      if (controller === 11) { engine.bowPositionRatio = 0.05 + n * 0.2; setBowPosition(engine.bowPositionRatio); }
      if (controller === 74) { engine.vibrato = n * 50; setVibrato(n * 50); }
    });
    const off4 = midiEngine.onDeviceChange(d => setMidiDevices(d));
    return () => { off1(); off2(); off3(); off4(); };
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
      <div className="text-xs text-zinc-600 text-center">
        キーボード: A=G3 S=A3 D=B3 F=C4 G=D4 H=E4 J=F4 K=G4 L=A4 Z=B4 X=C5 C=D5 V=E5
      </div>
    </div>
  );
}
