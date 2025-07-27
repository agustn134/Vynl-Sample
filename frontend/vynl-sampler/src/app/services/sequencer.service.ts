// src/app/services/sequencer.service.ts
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

  // 🎯 Public Computed Values
  playbackState = computed(() => this._playbackState());
  currentPattern = computed(() => this._currentPattern());
  selectedTrack = computed(() => this._selectedTrack());
  selectedStep = computed(() => this._selectedStep());
  isPlaying = computed(() => this._playbackState().isPlaying);
  currentStep = computed(() => this._playbackState().currentStep);

  constructor(private audioService: AudioService) {
    this.initializePattern();
  }

  // 🆕 Inicializar pattern con 16 tracks vacías
  private initializePattern(): void {
    const tracks: SequencerTrack[] = [];
    
    for (let i = 0; i < 16; i++) {
      tracks.push({
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
      });
    }

    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks
    }));
  }

  // 🎨 Crear steps vacíos con valores por defecto
  private createEmptySteps(length: number): SequencerStep[] {
    return Array.from({ length }, () => ({
      isActive: false,
      velocity: 100,
      pan: 0,
      humanize: 0,
      probability: 100,
      triplet: false,
      noteLength: 1.0,
      swing: 0
    }));
  }

  // 🌈 Colores para tracks (basado en tu paleta VYNL)
  private getTrackColor(index: number): string {
    const colors = [
      '#6c757d', '#495057', '#343a40', '#212529', // Grises
      '#adb5bd', '#dee2e6', '#e9ecef', '#f8f9fa', // Claros
      '#6c757d', '#495057', '#343a40', '#212529', // Repetir
      '#adb5bd', '#dee2e6', '#e9ecef', '#f8f9fa'
    ];
    return colors[index % colors.length];
  }

  // 🎵 Toggle step en una track específica
  toggleStep(trackId: string, stepIndex: number): void {
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

    console.log(`🎯 Step ${stepIndex + 1} toggled on ${trackId}`);
  }

  // 🎚️ Actualizar velocity de un step
  updateStepVelocity(trackId: string, stepIndex: number, velocity: number): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? {
              ...track,
              steps: track.steps.map((step, index) => 
                index === stepIndex 
                  ? { ...step, velocity: Math.max(0, Math.min(127, velocity)) }
                  : step
              )
            }
          : track
      )
    }));
  }

  // 🎯 Actualizar paneo de un step
  updateStepPan(trackId: string, stepIndex: number, pan: number): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? {
              ...track,
              steps: track.steps.map((step, index) => 
                index === stepIndex 
                  ? { ...step, pan: Math.max(-1, Math.min(1, pan)) }
                  : step
              )
            }
          : track
      )
    }));
  }

  // 🎲 Toggle humanizador global
  updateGlobalHumanize(amount: number): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      humanize: Math.max(0, Math.min(100, amount))
    }));
  }

  // 🎵 Actualizar swing global
  updateGlobalSwing(amount: number): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      swing: Math.max(0, Math.min(100, amount))
    }));
  }

// ▶️ Reproducir secuencia
async play(): Promise<void> {  // ✅ Cambiar de void a Promise<void>
  if (this.sequence) {
    this.sequence.dispose();
  }

  const pattern = this._currentPattern();
  const subdivisionTime = `${pattern.length}n`;

  this.sequence = new Tone.Sequence(
    (time, step) => {
      this.playStep(step, time);
      
      // Actualizar current step visual
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

  console.log('▶️ Sequencer started');
}
  // ⏹️ Detener secuencia
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

    console.log('⏹️ Sequencer stopped');
  }

  // 🎵 Reproducir step específico con todas las mejoras
  private playStep(stepIndex: number, time: number): void {
    const pattern = this._currentPattern();
    
    pattern.tracks.forEach(track => {
      if (track.mute) return;
      
      const step = track.steps[stepIndex];
      if (!step.isActive) return;

      // 🎲 Probability check
      if (Math.random() * 100 > step.probability) return;

      // 🎵 Calcular timing con humanize y swing
      let scheduledTime = time;
      
      // Humanize: pequeña variación aleatoria en timing
      if (step.humanize > 0 || pattern.humanize > 0) {
        const humanizeAmount = Math.max(step.humanize, pattern.humanize) / 100;
        const variation = (Math.random() - 0.5) * humanizeAmount * 0.02; // ±20ms max
        scheduledTime += variation;
      }

      // Swing: delays en beats pares/impares
      if (step.swing > 0 || pattern.swing > 0) {
        const swingAmount = Math.max(step.swing, pattern.swing) / 100;
        if (stepIndex % 2 === 1) { // Beats impares
          scheduledTime += swingAmount * 0.05; // Delay sutil
        }
      }

      // 🎚️ Aplicar velocity
      const velocity = step.velocity / 127;

      // 🎯 Reproducir con paneo
      this.audioService.playPadWithEffects(
        track.padIndex,
        velocity,
        step.pan,
        scheduledTime
      );
    });
  }

  // 🎚️ BPM Control
  setBPM(bpm: number): void {
    const clampedBPM = Math.max(60, Math.min(200, bpm));
    Tone.Transport.bpm.value = clampedBPM;
    
    this._playbackState.update(state => ({
      ...state,
      bpm: clampedBPM
    }));

    console.log(`🎵 BPM set to ${clampedBPM}`);
  }

  // 🎯 Seleccionar track
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

  // 🎯 Seleccionar step para edición detallada
  selectStep(stepIndex: number): void {
    this._selectedStep.set(stepIndex);
  }

  // 🔇 Toggle mute track
  toggleMute(trackId: string): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? { ...track, mute: !track.mute }
          : track
      )
    }));
  }

  // 🔊 Toggle solo track
  toggleSolo(trackId: string): void {
    this._currentPattern.update(pattern => ({
      ...pattern,
      tracks: pattern.tracks.map(track => 
        track.id === trackId 
          ? { ...track, solo: !track.solo }
          : track
      )
    }));
  }
}