import { Router } from 'express';

import { AuditStore } from '../services/audit.store.js';
import { CreateAuditLogSchema, AuditLogQuerySchema } from '../types/index.js';
import type { ApiResponse, AuditLogEntry, PaginatedResponse, IntegrityCheckResult } from '../types/index.js';

const router = Router();

/**
 * POST /logs
 * Append a new audit log entry
 */
router.post('/logs', async (req, res) => {
    const result = CreateAuditLogSchema.safeParse(req.body);

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
        const store = AuditStore.getInstance();
        const entry = await store.append(result.data);

        const response: ApiResponse<AuditLogEntry> = {
            success: true,
            data: entry,
        };
        res.status(201).json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'STORE_ERROR',
                message: err instanceof Error ? err.message : 'Failed to append log',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /logs
 * Query audit logs with filters and pagination
 */
router.get('/logs', async (req, res) => {
    const queryResult = AuditLogQuerySchema.safeParse({
        startTime: req.query.startTime,
        endTime: req.query.endTime,
        action: req.query.action,
        category: req.query.category,
        actorId: req.query.actorId,
        resourceType: req.query.resourceType,
        resourceId: req.query.resourceId,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    });

    if (!queryResult.success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: queryResult.error.errors.map((e) => e.message).join(', '),
            },
        };
        res.status(400).json(response);
        return;
    }

    try {
        const store = AuditStore.getInstance();
        const { entries, total } = await store.query(queryResult.data);

        const response: PaginatedResponse<AuditLogEntry> = {
            success: true,
            data: entries,
            pagination: {
                page: queryResult.data.page,
                pageSize: queryResult.data.pageSize,
                total,
                totalPages: Math.ceil(total / queryResult.data.pageSize),
            },
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'QUERY_ERROR',
                message: err instanceof Error ? err.message : 'Failed to query logs',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /logs/:id
 * Get a specific log entry by ID
 */
router.get('/logs/:id', async (req, res) => {
    try {
        const store = AuditStore.getInstance();
        const entry = await store.getById(req.params.id);

        if (!entry) {
            const response: ApiResponse<null> = {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Log entry not found',
                },
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<AuditLogEntry> = {
            success: true,
            data: entry,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'STORE_ERROR',
                message: err instanceof Error ? err.message : 'Failed to get log',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /logs/:id/verify
 * Verify the integrity of a specific log entry
 */
router.get('/logs/:id/verify', async (req, res) => {
    try {
        const store = AuditStore.getInstance();
        const entry = await store.getById(req.params.id);

        if (!entry) {
            const response: ApiResponse<null> = {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Log entry not found',
                },
            };
            res.status(404).json(response);
            return;
        }

        const isValid = store.verifySignature(entry);

        const response: ApiResponse<{ id: string; valid: boolean }> = {
            success: true,
            data: {
                id: entry.id,
                valid: isValid,
            },
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VERIFY_ERROR',
                message: err instanceof Error ? err.message : 'Failed to verify log',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * POST /logs/verify-chain
 * Verify the integrity of the entire audit log chain
 */
router.post('/logs/verify-chain', async (req, res) => {
    try {
        const store = AuditStore.getInstance();
        const result = await store.verifyIntegrity();

        const response: ApiResponse<IntegrityCheckResult> = {
            success: true,
            data: result,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VERIFY_ERROR',
                message: err instanceof Error ? err.message : 'Failed to verify chain',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /stats
 * Get audit log statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const store = AuditStore.getInstance();
        const stats = await store.getStats();

        const response: ApiResponse<typeof stats> = {
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
