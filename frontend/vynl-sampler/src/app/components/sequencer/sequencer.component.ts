// src/app/components/sequencer/sequencer.component.ts - PERFORMANCE EDITION
import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SequencerService } from '../../services/sequencer.service';
import { AudioService } from '../../services/audio.service'; // ⚡ AGREGAR para obtener nombres
import { SequencerTrack, SequencerStep } from '../../types/sequencer.types';

@Component({
  selector: 'app-sequencer',
  changeDetection: ChangeDetectionStrategy.OnPush, // ⚡ PERFORMANCE BOOST
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sequencer.component.html',
  styleUrls: ['./sequencer.component.scss']
})
export class SequencerComponent implements OnInit, OnDestroy {
  
  // ⚡ Template helpers
  Math = Math;
  Array = Array;
  
  // 🎵 Computed properties optimizadas
  playbackState = computed(() => this.sequencerService.playbackState());
  currentPattern = computed(() => this.sequencerService.currentPattern());
  selectedTrack = computed(() => this.sequencerService.selectedTrack());
  selectedStep = computed(() => this.sequencerService.selectedStep());

  // 🎚️ Control values
  tempBPM = signal(120);
  tempSwing = signal(0);
  tempHumanize = signal(0);

  // 🎯 UI State
  showAdvancedControls = signal(false);
  viewMode = signal<'grid' | 'linear'>('grid');

  // ⚡ TrackBy functions para performance
 trackByTrackId = (index: number, track: SequencerTrack) => track.id;
  trackByStepIndex = (index: number, step: SequencerStep) => index;

  // ⚡ Debounced methods
  private debouncedBPMUpdate = this.debounce((bpm: number) => {
    this.sequencerService.setBPM(bpm);
  }, 100);

  private debouncedSwingUpdate = this.debounce((swing: number) => {
    this.sequencerService.updateGlobalSwing(swing);
  }, 50);

  private debouncedHumanizeUpdate = this.debounce((humanize: number) => {
    this.sequencerService.updateGlobalHumanize(humanize);
  }, 50);

  // 🚀 NUEVO: Cache de nombres de samples
  private sampleNamesCache = new Map<number, string>();
  private lastCacheUpdate = 0;
  private cacheUpdateInterval = 1000; // Update cada segundo

  // ✅ Computed optimizado para tracks con nombres reales
  tracksWithSampleNames = computed(() => {
    const pattern = this.currentPattern();
    const now = performance.now();
    
    // Update cache si es necesario
    if (now - this.lastCacheUpdate > this.cacheUpdateInterval) {
      this.updateSampleNamesCache();
      this.lastCacheUpdate = now;
    }

    return pattern.tracks.map(track => ({
      ...track,
      displayName: this.getTrackDisplayName(track.padIndex),
      hasAudio: this.sampleNamesCache.has(track.padIndex),
      isActive: this.hasActiveSteps(track)
    }));
  });

  // ✅ Computed para track seleccionada
  selectedTrackData = computed(() => {
    const trackId = this.selectedTrack();
    if (!trackId) return null;
    return this.tracksWithSampleNames().find(t => t.id === trackId) || null;
  });

  selectedStepData = computed(() => {
    const track = this.selectedTrackData();
    const stepIndex = this.selectedStep();
    if (!track || stepIndex === null) return null;
    return track.steps[stepIndex] || null;
  });

  // 🎵 Computed para steps numbers
  stepNumbers = computed(() => Array.from({ length: 16 }, (_, i) => i + 1));

  constructor(
    public sequencerService: SequencerService,
    private audioService: AudioService, // ⚡ AGREGAR
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateSampleNamesCache();
    console.log('🎹 Sequencer component initialized (optimized)');
  }

  ngOnDestroy(): void {
    this.sequencerService.stop();
    this.sampleNamesCache.clear();
  }

  // 🚀 MÉTODO NUEVO: Update cache de nombres de samples
  private updateSampleNamesCache(): void {
    for (let i = 0; i < 16; i++) {
      const status = this.audioService.getPadStatus(i);
      if (status.isLoaded) {
        // Buscar el nombre del sample del pad
        const sampleName = this.getSampleNameFromAudioService(i);
        if (sampleName) {
          this.sampleNamesCache.set(i, sampleName);
        }
      } else {
        this.sampleNamesCache.delete(i);
      }
    }
  }

  // 🚀 MÉTODO NUEVO: Obtener nombre del sample desde AudioService
  private getSampleNameFromAudioService(padIndex: number): string | null {
    // Método para obtener el nombre real del sample cargado
    // Esto depende de cómo el AudioService almacene los nombres
    try {
      const waveformData = this.audioService.getPadWaveformData(padIndex);
      if (waveformData) {
        // Si hay datos, significa que hay un sample cargado
        // Necesitaremos obtener el nombre real del sample
        // Por ahora, usamos un placeholder que puedes reemplazar
        return `Sample ${padIndex + 1}`;
      }
    } catch (error) {
      console.warn(`Could not get sample name for pad ${padIndex}`);
    }
    return null;
  }

  // 🚀 MÉTODO OPTIMIZADO: Obtener nombre de display para track
  private getTrackDisplayName(padIndex: number): string {
    const sampleName = this.sampleNamesCache.get(padIndex);
    
    if (sampleName) {
      // Truncar nombre si es muy largo
      return sampleName.length > 12 ? `${sampleName.substring(0, 12)}...` : sampleName;
    }
    
    // Nombres por defecto más descriptivos basados en el pad
    const defaultNames = [
      'KICK', 'SNARE', 'HIHAT', 'OPENHAT',
      'CLAP', 'CRASH', 'RIDE', 'TOM1',
      'TOM2', 'PERC1', 'PERC2', 'FX1',
      'FX2', 'VOCAL', 'BASS', 'LEAD'
    ];
    
    return defaultNames[padIndex] || `PAD ${padIndex + 1}`;
  }

