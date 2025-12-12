import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';

import { config, isDevelopment } from './config/index.js';
import vectorRoutes from './routes/vector.routes.js';
import { VectorService } from './services/vector.service.js';
import type { ApiResponse } from './types/index.js';

// Create logger
const logger = pino({
    level: config.LOG_LEVEL,
    transport: isDevelopment()
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
});

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Larger limit for file content
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', async (_req, res) => {
    const service = await VectorService.getInstance();
    const stats = await service.getStats();

    res.json({
        status: 'healthy',
        service: 'vector-service',
        timestamp: new Date().toISOString(),
        stats: {
            totalDocuments: stats.totalDocuments,
            embeddingDimensions: stats.embeddingDimensions,
        },
    });
});

// API routes
app.use('/api/v1', vectorRoutes);

// 404 handler
app.use((req, res) => {
    const response: ApiResponse<null> = {
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    };
    res.status(404).json(response);
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled error');

    const response: ApiResponse<null> = {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: isDevelopment() ? err.message : 'An internal error occurred',
        },
    };
    res.status(500).json(response);
});

// Start server
const port = parseInt(config.PORT);
app.listen(port, () => {
    logger.info(`🚀 Vector Service running on port ${port}`);
    logger.info(`📋 Environment: ${config.NODE_ENV}`);
    logger.info(`📊 Store type: ${config.VECTOR_STORE_TYPE}`);
    logger.info(`🧠 Embedding type: ${config.EMBEDDING_TYPE}`);
});

export default app;
