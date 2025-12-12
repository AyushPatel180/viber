import { Router } from 'express';

import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { RBACService, ServiceAccountService } from '../services/vault.service.js';
import { CreateServiceAccountSchema } from '../types/index.js';
import type { ApiResponse, ServiceAccount, PaginatedResponse } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /roles
 * List all available roles and their permissions
 */
router.get('/roles', (req, res) => {
    const rbac = RBACService.getInstance();
    const roles = rbac.getRoles();

    const response: ApiResponse<typeof roles> = {
        success: true,
        data: roles,
    };
    res.json(response);
});

/**
 * GET /service-accounts
 * List all service accounts (paginated)
 */
router.get('/service-accounts', (req: AuthenticatedRequest, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const service = ServiceAccountService.getInstance();
    const { accounts, total } = service.list(page, pageSize);

    const response: PaginatedResponse<ServiceAccount> = {
        success: true,
        data: accounts,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        },
    };
    res.json(response);
});

/**
 * GET /service-accounts/:id
 * Get a specific service account
 */
router.get('/service-accounts/:id', (req: AuthenticatedRequest, res) => {
    const service = ServiceAccountService.getInstance();
    const account = service.getById(req.params.id);

    if (!account) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Service account not found',
            },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<ServiceAccount> = {
        success: true,
        data: account,
    };
    res.json(response);
});

/**
 * POST /service-accounts
 * Create a new service account (admin only)
 */
router.post('/service-accounts', requireAdmin, (req: AuthenticatedRequest, res) => {
    const result = CreateServiceAccountSchema.safeParse(req.body);

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

    const service = ServiceAccountService.getInstance();
    const account = service.create(result.data, req.user?.id ?? 'unknown');

    const response: ApiResponse<ServiceAccount> = {
        success: true,
        data: account,
    };
    res.status(201).json(response);
});

/**
 * DELETE /service-accounts/:id
 * Delete a service account (admin only)
 */
router.delete('/service-accounts/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const service = ServiceAccountService.getInstance();
    const success = service.delete(req.params.id);

    if (!success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Service account not found',
            },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<{ deleted: boolean }> = {
        success: true,
        data: { deleted: true },
    };
    res.json(response);
});

/**
 * POST /service-accounts/:id/disable
 * Disable a service account (admin only)
 */
router.post('/service-accounts/:id/disable', requireAdmin, (req: AuthenticatedRequest, res) => {
    const service = ServiceAccountService.getInstance();
    const success = service.disable(req.params.id);

    if (!success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Service account not found',
            },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<{ disabled: boolean }> = {
        success: true,
        data: { disabled: true },
    };
    res.json(response);
});

/**
 * POST /service-accounts/:id/enable
 * Enable a service account (admin only)
 */
router.post('/service-accounts/:id/enable', requireAdmin, (req: AuthenticatedRequest, res) => {
    const service = ServiceAccountService.getInstance();
    const success = service.enable(req.params.id);

    if (!success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Service account not found',
            },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<{ enabled: boolean }> = {
        success: true,
        data: { enabled: true },
    };
    res.json(response);
});

export default router;
