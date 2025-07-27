import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../services/audio.service';
import { InputService } from '../../services/input.service';
import { WaveformService } from '../../services/waveform.service';

interface Pad {
  id: number;
  isActive: boolean;
  sample: string | null;
  sampleName: string;
  isLoaded: boolean;
  volume: number;
  pitch: number;
  effects: string[];
}

interface PadControls {
  volume: number;
  pitch: number;
  effects: string[];
}

@Component({
  selector: 'app-sampler',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sampler.html',
  styleUrls: ['./sampler.scss'],
})
export class SamplerComponent implements OnInit, OnDestroy {

  @ViewChild('waveformCanvas', { static: false }) waveformCanvas!: ElementRef<HTMLCanvasElement>;


  pads = signal<Pad[]>([]);
  isPlaying = signal(false);
  bpm = signal(120);

  // 🆕 Nuevos signals para controles
  selectedPad = signal<number | null>(null);
  padControls = signal<PadControls[]>([]);

  constructor(
    public audioService: AudioService,
    private inputService: InputService,
    private waveformService: WaveformService
  ) {
    this.initializePads();
    this.initializePadControls();
  }

  async ngOnInit() {
  await this.audioService.initialize();
  await this.waveformService.initialize();
  
  // 🆕 Registrar este componente en el InputService
  this.inputService.setSamplerComponent(this);
  
  this.inputService.startListening();

  // Mostrar layout en consola
  setTimeout(() => {
    this.inputService.showKeyboardLayout();
  }, 1000);
}

  ngOnDestroy() {
  this.inputService.stopListening();
  // 🆕 Limpiar referencia
  this.inputService.setSamplerComponent(null);
}

  initializePads() {
    const padsArray: Pad[] = [];
    for (let i = 0; i < 16; i++) {
      padsArray.push({
        id: i,
        isActive: false,
        sample: null,
        sampleName: `PAD ${i + 1}`,
        isLoaded: false,
        volume: 80,
        pitch: 0,
        effects: []
      });
    }
    this.pads.set(padsArray);
  }

  initializePadControls() {
    const controlsArray: PadControls[] = [];
    for (let i = 0; i < 16; i++) {
      controlsArray.push({
        volume: 80,
        pitch: 0,
        effects: []
      });
    }
    this.padControls.set(controlsArray);
  }

//   // 🎵 Funciones de reproducción existentes
//   async playPad(padIndex: number) {
//   const currentPads = this.pads();

//   // 🆕 Auto-seleccionar el pad al presionarlo
//   if (this.selectedPad() !== padIndex) {
//     this.selectedPad.set(padIndex);
//     console.log(`🎯 Pad ${padIndex + 1} auto-selected`);
//   }

//   // Activar visualmente
//   currentPads[padIndex].isActive = true;
//   this.pads.set([...currentPads]);

//   // Reproducir audio con volumen del pad
//   if (currentPads[padIndex].isLoaded) {
//     const volume = currentPads[padIndex].volume / 100;
//     await this.audioService.playPad(padIndex, volume);

//     // 🆕 Actualizar waveform inmediatamente al reproducir
//     setTimeout(() => {
//       this.updateWaveform();
//     }, 10);
//   } else {
//     console.log(`🎵 Loading demo sample for pad ${padIndex + 1}`);
//     // 🆕 Mostrar placeholder para pads vacíos
//     setTimeout(() => {
//       this.updateWaveform();
//     }, 10);
//   }

//   // Desactivar después de 200ms
//   setTimeout(() => {
//     currentPads[padIndex].isActive = false;
//     this.pads.set([...currentPads]);
//   }, 200);
// }

async playPad(padIndex: number) {
  const currentPads = this.pads();

  // 🆕 Auto-seleccionar el pad al presionarlo
  if (this.selectedPad() !== padIndex) {
    this.selectedPad.set(padIndex);
    console.log(`🎯 Pad ${padIndex + 1} auto-selected`);
  }

  // Activar visualmente
  currentPads[padIndex].isActive = true;
  this.pads.set([...currentPads]);

  // Reproducir audio con volumen del pad
  if (currentPads[padIndex].isLoaded) {
    const volume = currentPads[padIndex].volume / 100;
    await this.audioService.playPad(padIndex, volume);

    // 🆕 Actualizar waveform inmediatamente al reproducir
    setTimeout(() => {
      this.updateWaveform();
    }, 10);
  } else {
    console.log(`🎵 Loading demo sample for pad ${padIndex + 1}`);
    // 🆕 Mostrar placeholder para pads vacíos
    setTimeout(() => {
      this.updateWaveform();
    }, 10);
  }

  // Desactivar después de 200ms
  setTimeout(() => {
    currentPads[padIndex].isActive = false;
    this.pads.set([...currentPads]);
  }, 200);
}

