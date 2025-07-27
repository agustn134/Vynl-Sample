// En audio.service.ts, actualizar todo:

import { Injectable, signal } from '@angular/core';
import * as Tone from 'tone';

interface SampleData {
  player: Tone.Player;
  buffer: Tone.ToneAudioBuffer | null;
  isLoaded: boolean;
  rawAudioData: Float32Array | null; // 🆕 Agregar datos para waveform
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private players: SampleData[] = [];
  public isInitialized = false;
  private sequence: Tone.Sequence | null = null;
  private currentStep = 0;

  private _isPlaying = signal(false);

  constructor() {
    this.initializePlayers();
  }

  isPlaying() {
    return this._isPlaying();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Tone.start();
      Tone.Transport.bpm.value = 120;
      console.log('🎵 VYNL Audio Engine initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  private initializePlayers(): void {
    for (let i = 0; i < 16; i++) {
      this.players.push({
        player: new Tone.Player().toDestination(),
        buffer: null,
        isLoaded: false,
        rawAudioData: null // 🆕 Inicializar datos del waveform
      });
    }
  }

  async playPad(padIndex: number, volume: number = 1): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const playerData = this.players[padIndex];

    if (playerData && playerData.isLoaded && playerData.player.loaded) {
      try {
        playerData.player.volume.value = Tone.gainToDb(volume);

        if (playerData.player.state === 'started') {
          playerData.player.stop();
        }

        playerData.player.start();
        console.log(`🔊 Playing pad ${padIndex + 1} (vol: ${Math.round(volume * 100)}%)`);
      } catch (error) {
        console.error(`Error playing pad ${padIndex}:`, error);
      }
    } else {
      console.log(`⚠️ Pad ${padIndex + 1} has no sample loaded`);
    }
  }

  stopAllPads(): void {
    this.players.forEach((playerData, index) => {
      if (playerData.player.state === 'started') {
        playerData.player.stop();
      }
    });
    console.log('🛑 All pads stopped (Panic)');
  }

