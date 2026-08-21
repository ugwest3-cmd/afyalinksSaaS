import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { routes } from './routes/index.js';
import { WhatsAppManager } from './services/whatsapp/manager.js';

const app = express();

// Trust the first proxy (Railway load balancer) to ensure correct IP resolution for rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(apiLimiter);

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Afya Links Backend is running perfectly! 🚀');
});

// Initialize WhatsApp sessions in the background
WhatsAppManager.getInstance().initialize().catch(err => {
    logger.error(err, 'Failed to initialize WhatsApp Manager on startup');
});

app.use(errorHandler);

const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});
