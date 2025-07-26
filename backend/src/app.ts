import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

// Importar rutas
import audioRoutes from './routes/audioRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

// Middleware de seguridad
app.use(helmet());

// Configurar CORS para desarrollo
app.use(cors({
  origin: ['http://localhost:8100', 'http://localhost:4200'],
  credentials: true
}));

// Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas principales
app.use('/api/audio', audioRoutes);
app.use('/api/users', userRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'VYNL Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: '🎵 VYNL - Sample the Underground',
    description: 'Where vinyl nostalgia meets digital innovation',
    status: 'running'
  });
});

export default app;
