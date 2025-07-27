import { Injectable } from '@angular/core';
import { AudioService } from './audio.service';

interface KeyMapping {
  key: string;
  padIndex: number;
  keyCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private isListening = false;
  private pressedKeys = new Set<string>();

    private samplerComponent: any = null;

  // Mapeo QWERTY (2 filas de 8)
  private qwertyMapping: KeyMapping[] = [
    // Fila superior (pads 0-7)
    { key: 'q', padIndex: 0 }, { key: 'w', padIndex: 1 },
    { key: 'e', padIndex: 2 }, { key: 'r', padIndex: 3 },
    { key: 't', padIndex: 4 }, { key: 'y', padIndex: 5 },
    { key: 'u', padIndex: 6 }, { key: 'i', padIndex: 7 },

    // Fila inferior (pads 8-15)
    { key: 'a', padIndex: 8 }, { key: 's', padIndex: 9 },
    { key: 'd', padIndex: 10 }, { key: 'f', padIndex: 11 },
    { key: 'g', padIndex: 12 }, { key: 'h', padIndex: 13 },
    { key: 'j', padIndex: 14 }, { key: 'k', padIndex: 15 }
  ];

  // Mapeo de números (pads 0-9 + 6 adicionales)
  private numberMapping: KeyMapping[] = [
    { key: '1', padIndex: 0 }, { key: '2', padIndex: 1 },
    { key: '3', padIndex: 2 }, { key: '4', padIndex: 3 },
    { key: '5', padIndex: 4 }, { key: '6', padIndex: 5 },
    { key: '7', padIndex: 6 }, { key: '8', padIndex: 7 },
    { key: '9', padIndex: 8 }, { key: '0', padIndex: 9 },
    // Números adicionales con Shift
    { key: '!', padIndex: 10 }, { key: '@', padIndex: 11 },
    { key: '#', padIndex: 12 }, { key: '$', padIndex: 13 },
    { key: '%', padIndex: 14 }, { key: '^', padIndex: 15 }
  ];

  constructor(private audioService: AudioService) {}

  // 🆕 Método para registrar el componente del sampler
  setSamplerComponent(component: any): void {
    this.samplerComponent = component;
    console.log('🔗 Sampler component registered with InputService');
  }

  startListening(): void {
    if (this.isListening) return;

    this.isListening = true;

    // Keyboard listeners
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // MIDI listener
    this.initializeMIDI();

    console.log('🎹 Input listeners activated');
    console.log('📝 QWERTY Layout:');
    console.log('   Q W E R T Y U I   (Pads 1-8)');
    console.log('   A S D F G H J K   (Pads 9-16)');
    console.log('🔢 Numbers: 1-9,0 + Shift+1-6 for all 16 pads');
  }

  stopListening(): void {
    this.isListening = false;
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    console.log('⏹️ Input listeners stopped');
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Evitar repetición mientras se mantiene presionada
    if (this.pressedKeys.has(key)) return;
    this.pressedKeys.add(key);

    // Buscar en mapeo QWERTY
    const qwertyPad = this.qwertyMapping.find(m => m.key === key);
    if (qwertyPad) {
      this.triggerPad(qwertyPad.padIndex, 'QWERTY');
      return;
    }

    // Buscar en mapeo numérico
    const numberPad = this.numberMapping.find(m => m.key === event.key);
    if (numberPad) {
      this.triggerPad(numberPad.padIndex, 'NUMBER');
      return;
    }

    // Teclas especiales
    switch (key) {
      case ' ': // Spacebar = Play/Stop
        event.preventDefault();
        this.audioService.togglePlayback();
        break;

      case 'escape': // ESC = Panic (detener todo)
        this.audioService.stopAllPads();
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    this.pressedKeys.delete(key);
  }

  private async initializeMIDI(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      console.log('❌ MIDI no soportado en este navegador');
      return;
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess();

      for (const input of midiAccess.inputs.values()) {
        input.addEventListener('midimessage', this.handleMIDIMessage.bind(this));
        console.log(`🎹 MIDI conectado: ${input.name}`);
      }

      // Detectar nuevos dispositivos
      midiAccess.addEventListener('statechange', (e: any) => {
        if (e.port.state === 'connected' && e.port.type === 'input') {
          e.port.addEventListener('midimessage', this.handleMIDIMessage.bind(this));
          console.log(`🔌 Nuevo MIDI: ${e.port.name}`);
        }
      });

    } catch (error) {
      console.log('⚠️ Error accediendo MIDI:', error);
    }
  }

  private handleMIDIMessage(event: any): void {
    const [status, note, velocity] = event.data;

    // Note On (144-159) con velocity > 0
    if (status >= 144 && status <= 159 && velocity > 0) {
      // Mapear notas MIDI a pads (C3=48 a D#4=63 = 16 pads)
      const padIndex = note - 48; // C3 = pad 0

      if (padIndex >= 0 && padIndex < 16) {
        this.triggerPad(padIndex, 'MIDI', velocity);
      }
    }
  }

  private triggerPad(padIndex: number, source: string, velocity = 127): void {
    // Calcular volumen basado en velocity MIDI
    const volume = source === 'MIDI' ? (velocity / 127) : 1;

    // 🆕 Si hay componente registrado, usar su método playPad para sincronizar
    if (this.samplerComponent && this.samplerComponent.playPad) {
      this.samplerComponent.playPad(padIndex);
    } else {
      // Fallback al método directo del audio service
      this.audioService.playPad(padIndex, volume);
    }

    console.log(`🎵 Pad ${padIndex + 1} triggered via ${source}`);
  }

  // Método para mostrar el layout actual
  showKeyboardLayout(): void {
    console.log(`
🎹 VYNL KEYBOARD LAYOUT:

QWERTY Mode:
┌─────────────────────────────────┐
│  Q   W   E   R   T   Y   U   I  │  Pads 1-8
│  A   S   D   F   G   H   J   K  │  Pads 9-16
└─────────────────────────────────┘

Number Mode:
┌─────────────────────────────────┐
│  1   2   3   4   5   6   7   8  │  Pads 1-8
│  9   0   !   @   #   $   %   ^  │  Pads 9-16
└─────────────────────────────────┘

MIDI: C3-D#4 (notas 48-63)
Special: SPACE=Play/Stop, ESC=Panic
    `);
  }
}
