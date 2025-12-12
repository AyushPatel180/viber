import { Router } from 'express';

import { DiffGeneratorService } from '../services/diff.service.js';
import { ChangeSetManager } from '../services/changeset.service.js';
import {
    GenerateDiffRequestSchema,
    ApplyDiffRequestSchema,
} from '../types/index.js';
import type { ApiResponse, SpeculativeChangeSet, GenerateResult, ApplyResult } from '../types/index.js';

const router = Router();

/**
 * POST /generate
 * Generate speculative diffs from a prompt
 */
router.post('/generate', async (req, res) => {
    const result = GenerateDiffRequestSchema.safeParse(req.body);

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
        const service = DiffGeneratorService.getInstance();
        const generateResult = await service.generate(
            result.data.prompt,
            result.data.focusedFiles,
            result.data.sessionId,
            result.data.useOracle
        );

        const response: ApiResponse<GenerateResult> = {
            success: true,
            data: generateResult,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'GENERATE_ERROR',
                message: err instanceof Error ? err.message : 'Failed to generate diffs',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /changesets
 * List change sets for a session
 */
router.get('/changesets', (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'sessionId is required' },
        };
        res.status(400).json(response);
        return;
    }

    const manager = ChangeSetManager.getInstance();
    const changeSets = manager.listBySession(sessionId);

    const response: ApiResponse<SpeculativeChangeSet[]> = {
        success: true,
        data: changeSets,
    };
    res.json(response);
});

/**
 * GET /changesets/:id
 * Get a specific change set
 */
router.get('/changesets/:id', (req, res) => {
    const manager = ChangeSetManager.getInstance();
    const changeSet = manager.get(req.params.id);

    if (!changeSet) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Change set not found' },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<SpeculativeChangeSet> = {
        success: true,
        data: changeSet,
    };
    res.json(response);
});

/**
 * POST /changesets/:id/approve
 * Approve a change set
 */
router.post('/changesets/:id/approve', (req, res) => {
    const manager = ChangeSetManager.getInstance();
    const success = manager.updateStatus(req.params.id, 'approved');

    if (!success) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Change set not found' },
        };
        res.status(404).json(response);
        return;
    }

    const changeSet = manager.get(req.params.id);
    const response: ApiResponse<SpeculativeChangeSet | null> = {
        success: true,
        data: changeSet,
    };
    res.json(response);
});

/**
 * POST /changesets/:id/reject
 * Reject a change set
 */
router.post('/changesets/:id/reject', (req, res) => {
    const manager = ChangeSetManager.getInstance();
    const success = manager.updateStatus(req.params.id, 'rejected');

    if (!success) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Change set not found' },
        };
        res.status(404).json(response);
        return;
    }

    const changeSet = manager.get(req.params.id);
    const response: ApiResponse<SpeculativeChangeSet | null> = {
        success: true,
        data: changeSet,
    };
    res.json(response);
});

/**
 * POST /apply
 * Apply a change set (with optional dry-run)
 */
router.post('/apply', async (req, res) => {
    const result = ApplyDiffRequestSchema.safeParse(req.body);

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
        const service = DiffGeneratorService.getInstance();
        const applyResult = await service.applyChangeSet(
            result.data.changeSetId,
            result.data.dryRun
        );

        const response: ApiResponse<ApplyResult> = {
            success: true,
            data: applyResult,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'APPLY_ERROR',
                message: err instanceof Error ? err.message : 'Failed to apply change set',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /stats
 * Get speculative engine statistics
 */
router.get('/stats', (req, res) => {
    const manager = ChangeSetManager.getInstance();
    const stats = manager.getStats();

    const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
    };
    res.json(response);
});

export default router;
