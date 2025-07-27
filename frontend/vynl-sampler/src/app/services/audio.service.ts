// src/app/services/audio.service.ts - VERSIÓN CORREGIDA
import { Injectable, signal } from '@angular/core';
import * as Tone from 'tone';

interface SampleData {
  player: Tone.Player;
  buffer: Tone.ToneAudioBuffer | null;
  isLoaded: boolean;
  rawAudioData: Float32Array | null;
    sampleName: string | null; // ⚡ AGREGAR ESTO
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

  // ⚡ Optimizaciones de performance
  private bufferPool = new Map<string, AudioBuffer[]>();
  private maxBufferPoolSize = 5;
  private loadingPromises = new Map<number, Promise<boolean>>();
  private lastPlayTime = 0;
  private minPlayInterval = 16; // 60fps max

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
  rawAudioData: null,
  sampleName: null // ⚡ AGREGAR ESTO
      });
    }
  }


   // 🚀 MÉTODO NUEVO: Obtener nombre del sample
  getPadSampleName(padIndex: number): string | null {
    const playerData = this.players[padIndex];
    if (playerData && playerData.isLoaded) {
      // Aquí puedes retornar el nombre real del sample
      // Por ejemplo, si guardas el nombre cuando cargas el archivo
      return playerData.sampleName || `Sample ${padIndex + 1}`;
    }
    return null;
  }

  // 🚀 MÉTODO NUEVO: Obtener todos los nombres
  getAllSampleNames(): Map<number, string> {
    const names = new Map<number, string>();
    this.players.forEach((playerData, index) => {
      if (playerData.isLoaded) {
        const name = this.getPadSampleName(index);
        if (name) names.set(index, name);
      }
    });
    return names;
  }


  // 🚀 MÉTODO OPTIMIZADO: playPad con debounce
  async playPad(padIndex: number, volume: number = 1): Promise<void> {
    // ⚡ Debounce para evitar spam
    const now = performance.now();
    if (now - this.lastPlayTime < this.minPlayInterval) return;
    this.lastPlayTime = now;

    if (!this.isInitialized) await this.initialize();

    const playerData = this.players[padIndex];
    if (!playerData?.isLoaded || !playerData.player.loaded) {
      console.log(`⚠️ Pad ${padIndex + 1} has no sample loaded`);
      return;
    }

    try {
      // ⚡ Optimizar volumen
      const dbVolume = volume <= 0 ? -Infinity : Tone.gainToDb(volume);
      playerData.player.volume.value = dbVolume;

      // ⚡ Stop anterior si está reproduciendo
      if (playerData.player.state === 'started') {
        playerData.player.stop();
      }

      playerData.player.start();
      console.log(`🔊 Playing pad ${padIndex + 1} (vol: ${Math.round(volume * 100)}%)`);
    } catch (error) {
      console.error(`Error playing pad ${padIndex}:`, error);
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

  // 🚀 MÉTODO OPTIMIZADO: loadSampleToPad
  async loadSampleToPad(padIndex: number, audioUrl: string): Promise<boolean> {
    // Evitar cargas duplicadas
    if (this.loadingPromises.has(padIndex)) {
      return await this.loadingPromises.get(padIndex)!;
    }

    const loadPromise = this.loadSampleOptimized(padIndex, audioUrl);
    this.loadingPromises.set(padIndex, loadPromise);
    
    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(padIndex);
    }
  }

  // 🚀 MÉTODO NUEVO: Carga optimizada con buffer pooling
  private async loadSampleOptimized(padIndex: number, audioUrl: string): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();

    try {
      const playerData = this.players[padIndex];
      
      // 🗑️ Liberar buffer anterior
      if (playerData.isLoaded) {
        this.returnBufferToPool(playerData.buffer);
      }

      // ⚡ Cargar de forma optimizada
      await playerData.player.load(audioUrl);

      if (playerData.player.buffer?.loaded) {
        playerData.buffer = playerData.player.buffer as Tone.ToneAudioBuffer;
        playerData.isLoaded = true;

        // 🌊 Extraer waveform en background (no bloquear)
        this.extractWaveformAsync(padIndex, playerData.buffer);

        console.log(`✅ Pad ${padIndex + 1} loaded (optimized)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error loading pad ${padIndex}:`, error);
      return false;
    }
  }

  // 🚀 MÉTODO NUEVO: Waveform async (no bloquear UI)
  private extractWaveformAsync(padIndex: number, buffer: Tone.ToneAudioBuffer): void {
    // Usar requestIdleCallback si está disponible
    const extract = () => {
      try {
        const bufferData = buffer.toArray();
        const playerData = this.players[padIndex];
        
        if (Array.isArray(bufferData)) {
          playerData.rawAudioData = bufferData[0] as Float32Array;
          console.log(`🌊 Waveform data extracted: ${bufferData[0].length} samples (stereo)`);
        } else {
          playerData.rawAudioData = bufferData as Float32Array;
          console.log(`🌊 Waveform data extracted: ${bufferData.length} samples (mono)`);
        }
      } catch (error) {
        console.warn(`Waveform extraction failed for pad ${padIndex}`);
        this.players[padIndex].rawAudioData = null;
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(extract);
    } else {
      setTimeout(extract, 0);
    }
  }

  // 🚀 MÉTODO NUEVO: Buffer pool management
  private returnBufferToPool(buffer: Tone.ToneAudioBuffer | null): void {
    if (!buffer) return;
    
    const key = `${buffer.sampleRate}-${buffer.length}`;
    let pool = this.bufferPool.get(key);
    
    if (!pool) {
      pool = [];
      this.bufferPool.set(key, pool);
    }
    
    if (pool.length < this.maxBufferPoolSize) {
      pool.push(buffer as any);
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
         // ⚡ GUARDAR NOMBRE DEL ARCHIVO
    this.players[padIndex].sampleName = file.name.replace(/\.[^/.]+$/, '');
    console.log(`✅ File "${file.name}" loaded to pad ${padIndex + 1}`);
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
      playerData.rawAudioData = null;

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
      targetPlayer.rawAudioData = sourcePlayer.rawAudioData;

      console.log(`📋 Pad ${sourcePadIndex + 1} duplicated to ${targetPadIndex + 1}`);
    } catch (error) {
      console.error(`Error duplicating pad ${sourcePadIndex + 1}:`, error);
      console.log(`🚧 Duplication not available. Please load the same file manually.`);
    }
  }

  // 🚀 MÉTODO OPTIMIZADO: playPadWithEffects
  async playPadWithEffects(
    padIndex: number,
    velocity: number = 1,
    pan: number = 0,
    scheduledTime?: number
  ): Promise<void> {
    const playerData = this.players[padIndex];

    if (!playerData || !playerData.isLoaded) {
      console.warn(`⚠️ Pad ${padIndex + 1} not loaded`);
      return;
    }

    try {
      if (!playerData.buffer) {
        console.warn(`⚠️ Pad ${padIndex + 1} buffer is null`);
        return;
      }

      // 🎚️ Crear un nodo de ganancia temporal para este trigger
      const gainNode = new Tone.Gain(velocity).toDestination();
      
      // 🎯 Aplicar paneo
      const panNode = new Tone.Panner(pan).connect(gainNode);
      
      // 🎵 Conectar player a los efectos
      const tempPlayer = new Tone.Player(playerData.buffer);
      tempPlayer.connect(panNode);

      // ⏰ Reproducir en el tiempo especificado o inmediatamente
      if (scheduledTime) {
        tempPlayer.start(scheduledTime);
      } else {
        tempPlayer.start();
      }

      // 🗑️ Limpiar después de la reproducción
      tempPlayer.onstop = () => {
        tempPlayer.dispose();
        panNode.dispose();
        gainNode.dispose();
      };

      console.log(`🎵 Pad ${padIndex + 1} played with velocity: ${velocity}, pan: ${pan}`);

    } catch (error) {
      console.error(`❌ Error playing pad ${padIndex + 1} with effects:`, error);
    }
  }

  // 🚀 MÉTODOS HELPER para timing
  private applySwing(baseTime: number, stepIndex: number, swingAmount: number): number {
    if (swingAmount === 0) return baseTime;
    
    // Aplicar swing solo a steps impares (off-beats)
    if (stepIndex % 2 === 1) {
      const swingDelay = (swingAmount / 100) * 0.05; // Máximo 50ms de delay
      return baseTime + swingDelay;
    }
    
    return baseTime;
  }

  private applyHumanize(baseTime: number, humanizeAmount: number): number {
    if (humanizeAmount === 0) return baseTime;
    
    const variation = (Math.random() - 0.5) * 2; // -1 to 1
    const maxDeviation = (humanizeAmount / 100) * 0.02; // Máximo 20ms
    
    return baseTime + (variation * maxDeviation);
  }

  // 🌊 MÉTODOS WAVEFORM
  getPadWaveformData(padIndex: number): Float32Array | null {
    const playerData = this.players[padIndex];
    if (playerData && playerData.rawAudioData) {
      console.log(`🌊 Returning waveform data for pad ${padIndex + 1}: ${playerData.rawAudioData.length} samples`);
      return playerData.rawAudioData;
    }
    console.log(`⚠️ No waveform data for pad ${padIndex + 1}`);
    return null;
  }

  getPadBuffer(padIndex: number): Tone.ToneAudioBuffer | null {
    const playerData = this.players[padIndex];
    return playerData?.buffer || null;
  }

  // 🔍 DEBUG
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