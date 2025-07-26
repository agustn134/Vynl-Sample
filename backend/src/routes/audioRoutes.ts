import { Router } from 'express';
import { audioController } from '../controllers/audioController';

const router = Router();

// Rutas de audio
router.post('/upload', audioController.uploadSample);
router.post('/download', audioController.downloadFromUrl);
router.get('/samples/:userId', audioController.getUserSamples);
router.delete('/sample/:id', audioController.deleteSample);

export default router;
