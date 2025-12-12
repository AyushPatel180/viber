import { Router } from 'express';

import { ContextStackService } from '../services/context.service.js';
import type { ApiResponse } from '../types/index.js';
import type {
    ConstitutionEntry,
    Blueprint,
    WorkbenchSession,
    WorkbenchFile,
    ContextResult,
} from '../types/context.types.js';

const router = Router();

// =============================================================================
// Constitution Routes
// =============================================================================

/**
 * GET /context/constitution
 * Get all constitution entries
 */
router.get('/context/constitution', (req, res) => {
    const service = ContextStackService.getInstance();
    const entries = service.getConstitution();

    const response: ApiResponse<ConstitutionEntry[]> = {
        success: true,
        data: entries,
    };
    res.json(response);
});

/**
 * PUT /context/constitution/:key
 * Set a constitution entry
 */
router.put('/context/constitution/:key', (req, res) => {
    const { value, description } = req.body as { value: string; description?: string };
    const key = req.params.key;

    if (!value) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'value is required' },
        };
        res.status(400).json(response);
        return;
    }

    const service = ContextStackService.getInstance();
    const entry = service.setConstitutionEntry(key, value, description);

    const response: ApiResponse<ConstitutionEntry> = {
        success: true,
        data: entry,
    };
    res.json(response);
});

// =============================================================================
// Blueprint Routes
// =============================================================================

/**
 * GET /context/blueprint
 * Get current blueprint
 */
router.get('/context/blueprint', (req, res) => {
    const service = ContextStackService.getInstance();
    const blueprint = service.getBlueprint();

    const response: ApiResponse<Blueprint | null> = {
        success: true,
        data: blueprint,
    };
    res.json(response);
});

/**
 * POST /context/blueprint/generate
 * Generate blueprint for a project
 */
router.post('/context/blueprint/generate', async (req, res) => {
    const { projectRoot } = req.body as { projectRoot?: string };

    if (!projectRoot) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'projectRoot is required' },
        };
        res.status(400).json(response);
        return;
    }

    try {
        const service = ContextStackService.getInstance();
        const blueprint = await service.generateBlueprint(projectRoot);

        const response: ApiResponse<Blueprint> = {
            success: true,
            data: blueprint,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'BLUEPRINT_ERROR',
                message: err instanceof Error ? err.message : 'Failed to generate blueprint',
            },
        };
        res.status(500).json(response);
    }
});

// =============================================================================
// Workbench Routes
// =============================================================================

/**
 * POST /context/workbench/session
 * Create a new workbench session
 */
router.post('/context/workbench/session', (req, res) => {
    const { userId } = req.body as { userId?: string };

    if (!userId) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'userId is required' },
        };
        res.status(400).json(response);
        return;
    }

    const service = ContextStackService.getInstance();
    const session = service.createWorkbenchSession(userId);

    const response: ApiResponse<WorkbenchSession> = {
        success: true,
        data: session,
    };
    res.status(201).json(response);
});

/**
 * GET /context/workbench/session/:id
 * Get a workbench session
 */
router.get('/context/workbench/session/:id', (req, res) => {
    const service = ContextStackService.getInstance();
    const session = service.getWorkbenchSession(req.params.id);

    if (!session) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Session not found or expired' },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<WorkbenchSession> = {
        success: true,
        data: session,
    };
    res.json(response);
});

/**
 * POST /context/workbench/session/:id/files
 * Add or update a file in workbench
 */
router.post('/context/workbench/session/:id/files', (req, res) => {
    const { path: filePath, content, staged, modified, originalContent } = req.body as {
        path?: string;
        content?: string;
        staged?: boolean;
        modified?: boolean;
        originalContent?: string;
    };

    if (!filePath || content === undefined) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'path and content are required' },
        };
        res.status(400).json(response);
        return;
    }

    const service = ContextStackService.getInstance();
    const file = service.addFileToWorkbench(req.params.id, {
        path: filePath,
        content,
        originalContent,
        staged: staged ?? false,
        modified: modified ?? true,
    });

    if (!file) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Session not found or expired' },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<WorkbenchFile> = {
        success: true,
        data: file,
    };
    res.json(response);
});

/**
 * DELETE /context/workbench/session/:id/files
 * Remove a file from workbench
 */
router.delete('/context/workbench/session/:id/files', (req, res) => {
    const filePath = req.query.path as string | undefined;

    if (!filePath) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'path query parameter is required' },
        };
        res.status(400).json(response);
        return;
    }

    const service = ContextStackService.getInstance();
    const removed = service.removeFileFromWorkbench(req.params.id, filePath);

    if (!removed) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Session or file not found' },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<{ removed: boolean }> = {
        success: true,
        data: { removed: true },
    };
    res.json(response);
});

// =============================================================================
// Context Assembly
// =============================================================================

/**
 * POST /context/assemble
 * Assemble context for focused files
 */
router.post('/context/assemble', (req, res) => {
    const { focusedFiles, includeTiers, sessionId } = req.body as {
        focusedFiles?: string[];
        includeTiers?: ('constitution' | 'blueprint' | 'workbench')[];
        sessionId?: string;
    };

    const service = ContextStackService.getInstance();
    const result = service.assembleContext({
        focusedFiles,
        includeTiers,
        sessionId,
    });

    const response: ApiResponse<ContextResult> = {
        success: true,
        data: result,
    };
    res.json(response);
});

/**
 * GET /context/stats
 * Get context stack statistics
 */
router.get('/context/stats', (req, res) => {
    const service = ContextStackService.getInstance();
    const stats = service.getStats();

    const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
    };
    res.json(response);
});

export default router;