  // ⚡ MÉTODO OPTIMIZADO: Verificar si track tiene steps activos
  private hasActiveSteps(track: SequencerTrack): boolean {
    for (let i = 0; i < track.steps.length; i++) {
      if (track.steps[i].isActive) return true;
    }
    return false;
  }

  // 🎵 MÉTODOS DE TRANSPORTE optimizados
  togglePlayback(): void {
    if (this.playbackState().isPlaying) {
      this.sequencerService.stop();
    } else {
      this.sequencerService.play();
    }
    this.cdr.detectChanges();
  }

  // 🎚️ MÉTODOS DE CONTROL optimizados con debounce
  updateBPM(): void {
    this.debouncedBPMUpdate(this.tempBPM());
  }

  updateSwing(): void {
    this.debouncedSwingUpdate(this.tempSwing());
  }

  updateHumanize(): void {
    this.debouncedHumanizeUpdate(this.tempHumanize());
  }

  // 🎯 MÉTODO OPTIMIZADO: Step interaction
  onStepClick(trackId: string, stepIndex: number, event: MouseEvent): void {
    event.preventDefault();
    
    // Click normal: toggle step
    if (!event.shiftKey && !event.ctrlKey) {
      this.sequencerService.toggleStep(trackId, stepIndex);
    }
    
    // Shift+Click: select for editing
    if (event.shiftKey) {
      this.sequencerService.selectTrack(trackId);
      this.sequencerService.selectStep(stepIndex);
    }

    // Force update visual
    this.cdr.detectChanges();
  }

  // 🎚️ MÉTODO OPTIMIZADO: Velocity control con wheel
  onStepWheel(trackId: string, stepIndex: number, event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const track = this.currentPattern().tracks.find(t => t.id === trackId);
    if (!track) return;

    const currentVelocity = track.steps[stepIndex].velocity;
    const delta = event.deltaY > 0 ? -5 : 5;
    const newVelocity = Math.max(0, Math.min(127, currentVelocity + delta));
    
    this.sequencerService.updateStepVelocity(trackId, stepIndex, newVelocity);
    this.cdr.detectChanges();
  }

  // 🎯 MÉTODOS DE TRACK optimizados
  onTrackSelect(trackId: string): void {
    this.sequencerService.selectTrack(trackId);
    this.cdr.detectChanges();
  }

  onMuteToggle(trackId: string, event: MouseEvent): void {
  event.stopPropagation();
  this.sequencerService.toggleMute(trackId);
  this.cdr.detectChanges();
}

  onSoloToggle(trackId: string, event: MouseEvent): void {
  event.stopPropagation();
  this.sequencerService.toggleSolo(trackId);
  this.cdr.detectChanges();
}

  // 🎨 MÉTODOS HELPER optimizados
  getStepIntensity(step: SequencerStep): number {
    if (!step.isActive) return 0;
    return step.velocity / 127;
  }

  getStepOpacity(step: SequencerStep): string {
    if (!step.isActive) return '0.2';
    const intensity = this.getStepIntensity(step);
    return Math.max(0.3, intensity).toFixed(2);
  }

  getTrackClass(track: any): string {
    const classes = ['track-row'];
    
    if (track.isSelected) classes.push('selected');
    if (track.mute) classes.push('muted');
    if (track.solo) classes.push('solo');
    if (track.hasAudio) classes.push('has-audio');
    if (track.isActive) classes.push('has-steps');
    
    return classes.join(' ');
  }

  

  // ⚡ MÉTODO NUEVO: Debounce utility
  private debounce(func: Function, wait: number) {
    let timeout: any;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // 🔍 MÉTODOS DE DEBUG
  refreshSampleNames(): void {
    this.updateSampleNamesCache();
    this.cdr.detectChanges();
  }

  getPerformanceStats(): any {
    return {
      cacheSize: this.sampleNamesCache.size,
      tracksWithSamples: Array.from(this.sampleNamesCache.keys()),
      lastCacheUpdate: this.lastCacheUpdate
    };
  }

  // 📱 MÉTODOS RESPONSIVOS
  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  getGridColumns(): number {
    return this.isMobile() ? 8 : 16;
  }

  // Agregar estos métodos al sequencer.component.ts:

// 🎵 Helper method para tooltip
getStepTooltip(step: SequencerStep, index: number): string {
  if (!step.isActive) return `Step ${index + 1} - Empty`;
  
  let tooltip = `Step ${index + 1} - Velocity: ${step.velocity}`;
  if (step.probability < 100) tooltip += `, Chance: ${step.probability}%`;
  if (step.pan !== 0) tooltip += `, Pan: ${step.pan > 0 ? 'R' : 'L'}${Math.abs(step.pan * 100).toFixed(0)}`;
  
  return tooltip;
}

// 🎵 Helper method para classes de step mejorado
getStepClass(track: any, stepIndex: number): string {
  const step = track.steps[stepIndex];
  const classes = ['step-btn-premium'];
  
  if (step.isActive) classes.push('step-active');
  
  if (stepIndex === this.playbackState().currentStep && this.playbackState().isPlaying) {
    classes.push('current-playback');
  }
  
  if (this.selectedStep() === stepIndex && this.selectedTrack() === track.id) {
    classes.push('step-selected');
  }
  
  return classes.join(' ');
}
}