  getPadClass(pad: Pad): string {
    let classes = 'w-full h-20 backdrop-blur-sm border rounded-lg transition-all duration-80 transform active:scale-96 shadow-soft hover:shadow-crisp relative overflow-hidden group ';

    if (pad.isActive) {
      classes += 'bg-vynl-carbon border-vynl-carbon animate-pad-hit ';
    } else if (pad.isLoaded) {
      classes += 'bg-vynl-steel/20 border-vynl-steel hover:bg-vynl-steel/30 ';
    } else {
      classes += 'bg-white/10 border-white/30 hover:bg-white/20 ';
    }

    return classes;
  }

updateWaveform(): void {
  const selected = this.selectedPad();
  if (selected === null || !this.waveformCanvas) {
    console.log('⚠️ No pad selected or canvas not ready');
    return;
  }

  const canvas = this.waveformCanvas.nativeElement;
  
  // 🆕 Usar el método correcto para obtener datos del waveform
  const waveformData = this.audioService.getPadWaveformData(selected);
  const currentPads = this.pads();
  const pad = currentPads[selected];

  if (waveformData && waveformData.length > 0 && pad.isLoaded) {
    this.waveformService.drawStaticWaveform(canvas, waveformData);
    console.log(`🌊 Waveform displayed for pad ${selected + 1} (${waveformData.length} samples)`);
  } else {
    this.waveformService.drawPlaceholder(canvas);
    if (pad.isLoaded) {
      console.log(`⚠️ Pad ${selected + 1} loaded but no waveform data`);
      // 🆕 Debug para ver qué está pasando
      this.audioService.debugPadData(selected);
    } else {
      console.log(`📭 Pad ${selected + 1} is empty - showing placeholder`);
    }
  }
}


loadedPadsCount(): number {
  return this.pads().filter(pad => pad.isLoaded).length;
}

// Método para mostrar el estado del audio engine
get audioEngineStatus(): string {
  return this.audioService['isInitialized'] ? 'ready' : 'loading';
}

// 🆕 Método para manejar la interacción desde teclado/MIDI
triggerPadFromInput(padIndex: number): void {
  // Este método será llamado desde el InputService
  this.playPad(padIndex);
}


  togglePlay() {
    this.audioService.togglePlayback();
    this.isPlaying.set(this.audioService.isPlaying());
  }

  // 🆕 Funciones del panel de controles
  selectPad(padIndex: number) {
    this.selectedPad.set(padIndex);
    console.log(`🎯 Pad ${padIndex + 1} selected`);
    setTimeout(() => this.updateWaveform(), 0)
  }

  currentPadVolume(): number {
    const selected = this.selectedPad();
    if (selected === null) return 80;

    const pads = this.pads();
    return pads[selected]?.volume || 80;
  }

  currentPadPitch(): number {
    const selected = this.selectedPad();
    if (selected === null) return 0;

    const pads = this.pads();
    return pads[selected]?.pitch || 0;
  }

  setPadVolume(event: any) {
    const selected = this.selectedPad();
    if (selected === null) return;

    const newVolume = parseInt(event.target.value);
    const currentPads = this.pads();
    currentPads[selected].volume = newVolume;
    this.pads.set([...currentPads]);

    // Aplicar al audio service
    this.audioService.setPadVolume(selected, newVolume / 100);

    console.log(`🔊 Pad ${selected + 1} volume: ${newVolume}%`);
  }

