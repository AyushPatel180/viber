import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';

import { config, isDevelopment } from './config/index.js';
import sandboxRoutes from './routes/sandbox.routes.js';
import { SandboxRunner } from './services/runner.service.js';
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
    const runner = SandboxRunner.getInstance();
    const stats = runner.getStats();

    res.json({
        status: 'healthy',
        service: 'sandbox-executor',
        timestamp: new Date().toISOString(),
        mode: config.SANDBOX_MODE,
        stats: {
            runningExecutions: stats.running,
            totalExecutions: stats.total,
        },
    });
});

// API routes
app.use('/api/v1', sandboxRoutes);

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
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
    logger.info(`🚀 Sandbox Executor running on port ${port}`);
    logger.info(`📋 Environment: ${config.NODE_ENV}`);
    logger.info(`🔒 Sandbox mode: ${config.SANDBOX_MODE}`);
});

export default app;
