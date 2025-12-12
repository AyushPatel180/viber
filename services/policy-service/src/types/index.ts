import { z } from 'zod';

// =============================================================================
// Role Definitions
// =============================================================================

export const RoleSchema = z.enum(['developer', 'reviewer', 'admin']);
export type Role = z.infer<typeof RoleSchema>;

export const RolePermissions: Record<Role, string[]> = {
    developer: [
        'read:code',
        'write:code',
        'execute:sandbox',
        'view:audit',
    ],
    reviewer: [
        'read:code',
        'write:code',
        'execute:sandbox',
        'view:audit',
        'approve:changes',
        'review:pr',
    ],
    admin: [
        'read:code',
        'write:code',
        'execute:sandbox',
        'view:audit',
        'approve:changes',
        'review:pr',
        'manage:roles',
        'manage:service-accounts',
        'manage:spend-caps',
        'manage:billing',
        'revoke:tokens',
        'freeze:agents',
    ],
};

// =============================================================================
// Service Account
// =============================================================================

export const ServiceAccountSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    roles: z.array(RoleSchema),
    createdAt: z.string().datetime(),
    createdBy: z.string(),
    expiresAt: z.string().datetime().optional(),
    enabled: z.boolean(),
});

export type ServiceAccount = z.infer<typeof ServiceAccountSchema>;

export const CreateServiceAccountSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    roles: z.array(RoleSchema),
    expiresAt: z.string().datetime().optional(),
});

export type CreateServiceAccountInput = z.infer<typeof CreateServiceAccountSchema>;

// =============================================================================
// Capability Token
// =============================================================================

export const CapabilityTokenSchema = z.object({
    id: z.string().uuid(),
    resource: z.string(),
    permissions: z.array(z.string()),
    issuedTo: z.string(),
    issuedBy: z.string(),
    approvers: z.array(z.string()),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    revoked: z.boolean(),
    revokedAt: z.string().datetime().optional(),
    revokedBy: z.string().optional(),
    signature: z.string(),
});

export type CapabilityToken = z.infer<typeof CapabilityTokenSchema>;

export const MintTokenRequestSchema = z.object({
    resource: z.string(),
    permissions: z.array(z.string()),
    expiresInSeconds: z.number().min(60).max(86400), // 1 min to 24 hours
    requiredApprovers: z.array(z.string()).optional(),
});

export type MintTokenRequest = z.infer<typeof MintTokenRequestSchema>;

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
