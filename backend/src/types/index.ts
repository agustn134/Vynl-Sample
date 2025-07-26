export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sample {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  fileUrl: string;
  duration: number;
  size: number;
  mimeType: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  bpm: number;
  pattern: boolean[][];
  samples: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioDownloadRequest {
  url: string;
  type: 'youtube' | 'samplette';
  userId: string;
}
