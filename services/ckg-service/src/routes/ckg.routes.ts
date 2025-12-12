import { Router } from 'express';

import { CKGService } from '../services/ckg.service.js';
import { GetDependentsQuerySchema } from '../types/index.js';
import type { ApiResponse, CKGNode, DependencyResult, GraphStats } from '../types/index.js';

const router = Router();

/**
 * POST /index
 * Index a directory or file
 */
router.post('/index', async (req, res) => {
    const { path: targetPath } = req.body as { path?: string };

    if (!targetPath) {
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
        const service = CKGService.getInstance();
        const result = await service.indexDirectory(targetPath);

        const response: ApiResponse<typeof result> = {
            success: true,
            data: result,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'INDEX_ERROR',
                message: err instanceof Error ? err.message : 'Failed to index directory',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * POST /index/file
 * Index a single file
 */
router.post('/index/file', async (req, res) => {
    const { path: filePath } = req.body as { path?: string };

    if (!filePath) {
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
        const service = CKGService.getInstance();
        const result = await service.indexFile(filePath);

        const response: ApiResponse<typeof result> = {
            success: true,
            data: result,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'INDEX_ERROR',
                message: err instanceof Error ? err.message : 'Failed to index file',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /dependents
 * Get files that depend on a given file
 */
router.get('/dependents', (req, res) => {
    const result = GetDependentsQuerySchema.safeParse({
        filePath: req.query.filePath,
        depth: req.query.depth ? parseInt(req.query.depth as string) : 3,
    });

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

    const service = CKGService.getInstance();
    const dependents = service.getDependents(result.data.filePath, result.data.depth);

    const response: ApiResponse<DependencyResult[]> = {
        success: true,
        data: dependents,
    };
    res.json(response);
});

/**
 * GET /dependencies
 * Get files that a given file depends on
 */
router.get('/dependencies', (req, res) => {
    const result = GetDependentsQuerySchema.safeParse({
        filePath: req.query.filePath,
        depth: req.query.depth ? parseInt(req.query.depth as string) : 3,
    });

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

    const service = CKGService.getInstance();
    const dependencies = service.getDependencies(result.data.filePath, result.data.depth);

    const response: ApiResponse<DependencyResult[]> = {
        success: true,
        data: dependencies,
    };
    res.json(response);
});

/**
 * GET /nodes
 * Get all nodes for a file
 */
router.get('/nodes', (req, res) => {
    const filePath = req.query.filePath as string | undefined;

    if (!filePath) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'filePath is required',
            },
        };
        res.status(400).json(response);
        return;
    }

    const service = CKGService.getInstance();
    const nodes = service.getNodesForFile(filePath);

    const response: ApiResponse<CKGNode[]> = {
        success: true,
        data: nodes,
    };
    res.json(response);
});

/**
 * GET /search
 * Search nodes by name
 */
router.get('/search', (req, res) => {
    const query = req.query.q as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    if (!query) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'q (query) is required',
            },
        };
        res.status(400).json(response);
        return;
    }

    const service = CKGService.getInstance();
    const nodes = service.searchNodes(query, limit);

    const response: ApiResponse<CKGNode[]> = {
        success: true,
        data: nodes,
    };
    res.json(response);
});

/**
 * GET /stats
 * Get graph statistics
 */
router.get('/stats', (req, res) => {
    const service = CKGService.getInstance();
    const stats = service.getStats();

    const response: ApiResponse<GraphStats> = {
        success: true,
        data: stats,
    };
    res.json(response);
});

/**
 * DELETE /clear
 * Clear the entire graph
 */
router.delete('/clear', (req, res) => {
    const service = CKGService.getInstance();
    service.clear();

    const response: ApiResponse<{ cleared: boolean }> = {
        success: true,
        data: { cleared: true },
    };
    res.json(response);
});

export default router;
