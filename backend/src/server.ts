import dotenv from 'dotenv';
import app from './app';

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🎵 VYNL Backend running on port ${PORT}`);
  console.log(`🔥 Sample the Underground - Server ready!`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});
