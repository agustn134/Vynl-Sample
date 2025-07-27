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
      this.analyser = new Tone.Analyser('waveform', 1024);
      Tone.getDestination().connect(this.analyser);
      this.isInitialized = true;
      console.log('🌊 Waveform service initialized');
    } catch (error) {
      console.error('Error initializing waveform service:', error);
    }
  }

  // 🆕 Método principal mejorado para waveform estático
  drawStaticWaveform(canvas: HTMLCanvasElement, waveformData: Float32Array): void {
  if (!waveformData || waveformData.length === 0) {
    this.drawPlaceholder(canvas);
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Limpiar canvas
  ctx.clearRect(0, 0, width, height);

  try {
    // Calcular downsampling para optimizar rendimiento
    const samplesPerPixel = Math.max(1, Math.floor(waveformData.length / width));
    
    // 🎨 Configurar estilos con colores del tema VYNL
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ffffff');     // vynl-white
    gradient.addColorStop(0.3, '#f8f9fa');   // vynl-cloud
    gradient.addColorStop(0.7, '#e9ecef');   // vynl-silver
    gradient.addColorStop(1, '#dee2e6');     // vynl-steel

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 2;

    // Dibujar waveform con peaks y valleys
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      const startIndex = x * samplesPerPixel;
      const endIndex = Math.min(startIndex + samplesPerPixel, waveformData.length);
      
      // Encontrar el valor máximo y mínimo en este segmento
      let min = 1;
      let max = -1;
      
      for (let i = startIndex; i < endIndex; i++) {
        const sample = waveformData[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      // Convertir a coordenadas del canvas
      const yMin = ((min + 1) / 2) * height;
      const yMax = ((max + 1) / 2) * height;
      
      // Dibujar línea vertical desde min a max
      if (x === 0) {
        ctx.moveTo(x, yMax);
      }
      
      ctx.lineTo(x, yMax);
      ctx.lineTo(x, yMin);
    }
    
    ctx.stroke();

    // 🎨 Línea central mejorada
    this.drawEnhancedCenterLine(ctx, width, height);

    // 🎨 Agregar puntos de referencia sutiles
    this.drawReferencePoints(ctx, width, height);

    console.log(`🌊 Waveform rendered: ${waveformData.length} samples → ${width}px`);

  } catch (error) {
    console.error('Error drawing waveform:', error);
    this.drawPlaceholder(canvas);
  }
}


// 🎨 Línea central mejorada
private drawEnhancedCenterLine(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  
  // Gradiente para la línea central
  const centerGradient = ctx.createLinearGradient(0, 0, width, 0);
  centerGradient.addColorStop(0, 'rgba(173, 181, 189, 0.1)');   // vynl-slate transparent
  centerGradient.addColorStop(0.5, 'rgba(173, 181, 189, 0.6)'); // vynl-slate medio
  centerGradient.addColorStop(1, 'rgba(173, 181, 189, 0.1)');   // vynl-slate transparent
  
  ctx.strokeStyle = centerGradient;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 4]);
  ctx.globalAlpha = 0.8;
  
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  
  ctx.restore();
}

// 🎨 Puntos de referencia sutiles
private drawReferencePoints(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  const pointSize = 1;
  const spacing = width / 8;
  
  for (let i = 1; i < 8; i++) {
    const x = i * spacing;
    // Punto superior
    ctx.fillRect(x - pointSize/2, height * 0.1, pointSize, pointSize);
    // Punto inferior
    ctx.fillRect(x - pointSize/2, height * 0.9, pointSize, pointSize);
  }
  
  ctx.restore();
}



  // 🆕 Método simplificado para canvas
  private drawCenterLine(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.strokeStyle = '#6c757d'; // vynl-charcoal
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.restore();
  }

  drawPlaceholder(canvas: HTMLCanvasElement, padNumber?: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Línea central mejorada
  this.drawEnhancedCenterLine(ctx, width, height);

  // 🎨 Texto con estilo mejorado
  ctx.save();
  
  // Gradiente para el texto
  const textGradient = ctx.createLinearGradient(0, 0, width, 0);
  textGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  textGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
  textGradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
  
  ctx.fillStyle = textGradient;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 3;
  
  const message = padNumber !== undefined 
    ? `♪ Pad ${padNumber} - Carga un sample`
    : '♪ Selecciona un pad para ver el waveform';
    
  ctx.fillText(message, width / 2, height / 2);
  
  ctx.restore();
}

  // Método existente para waveform en tiempo real
  drawLiveWaveform(canvas: HTMLCanvasElement): void {
    if (!this.analyser || !this.isInitialized) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const waveform = this.analyser.getValue() as Float32Array;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 2;
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

  dispose(): void {
    if (this.analyser) {
      this.analyser.dispose();
      this.analyser = null;
    }
    this.isInitialized = false;
  }
}
