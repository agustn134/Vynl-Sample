// src/app/types/sequencer.types.ts
export interface SequencerStep {
  isActive: boolean;
  velocity: number; // 0-127
  pan: number; // -1 to 1 (left to right)
  humanize: number; // 0-100 (timing variation)
  probability: number; // 0-100 (chance to trigger)
  triplet: boolean; // Para tresillos
  noteLength: number; // 0.1-4.0 (duración en beats)
  swing: number; // 0-100 (swing amount)
}

export interface SequencerTrack {
  id: string;
  padIndex: number;
  name: string;
  steps: SequencerStep[];
  mute: boolean;
  solo: boolean;
  volume: number; // 0-100
  pan: number; // -1 to 1
  color: string; // Para identificación visual
  isSelected: boolean;
}

export interface SequencerPattern {
  id: string;
  name: string;
  tracks: SequencerTrack[];
  length: number; // 16, 32, 64 steps
  swing: number; // Global swing
  humanize: number; // Global humanize
}

export interface PlaybackState {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  subdivision: number; // 16th notes, 8th notes, etc.
}