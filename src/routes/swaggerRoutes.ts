// src/routes/swaggerRoutes.ts

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { specs } from '../utils/swagger';

const router = express.Router();

// Serve swagger docs
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

export default router;