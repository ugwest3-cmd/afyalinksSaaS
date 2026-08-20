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

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(apiLimiter);

app.use('/api', routes);

app.use(errorHandler);

const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});
