// src/app/services/sequencer.service.ts - PERFORMANCE EDITION
import { Injectable, signal, computed } from '@angular/core';
import { AudioService } from './audio.service';
import * as Tone from 'tone';
import { SequencerTrack, SequencerStep, SequencerPattern, PlaybackState } from '../types/sequencer.types';

@Injectable({
  providedIn: 'root'
})
export class SequencerService {
  private sequence: Tone.Sequence | null = null;
  private nextStepTime = 0;

  // ⚡ Performance optimizations
  private updateQueue = new Map<string, any>();
  private isUpdating = false;
  private lastUpdateTime = 0;
  private minUpdateInterval = 16; // 60fps max
  private stepPlaybackCache = new Map<number, SequencerTrack[]>();

  // 🎵 State Signals
  private _playbackState = signal<PlaybackState>({
    isPlaying: false,
    currentStep: 0,
    bpm: 120,
    subdivision: 16
  });

  private _currentPattern = signal<SequencerPattern>({
    id: 'pattern-1',
    name: 'Main Pattern',
    tracks: [],
    length: 16,
    swing: 0,
    humanize: 0
  });

  private _selectedTrack = signal<string | null>(null);
  private _selectedStep = signal<number | null>(null);

  // 🎯 Public Computed Values (cached)
  playbackState = computed(() => this._playbackState());
  currentPattern = computed(() => this._currentPattern());
  selectedTrack = computed(() => this._selectedTrack());
  selectedStep = computed(() => this._selectedStep());
  isPlaying = computed(() => this._playbackState().isPlaying);
  currentStep = computed(() => this._playbackState().currentStep);

  // ⚡ Computed optimizado para tracks activas
  activeTracks = computed(() => {
    const pattern = this._currentPattern();
    return pattern.tracks.filter(track => !track.mute && this.hasActiveSteps(track));
  });

  constructor(private audioService: AudioService) {
    this.initializePattern();
    this.precomputeStepPlayback();
  }

