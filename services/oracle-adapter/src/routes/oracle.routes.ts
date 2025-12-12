import { Router } from 'express';

import { OracleClient } from '../services/oracle.service.js';
import { ReconciliationService } from '../services/reconcile.service.js';
import {
    OracleRequestSchema,
    ReconcileRequestSchema,
    CostEstimateRequestSchema,
} from '../types/index.js';
import type { ApiResponse, OracleResponse, ReconcileResult, CostEstimate } from '../types/index.js';

const router = Router();

/**
 * POST /query
 * Send a query to the oracle
 */
router.post('/query', async (req, res) => {
    const result = OracleRequestSchema.safeParse(req.body);

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
        const client = OracleClient.getInstance();
        const oracleResponse = await client.query(result.data);

        const response: ApiResponse<OracleResponse> = {
            success: true,
            data: oracleResponse,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'ORACLE_ERROR',
                message: err instanceof Error ? err.message : 'Oracle query failed',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * POST /reconcile
 * Reconcile speculative diffs with oracle
 */
router.post('/reconcile', async (req, res) => {
    const result = ReconcileRequestSchema.safeParse(req.body);

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
        const service = ReconciliationService.getInstance();
        const reconcileResult = await service.reconcile(result.data);

        const response: ApiResponse<ReconcileResult> = {
            success: true,
            data: reconcileResult,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'RECONCILE_ERROR',
                message: err instanceof Error ? err.message : 'Reconciliation failed',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * POST /estimate-cost
 * Estimate cost for a query
 */
router.post('/estimate-cost', (req, res) => {
    const result = CostEstimateRequestSchema.safeParse(req.body);

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

    const client = OracleClient.getInstance();
    const cost = client.calculateCost(result.data.model, {
        promptTokens: result.data.promptTokens,
        completionTokens: result.data.completionTokens,
        totalTokens: result.data.promptTokens + result.data.completionTokens,
    });

    const response: ApiResponse<CostEstimate> = {
        success: true,
        data: cost,
    };
    res.json(response);
});

/**
 * GET /stats
 * Get oracle usage stats
 */
router.get('/stats', (req, res) => {
    const client = OracleClient.getInstance();
    const reconciler = ReconciliationService.getInstance();

    const response: ApiResponse<{
        oracle: ReturnType<typeof client.getStats>;
        reconciliation: ReturnType<typeof reconciler.getStats>;
    }> = {
        success: true,
        data: {
            oracle: client.getStats(),
            reconciliation: reconciler.getStats(),
        },
    };
    res.json(response);
});

/**
 * GET /models
 * Get available models and pricing
 */
router.get('/models', (req, res) => {
    const { MODEL_PRICING } = require('../types/index.js');

    const response: ApiResponse<typeof MODEL_PRICING> = {
        success: true,
        data: MODEL_PRICING,
    };
    res.json(response);
});

export default router;
