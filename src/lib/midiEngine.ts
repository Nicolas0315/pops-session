export interface MIDINote { note: number; velocity: number; channel: number; }
export interface MIDIControl { controller: number; value: number; channel: number; }
export type MIDINoteHandler = (note: MIDINote) => void;
export type MIDIControlHandler = (cc: MIDIControl) => void;
export interface MIDIDevice { id: string; name: string; manufacturer: string; state: string; }

class MIDIEngine {
  private access: MIDIAccess | null = null;
  private noteOnH: MIDINoteHandler[] = [];
  private noteOffH: MIDINoteHandler[] = [];
  private ccH: MIDIControlHandler[] = [];
  private pbH: ((v: number, ch: number) => void)[] = [];
  private atH: ((note: number, pressure: number, ch: number) => void)[] = []; // poly aftertouch
  private catH: ((pressure: number, ch: number) => void)[] = []; // channel aftertouch
  private devH: ((d: MIDIDevice[]) => void)[] = [];

  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) return false;
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = () => { this.bind(); this.notifyDev(); };
      this.bind();
      return true;
    } catch { return false; }
  }

  private bind() {
    if (!this.access) return;
    for (const input of this.access.inputs.values()) input.onmidimessage = e => this.msg(e);
  }

  private msg(e: MIDIMessageEvent) {
    const [st, d1, d2] = e.data!;
    const ch = st & 0x0f, cmd = st >> 4;
    if (cmd === 0x9 && d2 > 0) this.noteOnH.forEach(h => h({ note: d1, velocity: d2, channel: ch }));
    else if (cmd === 0x9 || cmd === 0x8) this.noteOffH.forEach(h => h({ note: d1, velocity: d2, channel: ch }));
    else if (cmd === 0xb) this.ccH.forEach(h => h({ controller: d1, value: d2, channel: ch }));
    else if (cmd === 0xa) this.atH.forEach(h => h(d1, d2, ch)); // poly aftertouch
    else if (cmd === 0xd) this.catH.forEach(h => h(d1, ch)); // channel aftertouch (d1 is pressure)
    else if (cmd === 0xe) this.pbH.forEach(h => h(((d2 << 7 | d1) - 8192) / 8192, ch));
  }

  getDevices(): MIDIDevice[] {
    if (!this.access) return [];
    const r: MIDIDevice[] = [];
    for (const i of this.access.inputs.values()) r.push({ id: i.id, name: i.name || "?", manufacturer: i.manufacturer || "?", state: i.state });
    return r;
  }
  private notifyDev() { const d = this.getDevices(); this.devH.forEach(h => h(d)); }
  onNoteOn(h: MIDINoteHandler) { this.noteOnH.push(h); return () => { this.noteOnH = this.noteOnH.filter(x => x !== h); }; }
  onNoteOff(h: MIDINoteHandler) { this.noteOffH.push(h); return () => { this.noteOffH = this.noteOffH.filter(x => x !== h); }; }
  onCC(h: MIDIControlHandler) { this.ccH.push(h); return () => { this.ccH = this.ccH.filter(x => x !== h); }; }
  onPitchBend(h: (v: number, ch: number) => void) { this.pbH.push(h); return () => { this.pbH = this.pbH.filter(x => x !== h); }; }
  onPolyAftertouch(h: (note: number, pressure: number, ch: number) => void) { this.atH.push(h); return () => { this.atH = this.atH.filter(x => x !== h); }; }
  onChannelAftertouch(h: (pressure: number, ch: number) => void) { this.catH.push(h); return () => { this.catH = this.catH.filter(x => x !== h); }; }
  onDeviceChange(h: (d: MIDIDevice[]) => void) { this.devH.push(h); return () => { this.devH = this.devH.filter(x => x !== h); }; }
  dispose() { this.noteOnH = []; this.noteOffH = []; this.ccH = []; this.pbH = []; this.atH = []; this.catH = []; this.devH = []; }
}

export function midiToFreq(note: number): number { return 440 * Math.pow(2, (note - 69) / 12); }
export function midiToName(note: number): string {
  const n = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return n[note % 12] + (Math.floor(note / 12) - 1);
}
export const midiEngine = new MIDIEngine();
