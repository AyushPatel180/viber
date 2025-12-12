import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';

import { config, isDevelopment } from './config/index.js';
import gvrRoutes from './routes/gvr.routes.js';
import contextRoutes from './routes/context.routes.js';
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
app.use(express.json());
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'orchestrator',
        timestamp: new Date().toISOString(),
        services: {
            ckg: config.CKG_SERVICE_URL,
            vector: config.VECTOR_SERVICE_URL,
            policy: config.POLICY_SERVICE_URL,
            audit: config.AUDIT_SERVICE_URL,
        },
    });
});

// API routes
app.use('/api/v1', gvrRoutes);
app.use('/api/v1', contextRoutes);

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
    logger.info(`🚀 Orchestrator running on port ${port}`);
    logger.info(`📋 Environment: ${config.NODE_ENV}`);
    logger.info(`🔗 CKG Service: ${config.CKG_SERVICE_URL}`);
    logger.info(`🔗 Vector Service: ${config.VECTOR_SERVICE_URL}`);
});

export default app;