  setPadPitch(event: any) {
    const selected = this.selectedPad();
    if (selected === null) return;

    const newPitch = parseFloat(event.target.value);
    const currentPads = this.pads();
    currentPads[selected].pitch = newPitch;
    this.pads.set([...currentPads]);

    // Aplicar al audio service
    this.audioService.setPadPitch(selected, newPitch);

    console.log(`🎵 Pad ${selected + 1} pitch: ${newPitch > 0 ? '+' : ''}${newPitch}`);
  }

  toggleEffect(effectType: 'reverb' | 'delay' | 'filter') {
    const selected = this.selectedPad();
    if (selected === null) return;

    const currentPads = this.pads();
    const pad = currentPads[selected];

    const effectIndex = pad.effects.indexOf(effectType);

    if (effectIndex > -1) {
      // Remover efecto
      pad.effects.splice(effectIndex, 1);
      this.audioService.removeEffectFromPad(selected, effectType);
      console.log(`🎛️ ${effectType} removed from pad ${selected + 1}`);
    } else {
      // Agregar efecto
      pad.effects.push(effectType);
      this.audioService.addEffectToPad(selected, effectType);
      console.log(`🎛️ ${effectType} added to pad ${selected + 1}`);
    }

    this.pads.set([...currentPads]);
  }

  hasEffect(effectType: string): boolean {
    const selected = this.selectedPad();
    if (selected === null) return false;

    const pads = this.pads();
    return pads[selected]?.effects.includes(effectType) || false;
  }

  clearSelectedPad() {
    const selected = this.selectedPad();
    if (selected === null) return;

    // Limpiar en audio service
    this.audioService.clearPad(selected);

    // Limpiar en el estado
    const currentPads = this.pads();
    currentPads[selected] = {
      id: selected,
      isActive: false,
      sample: null,
      sampleName: `PAD ${selected + 1}`,
      isLoaded: false,
      volume: 80,
      pitch: 0,
      effects: []
    };

    this.pads.set([...currentPads]);
    console.log(`🗑️ Pad ${selected + 1} cleared`);
  }

  duplicatePad() {
    const selected = this.selectedPad();
    if (selected === null) return;

    const pads = this.pads();
    const sourcePad = pads[selected];

    if (!sourcePad.isLoaded) {
      console.log('⚠️ No hay sample para duplicar');
      return;
    }

    // Buscar primer pad vacío
    const emptyPadIndex = pads.findIndex(pad => !pad.isLoaded);

    if (emptyPadIndex === -1) {
      console.log('⚠️ No hay pads vacíos disponibles');
      return;
    }

    // Duplicar sample
    this.audioService.duplicatePad(selected, emptyPadIndex);

    // Duplicar en el estado
    const currentPads = this.pads();
    currentPads[emptyPadIndex] = {
      ...sourcePad,
      id: emptyPadIndex,
      isActive: false,
      sampleName: `${sourcePad.sampleName} (Copy)`
    };

    this.pads.set([...currentPads]);
    console.log(`📋 Pad ${selected + 1} duplicated to pad ${emptyPadIndex + 1}`);
  }

  // 🆕 Función existente actualizada
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      const selected = this.selectedPad();

      // Si hay un pad seleccionado, cargar ahí. Si no, buscar vacío
      const targetPadIndex = selected !== null ? selected :
                           this.pads().findIndex((pad) => !pad.isLoaded);

      if (targetPadIndex !== -1) {
        const file = files[0];
        this.loadFileToEmptyPad(file, targetPadIndex);
      } else {
        console.log('⚠️ No hay pads disponibles');
      }
    }
  }

  // 🆕 Actualizar loadFileToEmptyPad para refresh automático
async loadFileToEmptyPad(file: File, padIndex: number) {
  const success = await this.audioService.loadSampleFromFile(padIndex, file);

  if (success) {
    const currentPads = this.pads();
    currentPads[padIndex].isLoaded = true;
    currentPads[padIndex].sample = file.name;
    currentPads[padIndex].sampleName = file.name.replace(/\.[^/.]+$/, '');
    this.pads.set([...currentPads]);

    // Auto-seleccionar y actualizar waveform
    this.selectedPad.set(padIndex);

    // 🆕 Esperar un poco más para que el buffer se procese
    setTimeout(() => {
      this.updateWaveform();
    }, 100);

    console.log(`✅ ${file.name} loaded to pad ${padIndex + 1} with waveform`);
  }
}
}