  // 🆕 Método principal actualizado para cargar samples
  async loadSampleToPad(padIndex: number, audioUrl: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const playerData = this.players[padIndex];

      // Cargar el audio en el player
      await playerData.player.load(audioUrl);

      // 🆕 Extraer datos del waveform una vez cargado
      if (playerData.player.buffer && playerData.player.buffer.loaded) {
        const audioBuffer = playerData.player.buffer as Tone.ToneAudioBuffer;
        
        // Extraer datos para el waveform
        await this.extractWaveformData(padIndex, audioBuffer);
        
        playerData.buffer = audioBuffer;
        playerData.isLoaded = true;

        console.log(`✅ Sample loaded to pad ${padIndex + 1} with waveform data`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error loading sample to pad ${padIndex}:`, error);
      return false;
    }
  }

  // 🆕 Método para extraer datos del waveform
  private async extractWaveformData(padIndex: number, audioBuffer: Tone.ToneAudioBuffer): Promise<void> {
    try {
      const playerData = this.players[padIndex];
      
      // Obtener datos del audio buffer
      const bufferData = audioBuffer.toArray();
      
      if (Array.isArray(bufferData)) {
        // Si es estéreo, usar el canal izquierdo
        playerData.rawAudioData = bufferData[0] as Float32Array;
        console.log(`🌊 Waveform data extracted: ${bufferData[0].length} samples (stereo)`);
      } else {
        // Si es mono
        playerData.rawAudioData = bufferData as Float32Array;
        console.log(`🌊 Waveform data extracted: ${bufferData.length} samples (mono)`);
      }
    } catch (error) {
      console.error(`Error extracting waveform data for pad ${padIndex}:`, error);
      this.players[padIndex].rawAudioData = null;
    }
  }

  async loadDemoSamples(): Promise<void> {
    const demoSamples = [
      { url: '/src/assets/samples/Cymatics-Kick.wav', name: 'KICK' },
      { url: '/src/assets/samples/Cymatics-Snare.wav', name: 'SNARE' },
      { url: '/src/assets/samples/Cymatics-Hihat.wav', name: 'HIHAT' },
      { url: '/src/assets/samples/Cymatics-OpenHat.wav', name: 'OPEN HAT' }
    ];

    for (let i = 0; i < demoSamples.length; i++) {
      try {
        await this.loadSampleToPad(i, demoSamples[i].url);
        console.log(`✅ Demo sample ${demoSamples[i].name} loaded to pad ${i + 1}`);
      } catch (error) {
        console.log(`⚠️ Could not load demo sample ${demoSamples[i].name}`);
      }
    }
  }

  async loadSampleFromFile(padIndex: number, file: File): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const audioUrl = URL.createObjectURL(file);
      const success = await this.loadSampleToPad(padIndex, audioUrl);

      if (success) {
        console.log(`✅ File "${file.name}" loaded to pad ${padIndex + 1} with waveform`);
      }

      return success;
    } catch (error) {
      console.error(`Error loading file to pad ${padIndex}:`, error);
      return false;
    }
  }

  clearPad(padIndex: number): void {
    const playerData = this.players[padIndex];

    if (playerData) {
      if (playerData.player.state === 'started') {
        playerData.player.stop();
      }

      playerData.player.dispose();
      playerData.player = new Tone.Player().toDestination();
      playerData.isLoaded = false;
      playerData.buffer = null;
      playerData.rawAudioData = null; // 🆕 Limpiar datos del waveform

      console.log(`🗑️ Pad ${padIndex + 1} cleared`);
    }
  }

  setBPM(bpm: number): void {
    if (bpm >= 60 && bpm <= 200) {
      Tone.Transport.bpm.value = bpm;
      console.log(`🎵 BPM set to ${bpm}`);
    }
  }

  startSequencer(): void {
    if (!this.sequence) {
      console.log('🎯 Sequencer will be implemented next');
    }

    Tone.Transport.start();
    this._isPlaying.set(true);
    console.log('▶️ Transport started');
  }

  stopSequencer(): void {
    Tone.Transport.stop();
    this._isPlaying.set(false);
    console.log('⏹️ Transport stopped');
  }

  togglePlayback(): void {
    if (this._isPlaying()) {
      this.stopSequencer();
    } else {
      this.startSequencer();
    }
  }

  getPadStatus(padIndex: number): { isLoaded: boolean; isPlaying: boolean } {
    const playerData = this.players[padIndex];

    if (!playerData) {
      return { isLoaded: false, isPlaying: false };
    }

    return {
      isLoaded: playerData.isLoaded,
      isPlaying: playerData.player.state === 'started'
    };
  }

  addEffectToPad(padIndex: number, effectType: 'reverb' | 'delay' | 'filter'): void {
    const playerData = this.players[padIndex];

    if (!playerData) return;

    switch (effectType) {
      case 'reverb':
        const reverb = new Tone.Reverb(2).toDestination();
        playerData.player.connect(reverb);
        break;

      case 'delay':
        const delay = new Tone.FeedbackDelay('8n', 0.3).toDestination();
        playerData.player.connect(delay);
        break;

      case 'filter':
        const filter = new Tone.Filter(1000, 'lowpass').toDestination();
        playerData.player.connect(filter);
        break;
    }

    console.log(`🎛️ ${effectType} added to pad ${padIndex + 1}`);
  }

  setPadVolume(padIndex: number, volume: number): void {
    const playerData = this.players[padIndex];
    if (playerData && playerData.player) {
      playerData.player.volume.value = Tone.gainToDb(volume);
    }
  }

  setPadPitch(padIndex: number, pitch: number): void {
    const playerData = this.players[padIndex];
    if (playerData && playerData.player) {
      playerData.player.playbackRate = Math.pow(2, pitch / 12);
    }
  }

  removeEffectFromPad(padIndex: number, effectType: string): void {
    const playerData = this.players[padIndex];
    if (!playerData) return;

    playerData.player.disconnect();
    playerData.player.toDestination();

    console.log(`🎛️ ${effectType} removed from pad ${padIndex + 1}`);
  }

  duplicatePad(sourcePadIndex: number, targetPadIndex: number): void {
    const sourcePlayer = this.players[sourcePadIndex];
    const targetPlayer = this.players[targetPadIndex];

    if (!sourcePlayer.isLoaded || !sourcePlayer.player.loaded) {
      console.log(`⚠️ Pad ${sourcePadIndex + 1} has no sample to duplicate`);
      return;
    }

    try {
      const newPlayer = new Tone.Player().toDestination();
      newPlayer.buffer = sourcePlayer.player.buffer;

      targetPlayer.player.dispose();
      targetPlayer.player = newPlayer;
      targetPlayer.isLoaded = true;
      targetPlayer.buffer = sourcePlayer.buffer;
      targetPlayer.rawAudioData = sourcePlayer.rawAudioData; // 🆕 Copiar datos del waveform

      console.log(`📋 Pad ${sourcePadIndex + 1} duplicated to ${targetPadIndex + 1}`);
    } catch (error) {
      console.error(`Error duplicating pad ${sourcePadIndex + 1}:`, error);
      console.log(`🚧 Duplication not available. Please load the same file manually.`);
    }
  }

  // 🆕 Método principal para obtener datos del waveform
  getPadWaveformData(padIndex: number): Float32Array | null {
    const playerData = this.players[padIndex];
    if (playerData && playerData.rawAudioData) {
      console.log(`🌊 Returning waveform data for pad ${padIndex + 1}: ${playerData.rawAudioData.length} samples`);
      return playerData.rawAudioData;
    }
    console.log(`⚠️ No waveform data for pad ${padIndex + 1}`);
    return null;
  }

  // Mantener para compatibilidad
  getPadBuffer(padIndex: number): Tone.ToneAudioBuffer | null {
    const playerData = this.players[padIndex];
    return playerData?.buffer || null;
  }

  // 🆕 Método de debug
  debugPadData(padIndex: number): void {
    const playerData = this.players[padIndex];
    console.log(`🔍 Pad ${padIndex + 1} debug:`, {
      isLoaded: playerData.isLoaded,
      hasBuffer: !!playerData.buffer,
      hasRawData: !!playerData.rawAudioData,
      bufferLoaded: playerData.buffer?.loaded,
      rawDataLength: playerData.rawAudioData?.length || 0,
      playerLoaded: playerData.player.loaded
    });
  }

  dispose(): void {
    this.players.forEach((playerData, index) => {
      if (playerData.player) {
        playerData.player.dispose();
      }
    });

    if (this.sequence) {
      this.sequence.dispose();
    }

    console.log('🧹 Audio service disposed');
  }
}