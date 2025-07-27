// src/app/components/sequencer/sequencer.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SequencerService } from '../../services/sequencer.service';
import { SequencerTrack, SequencerStep } from '../../types/sequencer.types';

@Component({
  selector: 'app-sequencer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sequencer.component.html',
  styleUrls: ['./sequencer.component.scss']
})
export class SequencerComponent implements OnInit, OnDestroy {
  // ✅ Agregar propiedades faltantes
  Math = Math;  // Para usar Math en template
  Array = Array;  // Para usar Array.from en template
  
  // 🎵 Computed properties from service
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

  // ✅ Computed para obtener track y step seleccionados
  selectedTrackData = computed(() => {
    const trackId = this.selectedTrack();
    if (!trackId) return null;
    return this.currentPattern().tracks.find(t => t.id === trackId) || null;
  });

  selectedStepData = computed(() => {
    const track = this.selectedTrackData();
    const stepIndex = this.selectedStep();
    if (!track || stepIndex === null) return null;
    return track.steps[stepIndex] || null;
  });

  // ✅ Helper para generar números de steps
  getStepNumbers(): number[] {
    return Array.from({ length: 16 }, (_, i) => i + 1);
  }

  constructor(public sequencerService: SequencerService) {}

  ngOnInit(): void {
    console.log('🎹 Sequencer component initialized');
  }

  ngOnDestroy(): void {
    this.sequencerService.stop();
  }

  // 🎵 Transport Controls
  togglePlayback(): void {
    if (this.playbackState().isPlaying) {
      this.sequencerService.stop();
    } else {
      this.sequencerService.play();
    }
  }

  // 🎚️ BPM Control
  updateBPM(): void {
    this.sequencerService.setBPM(this.tempBPM());
  }

  // 🎵 Pattern Controls
  updateSwing(): void {
    this.sequencerService.updateGlobalSwing(this.tempSwing());
  }

  updateHumanize(): void {
    this.sequencerService.updateGlobalHumanize(this.tempHumanize());
  }

  // 🎯 Step Interaction
  onStepClick(trackId: string, stepIndex: number, event: MouseEvent): void {
    // Click normal: toggle step
    if (!event.shiftKey && !event.ctrlKey) {
      this.sequencerService.toggleStep(trackId, stepIndex);
    }
    
    // Shift+Click: select for editing
    if (event.shiftKey) {
      this.sequencerService.selectTrack(trackId);
      this.sequencerService.selectStep(stepIndex);
    }
  }

  // 🎚️ Velocity Control (mouse wheel)
  onStepWheel(trackId: string, stepIndex: number, event: WheelEvent): void {
    event.preventDefault();
    
    const track = this.currentPattern().tracks.find(t => t.id === trackId);
    if (!track) return;

    const currentVelocity = track.steps[stepIndex].velocity;
    const delta = event.deltaY > 0 ? -5 : 5;
    const newVelocity = Math.max(0, Math.min(127, currentVelocity + delta));
    
    this.sequencerService.updateStepVelocity(trackId, stepIndex, newVelocity);
  }

  // 🎯 Track Controls
  onTrackSelect(trackId: string): void {
    this.sequencerService.selectTrack(trackId);
  }

  onMuteToggle(trackId: string): void {
    this.sequencerService.toggleMute(trackId);
  }

  onSoloToggle(trackId: string): void {
    this.sequencerService.toggleSolo(trackId);
  }

  // 🎨 Helper Methods
  getStepIntensity(step: SequencerStep): string {
    if (!step.isActive) return '0';
    return (step.velocity / 127).toFixed(2);
  }

  getTrackClass(track: SequencerTrack): string {
    let baseClass = 'track-row';
    if (track.isSelected) baseClass += ' selected';
    if (track.mute) baseClass += ' muted';
    if (track.solo) baseClass += ' solo';
    return baseClass;
  }
}