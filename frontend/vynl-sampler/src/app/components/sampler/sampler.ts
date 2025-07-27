import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../services/audio';

interface Pad {
  id: number;
  isActive: boolean;
  sample: string | null;
  sampleName: string;
  isLoaded: boolean;
}

@Component({
  selector: 'app-sampler',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sampler.html',
  styleUrls: ['./sampler.scss'],
})
export class SamplerComponent implements OnInit {
  pads = signal<Pad[]>([]);
  isPlaying = signal(false);
  bpm = signal(120);

  constructor(private audioService: AudioService) {
    this.initializePads();
  }

  async ngOnInit() {
    await this.audioService.initialize();
  }

  initializePads() {
    const padsArray: Pad[] = [];
    for (let i = 0; i < 16; i++) {
      padsArray.push({
        id: i,
        isActive: false,
        sample: null,
        sampleName: `PAD ${i + 1}`,
        isLoaded: false,
      });
    }
    this.pads.set(padsArray);
  }

  async playPad(padIndex: number) {
  const currentPads = this.pads();

  // Activar visualmente
  currentPads[padIndex].isActive = true;
  this.pads.set([...currentPads]);

  // Reproducir audio
  if (currentPads[padIndex].isLoaded) {
    await this.audioService.playPad(padIndex);
  } else {
    // Si no hay sample, cargar uno demo automáticamente
    console.log(`🎵 Loading demo sample for pad ${padIndex + 1}`);
  }

  // Desactivar después de 200ms
  setTimeout(() => {
    currentPads[padIndex].isActive = false;
    this.pads.set([...currentPads]);
  }, 200);
}

  getPadClass(pad: Pad): string {
    let classes =
      'w-20 h-20 rounded-lg font-bold text-lg transition-all duration-75 border-2 shadow-lg ';

    if (pad.isActive) {
      classes +=
        'bg-vynl-purple border-vynl-purple-dark shadow-vynl-purple/50 animate-pad-hit ';
    } else if (pad.isLoaded) {
      classes += 'bg-vynl-gray border-vynl-purple hover:bg-vynl-purple/20 ';
    } else {
      classes += 'bg-vynl-dark border-vynl-gray hover:bg-vynl-gray/50 ';
    }

    return classes;
  }

  togglePlay() {
    this.isPlaying.set(!this.isPlaying());
    // TODO: Implementar secuenciador
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Buscar el primer pad vacío
      const emptyPadIndex = this.pads().findIndex((pad) => !pad.isLoaded);

      if (emptyPadIndex !== -1) {
        const file = files[0];
        this.loadFileToEmptyPad(file, emptyPadIndex);
      }
    }
  }

  async loadFileToEmptyPad(file: File, padIndex: number) {
    const success = await this.audioService.loadSampleFromFile(padIndex, file);

    if (success) {
      const currentPads = this.pads();
      currentPads[padIndex].isLoaded = true;
      currentPads[padIndex].sample = file.name;
      currentPads[padIndex].sampleName = file.name.replace(/\.[^/.]+$/, ''); // Sin extensión
      this.pads.set([...currentPads]);

      console.log(`✅ ${file.name} loaded to pad ${padIndex + 1}`);
    }
  }
}
