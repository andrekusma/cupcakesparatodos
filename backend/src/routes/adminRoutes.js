import { Router } from 'express';
import multer from 'multer';
import { withAuth, requireRole } from '../middleware/auth.js';
import { store, updateOne, destroy } from '../controllers/cupcakeController.js';
import { uploadImage } from '../controllers/uploadController.js';

const upload = multer({ storage: multer.memoryStorage(), limits:{ fileSize: 5 * 1024 * 1024 } });

export const adminRouter = Router();

// CRUD cupcakes (apenas admin)
adminRouter.post('/cupcakes', withAuth, requireRole('admin'), store);
adminRouter.put('/cupcakes/:id', withAuth, requireRole('admin'), updateOne);
adminRouter.delete('/cupcakes/:id', withAuth, requireRole('admin'), destroy);

// Upload de imagem (retorna { url }) - requer Cloudinary configurado
adminRouter.post('/upload', withAuth, requireRole('admin'), upload.single('image'), uploadImage);
