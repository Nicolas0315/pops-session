/**
 * Web MIDI API Engine — MIDI入力デバイスの検出・接続・イベント処理
 */

export interface MIDINote {
  note: number;
  velocity: number;
  channel: number;
}

export interface MIDIControl {
  controller: number;
  value: number; // 0-127
  channel: number;
}

export type MIDINoteHandler = (note: MIDINote) => void;
export type MIDIControlHandler = (cc: MIDIControl) => void;

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

class MIDIEngine {
  private access: MIDIAccess | null = null;
  private noteOnHandlers: MIDINoteHandler[] = [];
  private noteOffHandlers: MIDINoteHandler[] = [];
  private ccHandlers: MIDIControlHandler[] = [];
  private pitchBendHandlers: ((value: number, channel: number) => void)[] = [];
  private deviceChangeHandlers: ((devices: MIDIDevice[]) => void)[] = [];

  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API not supported");
      return false;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = () => {
        this.bindInputs();
        this.notifyDeviceChange();
      };
      this.bindInputs();
      return true;
    } catch (e) {
      console.error("MIDI access denied:", e);
      return false;
    }
  }

  private bindInputs() {
    if (!this.access) return;
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = (e) => this.handleMessage(e);
    }
  }

  private handleMessage(e: MIDIMessageEvent) {
    const [status, data1, data2] = e.data!;
    const channel = status & 0x0f;
    const command = status >> 4;

    switch (command) {
      case 0x9: // Note On
        if (data2 > 0) {
          this.noteOnHandlers.forEach((h) =>
            h({ note: data1, velocity: data2, channel })
          );
        } else {
          // velocity 0 = note off
          this.noteOffHandlers.forEach((h) =>
            h({ note: data1, velocity: 0, channel })
          );
        }
        break;
      case 0x8: // Note Off
        this.noteOffHandlers.forEach((h) =>
          h({ note: data1, velocity: data2, channel })
        );
        break;
      case 0xb: // Control Change
        this.ccHandlers.forEach((h) =>
          h({ controller: data1, value: data2, channel })
        );
        break;
      case 0xe: // Pitch Bend
        const bend = ((data2 << 7) | data1) - 8192; // -8192 to +8191
        const normalized = bend / 8192; // -1 to +1
        this.pitchBendHandlers.forEach((h) => h(normalized, channel));
        break;
    }
  }

  getDevices(): MIDIDevice[] {
    if (!this.access) return [];
    const devices: MIDIDevice[] = [];
    for (const input of this.access.inputs.values()) {
      devices.push({
        id: input.id,
        name: input.name || "Unknown",
        manufacturer: input.manufacturer || "Unknown",
        state: input.state,
      });
    }
    return devices;
  }

  private notifyDeviceChange() {
    const devices = this.getDevices();
    this.deviceChangeHandlers.forEach((h) => h(devices));
  }

  onNoteOn(handler: MIDINoteHandler) {
    this.noteOnHandlers.push(handler);
    return () => {
      this.noteOnHandlers = this.noteOnHandlers.filter((h) => h !== handler);
    };
  }

  onNoteOff(handler: MIDINoteHandler) {
    this.noteOffHandlers.push(handler);
    return () => {
      this.noteOffHandlers = this.noteOffHandlers.filter((h) => h !== handler);
    };
  }

  onCC(handler: MIDIControlHandler) {
    this.ccHandlers.push(handler);
    return () => {
      this.ccHandlers = this.ccHandlers.filter((h) => h !== handler);
    };
  }

  onPitchBend(handler: (value: number, channel: number) => void) {
    this.pitchBendHandlers.push(handler);
    return () => {
      this.pitchBendHandlers = this.pitchBendHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  onDeviceChange(handler: (devices: MIDIDevice[]) => void) {
    this.deviceChangeHandlers.push(handler);
    return () => {
      this.deviceChangeHandlers = this.deviceChangeHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  dispose() {
    if (this.access) {
      for (const input of this.access.inputs.values()) {
        input.onmidimessage = null;
      }
    }
    this.noteOnHandlers = [];
    this.noteOffHandlers = [];
    this.ccHandlers = [];
    this.pitchBendHandlers = [];
    this.deviceChangeHandlers = [];
  }
}

// Note number to frequency
export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// Note number to name
export function midiToName(note: number): string {
  const names = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octave = Math.floor(note / 12) - 1;
  return `${names[note % 12]}${octave}`;
}

export const midiEngine = new MIDIEngine();
