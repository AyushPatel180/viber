import { Router } from 'express';

import { GVRService } from '../services/gvr.service.js';
import { GVRQuerySchema } from '../types/index.js';
import type { ApiResponse, GVRResponse } from '../types/index.js';

const router = Router();

/**
 * POST /gvr/query
 * Execute a Graph-Vector Retrieval query
 */
router.post('/gvr/query', async (req, res) => {
    const result = GVRQuerySchema.safeParse(req.body);

    if (!result.success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: result.error.errors.map((e) => e.message).join(', '),
            },
        };
        res.status(400).json(response);
        return;
    }

    try {
        const service = GVRService.getInstance();
        const gvrResponse = await service.query(result.data);

        const response: ApiResponse<GVRResponse> = {
            success: true,
            data: gvrResponse,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'GVR_ERROR',
                message: err instanceof Error ? err.message : 'Failed to execute GVR query',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * POST /index
 * Index a project directory
 */
router.post('/index', async (req, res) => {
    const { path: projectPath } = req.body as { path?: string };

    if (!projectPath) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'path is required',
            },
        };
        res.status(400).json(response);
        return;
    }

    try {
        const service = GVRService.getInstance();
        const indexResult = await service.indexProject(projectPath);

        const response: ApiResponse<typeof indexResult> = {
            success: indexResult.success,
            data: indexResult,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'INDEX_ERROR',
                message: err instanceof Error ? err.message : 'Failed to index project',
            },
        };
        res.status(500).json(response);
    }
});

export default router;
