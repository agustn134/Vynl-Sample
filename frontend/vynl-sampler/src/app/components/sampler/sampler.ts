// src/app/components/sampler/sampler.component.ts - VERSIÓN CORREGIDA Y OPTIMIZADA
import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../services/audio.service';
import { InputService } from '../../services/input.service';
import { WaveformService } from '../../services/waveform.service';
import { SequencerComponent } from '../sequencer/sequencer.component';

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
  changeDetection: ChangeDetectionStrategy.OnPush, // ⚡ PERFORMANCE BOOST
  standalone: true,
  imports: [CommonModule, SequencerComponent],
  templateUrl: './sampler.html',
  styleUrls: ['./sampler.scss'],
})
export class SamplerComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('waveformCanvas', { static: false }) waveformCanvas!: ElementRef<HTMLCanvasElement>;

  // 🎯 State Signals
  pads = signal<Pad[]>([]);
  isPlaying = signal(false);
  bpm = signal(120);
  selectedPad = signal<number | null>(null);
  padControls = signal<PadControls[]>([]);
  showSequencer = signal(false);

  // ⚡ TrackBy functions para performance
  trackByPadId = (index: number, pad: Pad) => pad.id;

  // ⚡ Debounced methods para evitar spam
  private debouncedVolumeUpdate = this.debounce((volume: number) => {
    const selected = this.selectedPad();
    if (selected !== null) {
      this.audioService.setPadVolume(selected, volume / 100);
    }
  }, 16);

  private debouncedPitchUpdate = this.debounce((pitch: number) => {
    const selected = this.selectedPad();
    if (selected !== null) {
      this.audioService.setPadPitch(selected, pitch);
    }
  }, 16);

  // ⚡ Performance timers
  private animationTimeouts = new Map<number, any>();

  constructor(
    public audioService: AudioService,
    private inputService: InputService,
    private waveformService: WaveformService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializePads();
    this.initializePadControls();
  }

  async ngOnInit() {
    await this.audioService.initialize();
    await this.waveformService.initialize();
    
    // Registrar componente para input
    this.inputService.setSamplerComponent(this);
    this.inputService.startListening();

    // Layout info después de init
    setTimeout(() => {
      this.inputService.showKeyboardLayout();
    }, 1000);
  }

  ngAfterViewInit() {
    // Canvas listo para waveforms
    setTimeout(() => {
      this.updateWaveform();
    }, 100);
  }

  ngOnDestroy() {
    this.inputService.stopListening();
    this.inputService.setSamplerComponent(null);
    
    // ⚡ Limpiar timeouts
    this.animationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.animationTimeouts.clear();
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

  // ⚡ MÉTODO OPTIMIZADO: playPad
  async playPad(padIndex: number): Promise<void> {
    // Auto-seleccionar pad
    if (this.selectedPad() !== padIndex) {
      this.selectedPad.set(padIndex);
    }

    // Visual feedback inmediato
    this.updatePadVisualState(padIndex);
    
    // Audio en paralelo
    const currentPads = this.pads();
    if (currentPads[padIndex].isLoaded) {
      const volume = currentPads[padIndex].volume / 100;
      this.audioService.playPad(padIndex, volume);
      
      // Actualizar waveform después de tocar
      setTimeout(() => this.updateWaveform(), 10);
    }
  }

  // ⚡ MÉTODO OPTIMIZADO: Update visual sin bloquear audio
  private updatePadVisualState(padIndex: number): void {
    const pads = this.pads();
    if (!pads[padIndex]) return;

    // Cancelar animación anterior si existe
    if (this.animationTimeouts.has(padIndex)) {
      clearTimeout(this.animationTimeouts.get(padIndex));
    }

    // Activar pad
    pads[padIndex].isActive = true;
    this.pads.set([...pads]);
    this.cdr.detectChanges();

    // Desactivar después de 80ms (ultra rápido)
    const timeout = setTimeout(() => {
      const currentPads = this.pads();
      if (currentPads[padIndex]) {
        currentPads[padIndex].isActive = false;
        this.pads.set([...currentPads]);
        this.cdr.detectChanges();
      }
      this.animationTimeouts.delete(padIndex);
    }, 80);

    this.animationTimeouts.set(padIndex, timeout);
  }

  // ⚡ MÉTODO OPTIMIZADO: File loading
  async onFileSelected(event: any) {
    const files = event.target.files;
    if (!files?.length) return;

    const selected = this.selectedPad() ?? this.findFirstEmptyPad();
    if (selected === null) {
      console.log('⚠️ No hay pads disponibles');
      return;
    }

    // Loading state visual
    this.updateLoadingState(selected, true);

    try {
      const success = await this.audioService.loadSampleFromFile(selected, files[0]);
      
      if (success) {
        this.updatePadState(selected, files[0].name);
        
        // Actualizar waveform después de cargar
        setTimeout(() => this.updateWaveform(), 150);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    } finally {
      this.updateLoadingState(selected, false);
    }
  }

  // ⚡ MÉTODOS HELPER optimizados
  private findFirstEmptyPad(): number | null {
    const pads = this.pads();
    const emptyIndex = pads.findIndex(pad => !pad.isLoaded);
    return emptyIndex !== -1 ? emptyIndex : null;
  }

  private updateLoadingState(padIndex: number, loading: boolean): void {
    // Puedes agregar un spinner o estado visual aquí
    this.cdr.detectChanges();
  }

  private updatePadState(padIndex: number, fileName: string): void {
    const pads = this.pads();
    if (pads[padIndex]) {
      pads[padIndex].isLoaded = true;
      pads[padIndex].sample = fileName;
      pads[padIndex].sampleName = fileName.substring(0, 12); // Truncar nombre
      this.pads.set([...pads]);
      this.cdr.detectChanges();
    }
  }

  // ⚡ MÉTODO OPTIMIZADO: Debounce utility
  private debounce(func: Function, wait: number) {
    let timeout: any;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // 🎯 MÉTODOS UI optimizados
  toggleSequencer(): void {
    this.showSequencer.set(!this.showSequencer());
    this.cdr.detectChanges();
  }

  selectPad(padIndex: number): void {
    this.selectedPad.set(padIndex);
    setTimeout(() => this.updateWaveform(), 0);
    this.cdr.detectChanges();
  }

  getPadClass(pad: Pad): string {
    let classes = 'w-full h-20 border rounded-lg relative overflow-hidden cursor-pointer ';

    if (pad.isActive) {
      classes += 'bg-vynl-carbon border-vynl-carbon transform scale-95 ';
    } else if (pad.isLoaded) {
      classes += 'bg-vynl-steel/20 border-vynl-steel hover:bg-vynl-steel/30 ';
    } else {
      classes += 'bg-white/10 border-white/30 hover:bg-white/20 ';
    }

    // Pad seleccionado
    if (this.selectedPad() === pad.id) {
      classes += 'ring-2 ring-vynl-carbon ';
    }

    return classes;
  }

  updateWaveform(): void {
    const selected = this.selectedPad();
    if (selected === null || !this.waveformCanvas) return;

    const canvas = this.waveformCanvas.nativeElement;
    const waveformData = this.audioService.getPadWaveformData(selected);
    const currentPads = this.pads();
    const pad = currentPads[selected];

    if (waveformData && waveformData.length > 0 && pad.isLoaded) {
      this.waveformService.drawStaticWaveform(canvas, waveformData);
    } else {
      this.waveformService.drawPlaceholder(canvas);
    }
  }

  // 🎚️ CONTROLES optimizados con debounce
  setPadVolume(event: any): void {
    const selected = this.selectedPad();
    if (selected === null) return;

    const newVolume = parseInt(event.target.value);
    const currentPads = this.pads();
    currentPads[selected].volume = newVolume;
    this.pads.set([...currentPads]);

    // Debounced update para evitar spam
    this.debouncedVolumeUpdate(newVolume);
    this.cdr.detectChanges();
  }

  setPadPitch(event: any): void {
    const selected = this.selectedPad();
    if (selected === null) return;

    const newPitch = parseFloat(event.target.value);
    const currentPads = this.pads();
    currentPads[selected].pitch = newPitch;
    this.pads.set([...currentPads]);

    // Debounced update para evitar spam
    this.debouncedPitchUpdate(newPitch);
    this.cdr.detectChanges();
  }

  toggleEffect(effectType: 'reverb' | 'delay' | 'filter'): void {
    const selected = this.selectedPad();
    if (selected === null) return;

    const currentPads = this.pads();
    const pad = currentPads[selected];
    const effectIndex = pad.effects.indexOf(effectType);

    if (effectIndex > -1) {
      pad.effects.splice(effectIndex, 1);
      this.audioService.removeEffectFromPad(selected, effectType);
    } else {
      pad.effects.push(effectType);
      this.audioService.addEffectToPad(selected, effectType);
    }

    this.pads.set([...currentPads]);
    this.cdr.detectChanges();
  }

  // 🎯 GETTERS optimizados
  currentPadVolume(): number {
    const selected = this.selectedPad();
    if (selected === null) return 80;
    return this.pads()[selected]?.volume || 80;
  }

  currentPadPitch(): number {
    const selected = this.selectedPad();
    if (selected === null) return 0;
    return this.pads()[selected]?.pitch || 0;
  }

  hasEffect(effectType: string): boolean {
    const selected = this.selectedPad();
    if (selected === null) return false;
    return this.pads()[selected]?.effects.includes(effectType) || false;
  }

  loadedPadsCount(): number {
    return this.pads().filter(pad => pad.isLoaded).length;
  }

  get audioEngineStatus(): string {
    return this.audioService.isInitialized ? 'ready' : 'loading';
  }

  // 🗑️ ACCIONES de pad
  clearSelectedPad(): void {
    const selected = this.selectedPad();
    if (selected === null) return;

    this.audioService.clearPad(selected);

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
    this.updateWaveform();
    this.cdr.detectChanges();
  }

  duplicatePad(): void {
    const selected = this.selectedPad();
    if (selected === null) return;

    const pads = this.pads();
    const sourcePad = pads[selected];

    if (!sourcePad.isLoaded) {
      console.log('⚠️ No hay sample para duplicar');
      return;
    }

    const emptyPadIndex = pads.findIndex(pad => !pad.isLoaded);
    if (emptyPadIndex === -1) {
      console.log('⚠️ No hay pads vacíos disponibles');
      return;
    }

    this.audioService.duplicatePad(selected, emptyPadIndex);

    const currentPads = this.pads();
    currentPads[emptyPadIndex] = {
      ...sourcePad,
      id: emptyPadIndex,
      isActive: false,
      sampleName: `${sourcePad.sampleName} (Copy)`
    };

    this.pads.set([...currentPads]);
    this.cdr.detectChanges();
  }

  // 🎵 PLAYBACK controls
  togglePlay(): void {
    this.audioService.togglePlayback();
    this.isPlaying.set(this.audioService.isPlaying());
    this.cdr.detectChanges();
  }

  // 🎹 INPUT integration
  triggerPadFromInput(padIndex: number): void {
    this.playPad(padIndex);
  }

  // 📁 Legacy file loading method (mantener compatibilidad)
  async loadFileToEmptyPad(file: File, padIndex: number): Promise<void> {
    const success = await this.audioService.loadSampleFromFile(padIndex, file);

    if (success) {
      this.updatePadState(padIndex, file.name);
      this.selectedPad.set(padIndex);
      setTimeout(() => this.updateWaveform(), 100);
    }
  }
}