  // 🚀 MÉTODO OPTIMIZADO: Inicializar pattern
  private initializePattern(): void {
    const tracks: SequencerTrack[] = [];
    
    // Batch creation para mejor performance
    const trackData = Array.from({ length: 16 }, (_, i) => ({
      id: `track-${i}`,
      padIndex: i,
      name: `Track ${i + 1}`,
      steps: this.createEmptySteps(16),
      mute: false,
      solo: false,
      volume: 80,
      pan: 0,
      color: this.getTrackColor(i),
      isSelected: false
    }));

    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: trackData
    }));

    console.log('🎹 Sequencer pattern initialized with 16 tracks');
  }

  // ⚡ MÉTODO OPTIMIZADO: Crear steps vacíos
  private createEmptySteps(length: number): SequencerStep[] {
    // Pre-allocate array para mejor performance
    const steps = new Array(length);
    const defaultStep = {
      isActive: false,
      velocity: 100,
      pan: 0,
      humanize: 0,
      probability: 100,
      triplet: false,
      noteLength: 1.0,
      swing: 0
    };

    for (let i = 0; i < length; i++) {
      steps[i] = { ...defaultStep };
    }

    return steps;
  }

  // 🚀 MÉTODO NUEVO: Pre-computar playback data
  private precomputeStepPlayback(): void {
    const pattern = this._currentPattern();
    this.stepPlaybackCache.clear();

    for (let stepIndex = 0; stepIndex < pattern.length; stepIndex++) {
      const activeTracksForStep = pattern.tracks.filter(track => 
        !track.mute && track.steps[stepIndex]?.isActive
      );
      this.stepPlaybackCache.set(stepIndex, activeTracksForStep);
    }
  }

  // ⚡ MÉTODO OPTIMIZADO: Verificar si track tiene steps activos
  private hasActiveSteps(track: SequencerTrack): boolean {
    for (let i = 0; i < track.steps.length; i++) {
      if (track.steps[i].isActive) return true;
    }
    return false;
  }

  // 🌈 MÉTODO OPTIMIZADO: Colores para tracks
  private getTrackColor(index: number): string {
    // Pre-computed colors array
    const colors = [
      '#6c757d', '#495057', '#343a40', '#212529',
      '#adb5bd', '#dee2e6', '#e9ecef', '#f8f9fa',
      '#6c757d', '#495057', '#343a40', '#212529',
      '#adb5bd', '#dee2e6', '#e9ecef', '#f8f9fa'
    ];
    return colors[index % colors.length];
  }

  // 🚀 MÉTODO OPTIMIZADO: Toggle step con batching
  toggleStep(trackId: string, stepIndex: number): void {
    // Debounce updates para evitar spam
    const now = performance.now();
    if (now - this.lastUpdateTime < this.minUpdateInterval) {
      this.queueUpdate('toggleStep', { trackId, stepIndex });
      return;
    }
    this.lastUpdateTime = now;

    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? {
              ...track,
              steps: track.steps.map((step, index) => 
                index === stepIndex 
                  ? { ...step, isActive: !step.isActive }
                  : step
              )
            }
          : track
      )
    }));

    // Update cache
    this.updateStepCache(stepIndex);
    console.log(`🎯 Step ${stepIndex + 1} toggled on ${trackId}`);
  }

  // 🚀 MÉTODO NUEVO: Queue system para updates
  private queueUpdate(action: string, data: any): void {
    this.updateQueue.set(`${action}-${Date.now()}`, { action, data });
    
    if (!this.isUpdating) {
      this.isUpdating = true;
      requestAnimationFrame(() => this.processUpdateQueue());
    }
  }

  // 🚀 MÉTODO NUEVO: Procesar queue de updates
  private processUpdateQueue(): void {
    const updates = Array.from(this.updateQueue.values());
    this.updateQueue.clear();

    updates.forEach(({ action, data }) => {
      switch (action) {
        case 'toggleStep':
          this.toggleStepImmediate(data.trackId, data.stepIndex);
          break;
        case 'updateVelocity':
          this.updateStepVelocityImmediate(data.trackId, data.stepIndex, data.velocity);
          break;
        case 'updatePan':
          this.updateStepPanImmediate(data.trackId, data.stepIndex, data.pan);
          break;
      }
    });

    this.isUpdating = false;
  }

  // 🚀 MÉTODO NUEVO: Update cache para step específico
  private updateStepCache(stepIndex: number): void {
    const pattern = this._currentPattern();
    const activeTracksForStep = pattern.tracks.filter(track => 
      !track.mute && track.steps[stepIndex]?.isActive
    );
    this.stepPlaybackCache.set(stepIndex, activeTracksForStep);
  }

  // ⚡ MÉTODOS INMEDIATOS (sin debounce)
  private toggleStepImmediate(trackId: string, stepIndex: number): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? {
              ...track,
              steps: track.steps.map((step, index) => 
                index === stepIndex 
                  ? { ...step, isActive: !step.isActive }
                  : step
              )
            }
          : track
      )
    }));
    this.updateStepCache(stepIndex);
  }

  // 🎚️ MÉTODO OPTIMIZADO: Update velocity con debounce
  updateStepVelocity(trackId: string, stepIndex: number, velocity: number): void {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.minUpdateInterval) {
      this.queueUpdate('updateVelocity', { trackId, stepIndex, velocity });
      return;
    }
    this.lastUpdateTime = now;

    this.updateStepVelocityImmediate(trackId, stepIndex, velocity);
  }

  private updateStepVelocityImmediate(trackId: string, stepIndex: number, velocity: number): void {
    const clampedVelocity = Math.max(0, Math.min(127, velocity));
    
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? {
              ...track,
              steps: track.steps.map((step, index) => 
                index === stepIndex 
                  ? { ...step, velocity: clampedVelocity }
                  : step
              )
            }
          : track
      )
    }));
  }

  // 🎯 MÉTODO OPTIMIZADO: Update pan con debounce
  updateStepPan(trackId: string, stepIndex: number, pan: number): void {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.minUpdateInterval) {
      this.queueUpdate('updatePan', { trackId, stepIndex, pan });
      return;
    }
    this.lastUpdateTime = now;

    this.updateStepPanImmediate(trackId, stepIndex, pan);
  }

  private updateStepPanImmediate(trackId: string, stepIndex: number, pan: number): void {
    const clampedPan = Math.max(-1, Math.min(1, pan));
    
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? {
              ...track,
              steps: track.steps.map((step, index) => 
                index === stepIndex 
                  ? { ...step, pan: clampedPan }
                  : step
              )
            }
          : track
      )
    }));
  }

  // 🎲 MÉTODO OPTIMIZADO: Global controls
  updateGlobalHumanize(amount: number): void {
    const clampedAmount = Math.max(0, Math.min(100, amount));
    this._currentPattern.update(pattern => ({
      ...pattern,
      humanize: clampedAmount
    }));
  }

  updateGlobalSwing(amount: number): void {
    const clampedAmount = Math.max(0, Math.min(100, amount));
    this._currentPattern.update(pattern => ({
      ...pattern,
      swing: clampedAmount
    }));
  }

  // ▶️ MÉTODO OPTIMIZADO: Play con cache
  async play(): Promise<void> {
    if (this.sequence) {
      this.sequence.dispose();
    }

    // Pre-compute playback data
    this.precomputeStepPlayback();

    const pattern = this._currentPattern();
    const subdivisionTime = `${pattern.length}n`;

    this.sequence = new Tone.Sequence(
      (time, step) => {
        this.playStepOptimized(step, time);
        
        // Optimized visual update
        Tone.Draw.schedule(() => {
          this._playbackState.update(state => ({
            ...state,
            currentStep: step
          }));
        }, time);
      },
      Array.from({ length: pattern.length }, (_, i) => i),
      subdivisionTime
    );

    this.sequence.start(0);
    Tone.Transport.start();

    this._playbackState.update(state => ({
      ...state,
      isPlaying: true
    }));

    console.log('▶️ Sequencer started (optimized)');
  }

  // ⏹️ MÉTODO OPTIMIZADO: Stop
  stop(): void {
    if (this.sequence) {
      this.sequence.stop();
      this.sequence.dispose();
      this.sequence = null;
    }

    Tone.Transport.stop();

    this._playbackState.update(state => ({
      ...state,
      isPlaying: false,
      currentStep: 0
    }));

    // Clear caches
    this.stepPlaybackCache.clear();
    this.updateQueue.clear();

    console.log('⏹️ Sequencer stopped (optimized)');
  }

  // 🚀 MÉTODO ULTRA-OPTIMIZADO: Play step con cache
  private playStepOptimized(stepIndex: number, time: number): void {
    // Usar cache en lugar de filtrar cada vez
    const activeTracksForStep = this.stepPlaybackCache.get(stepIndex);
    if (!activeTracksForStep || activeTracksForStep.length === 0) return;

    const pattern = this._currentPattern();

    activeTracksForStep.forEach(track => {
      const step = track.steps[stepIndex];
      if (!step.isActive) return;

      // 🎲 Probability check optimizado
      if (Math.random() * 100 > step.probability) return;

      // 🎵 Timing calculations optimizados
      let scheduledTime = time;
      
      // Humanize
      if (step.humanize > 0 || pattern.humanize > 0) {
        const humanizeAmount = Math.max(step.humanize, pattern.humanize) * 0.0002; // Pre-calculated
        const variation = (Math.random() - 0.5) * humanizeAmount;
        scheduledTime += variation;
      }

      // Swing
      if (step.swing > 0 || pattern.swing > 0) {
        const swingAmount = Math.max(step.swing, pattern.swing) * 0.0005; // Pre-calculated
        if (stepIndex % 2 === 1) {
          scheduledTime += swingAmount;
        }
      }

      // 🎚️ Velocity optimizado
      const velocity = step.velocity * 0.007874; // Pre-calculated /127

      // 🎯 Play optimizado
      this.audioService.playPadWithEffects(
        track.padIndex,
        velocity,
        step.pan,
        scheduledTime
      );
    });
  }

  // 🎚️ MÉTODO OPTIMIZADO: BPM Control
  setBPM(bpm: number): void {
    const clampedBPM = Math.max(60, Math.min(200, bpm));
    Tone.Transport.bpm.value = clampedBPM;
    
    this._playbackState.update(state => ({
      ...state,
      bpm: clampedBPM
    }));

    console.log(`🎵 BPM set to ${clampedBPM}`);
  }

  // 🎯 MÉTODOS DE SELECCIÓN optimizados
  selectTrack(trackId: string): void {
    this._selectedTrack.set(trackId);
    
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => ({
        ...track,
        isSelected: track.id === trackId
      }))
    }));
  }

  selectStep(stepIndex: number): void {
    this._selectedStep.set(stepIndex);
  }

  // 🔇 MÉTODOS DE CONTROL optimizados
  toggleMute(trackId: string): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? { ...track, mute: !track.mute }
          : track
      )
    }));

    // Update cache cuando se mutea/unmutea
    this.precomputeStepPlayback();
  }

  toggleSolo(trackId: string): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? { ...track, solo: !track.solo }
          : track
      )
    }));

    // Update cache cuando se hace solo
    this.precomputeStepPlayback();
  }

  // 🧹 CLEANUP optimizado
  dispose(): void {
    this.stop();
    this.stepPlaybackCache.clear();
    this.updateQueue.clear();
    console.log('🧹 Sequencer service disposed');
  }

  // 🔍 DEBUG methods
  getPerformanceStats(): any {
    return {
      cacheSize: this.stepPlaybackCache.size,
      queueSize: this.updateQueue.size,
      isUpdating: this.isUpdating,
      activeTracks: this.activeTracks().length
    };
  }
}