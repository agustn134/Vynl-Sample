import { Injectable, signal } from '@angular/core';
import * as Tone from 'tone';

interface SampleData {
  player: Tone.Player;
  buffer: Tone.ToneAudioBuffer | null;
  isLoaded: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private players: SampleData[] = [];
  private isInitialized = false;
  private sequence: Tone.Sequence | null = null;
  private currentStep = 0;

  private _isPlaying = signal(false);


  constructor() {
    this.initializePlayers();
  }

  // 🆕 Agregar este getter público
  isPlaying() {
    return this._isPlaying();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Inicializar el contexto de audio
      await Tone.start();

      // Configurar el transporte
      Tone.Transport.bpm.value = 120;

      console.log('🎵 VYNL Audio Engine initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  private initializePlayers(): void {
    // Crear 16 players para los pads
    for (let i = 0; i < 16; i++) {
      this.players.push({
        player: new Tone.Player().toDestination(),
        buffer: null,
        isLoaded: false
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
      // Aplicar volumen
      playerData.player.volume.value = Tone.gainToDb(volume);

      // Detener si ya está reproduciendo
      if (playerData.player.state === 'started') {
        playerData.player.stop();
      }

      // Reproducir el sample
      playerData.player.start();
      console.log(`🔊 Playing pad ${padIndex + 1} (vol: ${Math.round(volume * 100)}%)`);
    } catch (error) {
      console.error(`Error playing pad ${padIndex}:`, error);
    }
  } else {
    console.log(`⚠️ Pad ${padIndex + 1} has no sample loaded`);
  }
}

// Método para detener todos los pads (Panic)
stopAllPads(): void {
  this.players.forEach((playerData, index) => {
    if (playerData.player.state === 'started') {
      playerData.player.stop();
    }
  });
  console.log('🛑 All pads stopped (Panic)');
}


  async loadSampleToPad(padIndex: number, audioUrl: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const playerData = this.players[padIndex];

      // Cargar el audio en el player
      await playerData.player.load(audioUrl);

      playerData.isLoaded = true;

      console.log(`✅ Sample loaded to pad ${padIndex + 1}`);
      return true;
    } catch (error) {
      console.error(`Error loading sample to pad ${padIndex}:`, error);
      return false;
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
      // Crear URL del archivo
      const audioUrl = URL.createObjectURL(file);

      const success = await this.loadSampleToPad(padIndex, audioUrl);

      if (success) {
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
      // Detener reproducción
      if (playerData.player.state === 'started') {
        playerData.player.stop();
      }

      // Limpiar el player
      playerData.player.dispose();
      playerData.player = new Tone.Player().toDestination();
      playerData.isLoaded = false;
      playerData.buffer = null;

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
    this._isPlaying.set(true); // 🆕 Actualizar estado
    console.log('▶️ Transport started');
  }

  stopSequencer(): void {
    Tone.Transport.stop();
    this._isPlaying.set(false); // 🆕 Actualizar estado
    console.log('⏹️ Transport stopped');
  }

  // 🆕 Agregar método para alternar play/stop
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

  // Aplicar efectos a un pad específico
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


  // Agregar al final de audio.service.ts (antes del dispose)

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

  // Desconectar y recrear player limpio
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
    // Crear nuevo player
    const newPlayer = new Tone.Player().toDestination();

    // Copiar el buffer directamente
    newPlayer.buffer = sourcePlayer.player.buffer;

    // Reemplazar el player del pad destino
    targetPlayer.player.dispose();
    targetPlayer.player = newPlayer;
    targetPlayer.isLoaded = true;
    targetPlayer.buffer = sourcePlayer.buffer;

    console.log(`📋 Pad ${sourcePadIndex + 1} duplicated to ${targetPadIndex + 1}`);

  } catch (error) {
    console.error(`Error duplicating pad ${sourcePadIndex + 1}:`, error);

    // Fallback: mostrar mensaje informativo
    console.log(`🚧 Duplication not available. Please load the same file manually.`);
  }
}

getPadBuffer(padIndex: number): Tone.ToneAudioBuffer | null {
  const playerData = this.players[padIndex];
  return playerData?.player?.buffer || null;
}

  dispose(): void {
    // Limpiar todos los resources
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
