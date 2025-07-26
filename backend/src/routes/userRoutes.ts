import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

// Rutas de usuarios
router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/profile/:id', userController.getProfile);

export default router;
