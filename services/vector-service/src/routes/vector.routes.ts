import { Router } from 'express';

import { VectorService } from '../services/vector.service.js';
import { IndexRequestSchema, SearchRequestSchema } from '../types/index.js';
import type { ApiResponse, SearchResult, VectorStats } from '../types/index.js';

const router = Router();

/**
 * POST /index
 * Index a file's content
 */
router.post('/index', async (req, res) => {
    const result = IndexRequestSchema.safeParse(req.body);

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
        const service = await VectorService.getInstance();
        const indexResult = await service.indexFile(result.data.filePath, result.data.content);

        const response: ApiResponse<typeof indexResult> = {
            success: true,
            data: indexResult,
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
 * POST /search
 * Search for similar content
 */
router.post('/search', async (req, res) => {
    const result = SearchRequestSchema.safeParse(req.body);

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
        const service = await VectorService.getInstance();
        const searchResults = await service.search(result.data.query, result.data.topK, result.data.filters);

        const response: ApiResponse<SearchResult[]> = {
            success: true,
            data: searchResults,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'SEARCH_ERROR',
                message: err instanceof Error ? err.message : 'Failed to search',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * DELETE /file
 * Delete all vectors for a file
 */
router.delete('/file', async (req, res) => {
    const filePath = req.query.path as string | undefined;

    if (!filePath) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'path query parameter is required',
            },
        };
        res.status(400).json(response);
        return;
    }

    try {
        const service = await VectorService.getInstance();
        await service.deleteFile(filePath);

        const response: ApiResponse<{ deleted: boolean }> = {
            success: true,
            data: { deleted: true },
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'DELETE_ERROR',
                message: err instanceof Error ? err.message : 'Failed to delete',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /stats
 * Get vector store statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const service = await VectorService.getInstance();
        const stats = await service.getStats();

        const response: ApiResponse<VectorStats> = {
            success: true,
            data: stats,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'STATS_ERROR',
                message: err instanceof Error ? err.message : 'Failed to get stats',
            },
        };
        res.status(500).json(response);
    }
});

export default router;
