import type { Request, Response, NextFunction } from 'express';

import { RBACService } from '../services/vault.service.js';
import type { Role, ApiResponse } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        roles: Role[];
        permissions: string[];
    };
}

/**
 * Authentication middleware (mock implementation)
 * In production, this would validate JWT tokens from Keycloak
 */
export function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        // For development, allow mock user
        if (process.env.NODE_ENV === 'development') {
            const rbac = RBACService.getInstance();
            req.user = {
                id: 'dev-user',
                roles: ['admin'],
                permissions: rbac.getPermissionsForRoles(['admin']),
            };
            next();
            return;
        }

        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'UNAUTHENTICATED',
                message: 'Missing or invalid authorization header',
            },
        };
        res.status(401).json(response);
        return;
    }

    // In production, validate token with Keycloak
    // For now, decode a mock token format: Bearer user-id:role1,role2
    const token = authHeader.slice(7);
    const [userId, rolesStr] = token.split(':');

    if (!userId || !rolesStr) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid token format',
            },
        };
        res.status(401).json(response);
        return;
    }

    const roles = rolesStr.split(',').filter((r): r is Role =>
        ['developer', 'reviewer', 'admin'].includes(r)
    );

    const rbac = RBACService.getInstance();
    req.user = {
        id: userId,
        roles,
        permissions: rbac.getPermissionsForRoles(roles),
    };

    next();
}

/**
 * Authorization middleware - checks if user has required permission
 */
export function requirePermission(permission: string) {
    return function (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): void {
        if (!req.user) {
            const response: ApiResponse<null> = {
                success: false,
                error: {
                    code: 'UNAUTHENTICATED',
                    message: 'User not authenticated',
                },
            };
            res.status(401).json(response);
            return;
        }

        if (!req.user.permissions.includes(permission)) {
            const response: ApiResponse<null> = {
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: `Missing required permission: ${permission}`,
                },
            };
            res.status(403).json(response);
            return;
        }

        next();
    };
}

/**
 * Require admin role specifically
 */
export function requireAdmin(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    if (!req.user) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'UNAUTHENTICATED',
                message: 'User not authenticated',
            },
        };
        res.status(401).json(response);
        return;
    }

    if (!req.user.roles.includes('admin')) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Admin role required',
            },
        };
        res.status(403).json(response);
        return;
    }

    next();
}
