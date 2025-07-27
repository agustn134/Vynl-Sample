import { Injectable } from '@angular/core';
import * as Tone from 'tone';

@Injectable({
  providedIn: 'root'
})
export class WaveformService {
  private analyser: Tone.Analyser | null = null;
  private isInitialized = false;

  constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Crear analizador de audio
      this.analyser = new Tone.Analyser('waveform', 1024);

      // Conectar al destino maestro para capturar todo el audio
      Tone.getDestination().connect(this.analyser);

      this.isInitialized = true;
      console.log('🌊 Waveform service initialized');
    } catch (error) {
      console.error('Error initializing waveform service:', error);
    }
  }

  // Dibujar waveform estática desde buffer de audio
  drawStaticWaveform(canvas: HTMLCanvasElement, audioBuffer: Tone.ToneAudioBuffer): void {
    if (!audioBuffer || !audioBuffer.loaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    try {
      // Obtener datos del buffer
      const bufferData = audioBuffer.toArray() as Float32Array;
      const length = bufferData.length;
      const step = Math.ceil(length / width);

      // Configurar estilo
      ctx.strokeStyle = '#6c757d'; // vynl-charcoal
      ctx.lineWidth = 1;
      ctx.fillStyle = '#adb5bd'; // vynl-slate

      // Dibujar waveform
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        const index = i * step;
        if (index < length) {
          const sample = bufferData[index];
          const y = ((sample + 1) / 2) * height;

          if (i === 0) {
            ctx.moveTo(i, y);
          } else {
            ctx.lineTo(i, y);
          }
        }
      }
      ctx.stroke();

      // Línea central
      ctx.strokeStyle = '#495057'; // vynl-graphite
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

    } catch (error) {
      console.error('Error drawing waveform:', error);
      this.drawPlaceholder(ctx, width, height);
    }
  }

  // Dibujar waveform en tiempo real
  drawLiveWaveform(canvas: HTMLCanvasElement): void {
    if (!this.analyser || !this.isInitialized) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Obtener datos del analizador
    const waveform = this.analyser.getValue() as Float32Array;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Configurar estilo para visualización en vivo
    ctx.strokeStyle = '#212529'; // vynl-carbon
    ctx.lineWidth = 2;

    // Dibujar waveform
    ctx.beginPath();
    const sliceWidth = width / waveform.length;
    let x = 0;

    for (let i = 0; i < waveform.length; i++) {
      const v = (waveform[i] + 1) / 2;
      const y = v * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }

  // Placeholder cuando no hay audio
  drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    // Línea central
    ctx.strokeStyle = '#adb5bd'; // vynl-slate
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Texto
    ctx.fillStyle = '#6c757d'; // vynl-charcoal
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No waveform', width / 2, height / 2 - 10);
  }

  dispose(): void {
    if (this.analyser) {
      this.analyser.dispose();
      this.analyser = null;
    }
    this.isInitialized = false;
  }
}
