import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';

import { config, isDevelopment } from './config/index.js';
import auditRoutes from './routes/audit.routes.js';
import { AuditStore } from './services/audit.store.js';
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
app.get('/health', async (req, res) => {
    const store = AuditStore.getInstance();
    const stats = await store.getStats();

    res.json({
        status: 'healthy',
        service: 'audit-service',
        timestamp: new Date().toISOString(),
        stats: {
            totalEntries: stats.totalEntries,
        },
    });
});

// API routes
app.use('/api/v1', auditRoutes);

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

// Initialize audit store and start server
async function start(): Promise<void> {
    const store = AuditStore.getInstance();
    await store.initialize();

    const port = parseInt(config.PORT);
    app.listen(port, () => {
        logger.info(`🚀 Audit Service running on port ${port}`);
        logger.info(`📋 Environment: ${config.NODE_ENV}`);
        logger.info(`📁 Store type: ${config.AUDIT_STORE_TYPE}`);
    });
}

start().catch((err) => {
    logger.error({ err }, 'Failed to start audit service');
    process.exit(1);
});

export default app;
