import { Router } from 'express';

import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { authenticate, requireAdmin, requirePermission } from '../middleware/auth.middleware.js';
import { TokenService } from '../services/token.service.js';
import { MintTokenRequestSchema } from '../types/index.js';
import type { ApiResponse, CapabilityToken } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /tokens
 * List all tokens (admin) or tokens issued to current user
 */
router.get('/tokens', (req: AuthenticatedRequest, res) => {
    const service = TokenService.getInstance();
    const isAdmin = req.user?.roles.includes('admin');

    // Non-admins can only see their own tokens
    const tokens = service.list(isAdmin ? undefined : req.user?.id);

    const response: ApiResponse<CapabilityToken[]> = {
        success: true,
        data: tokens,
    };
    res.json(response);
});

/**
 * GET /tokens/:id
 * Get a specific token
 */
router.get('/tokens/:id', (req: AuthenticatedRequest, res) => {
    const service = TokenService.getInstance();
    const token = service.getById(req.params.id);

    if (!token) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Token not found',
            },
        };
        res.status(404).json(response);
        return;
    }

    // Non-admins can only view their own tokens
    if (!req.user?.roles.includes('admin') && token.issuedTo !== req.user?.id) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Access denied',
            },
        };
        res.status(403).json(response);
        return;
    }

    const response: ApiResponse<CapabilityToken> = {
        success: true,
        data: token,
    };
    res.json(response);
});

/**
 * POST /tokens/mint
 * Request a new capability token
 */
router.post('/tokens/mint', (req: AuthenticatedRequest, res) => {
    const result = MintTokenRequestSchema.safeParse(req.body);

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

    const service = TokenService.getInstance();
    const token = service.mint(
        result.data,
        req.user?.id ?? 'unknown',
        req.user?.id ?? 'unknown'
    );

    const response: ApiResponse<CapabilityToken> = {
        success: true,
        data: token,
    };
    res.status(201).json(response);
});

/**
 * POST /tokens/:id/approve
 * Approve a token (adds current user as approver)
 */
router.post('/tokens/:id/approve', requirePermission('approve:changes'), (req: AuthenticatedRequest, res) => {
    const service = TokenService.getInstance();
    const token = service.getById(req.params.id);

    if (!token) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Token not found',
            },
        };
        res.status(404).json(response);
        return;
    }

    const success = service.addApprover(req.params.id, req.user?.id ?? 'unknown');
    const updatedToken = service.getById(req.params.id);

    const response: ApiResponse<CapabilityToken | null> = {
        success,
        data: updatedToken,
    };
    res.json(response);
});

/**
 * POST /tokens/:id/revoke
 * Revoke a token (admin only)
 */
router.post('/tokens/:id/revoke', requireAdmin, (req: AuthenticatedRequest, res) => {
    const service = TokenService.getInstance();
    const success = service.revoke(req.params.id, req.user?.id ?? 'unknown');

    if (!success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Token not found',
            },
        };
        res.status(404).json(response);
        return;
    }

    const token = service.getById(req.params.id);
    const response: ApiResponse<CapabilityToken | null> = {
        success: true,
        data: token,
    };
    res.json(response);
});

/**
 * POST /tokens/:id/validate
 * Validate a token is still valid
 */
router.post('/tokens/:id/validate', (req: AuthenticatedRequest, res) => {
    const service = TokenService.getInstance();
    const token = service.getById(req.params.id);

    if (!token) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Token not found',
            },
        };
        res.status(404).json(response);
        return;
    }

    const validation = service.isValid(token);

    const response: ApiResponse<{ valid: boolean; reason?: string }> = {
        success: true,
        data: validation,
    };
    res.json(response);
});

export default router;
