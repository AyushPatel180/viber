import { z } from 'zod';

// =============================================================================
// Audit Log Entry
// =============================================================================

export const AuditActionSchema = z.enum([
    'propose',
    'apply',
    'rollback',
    'approve',
    'reject',
    'execute',
    'create',
    'update',
    'delete',
    'revoke',
    'access',
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditCategorySchema = z.enum([
    'agent',
    'code',
    'sandbox',
    'approval',
    'token',
    'config',
    'billing',
    'access',
]);

export type AuditCategory = z.infer<typeof AuditCategorySchema>;

export const AuditLogEntrySchema = z.object({
    id: z.string().uuid(),
    timestamp: z.string().datetime(),
    action: AuditActionSchema,
    category: AuditCategorySchema,
    actor: z.object({
        id: z.string(),
        type: z.enum(['user', 'service', 'agent']),
        name: z.string().optional(),
    }),
    resource: z.object({
        type: z.string(),
        id: z.string(),
        name: z.string().optional(),
    }),
    details: z.record(z.unknown()).optional(),
    diff: z.object({
        before: z.unknown().optional(),
        after: z.unknown().optional(),
    }).optional(),
    testResults: z.object({
        passed: z.number(),
        failed: z.number(),
        skipped: z.number(),
        logs: z.string().optional(),
    }).optional(),
    approvals: z.array(z.object({
        approver: z.string(),
        timestamp: z.string().datetime(),
        signature: z.string(),
    })).optional(),
    signature: z.string(),
    previousLogId: z.string().uuid().optional(),
    sequenceNumber: z.number(),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const CreateAuditLogSchema = z.object({
    action: AuditActionSchema,
    category: AuditCategorySchema,
    actor: z.object({
        id: z.string(),
        type: z.enum(['user', 'service', 'agent']),
        name: z.string().optional(),
    }),
    resource: z.object({
        type: z.string(),
        id: z.string(),
        name: z.string().optional(),
    }),
    details: z.record(z.unknown()).optional(),
    diff: z.object({
        before: z.unknown().optional(),
        after: z.unknown().optional(),
    }).optional(),
    testResults: z.object({
        passed: z.number(),
        failed: z.number(),
        skipped: z.number(),
        logs: z.string().optional(),
    }).optional(),
});

export type CreateAuditLogInput = z.infer<typeof CreateAuditLogSchema>;

// =============================================================================
// Query Types
// =============================================================================

export const AuditLogQuerySchema = z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    action: AuditActionSchema.optional(),
    category: AuditCategorySchema.optional(),
    actorId: z.string().optional(),
    resourceType: z.string().optional(),
    resourceId: z.string().optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(20),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

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

export interface IntegrityCheckResult {
    valid: boolean;
    entriesChecked: number;
    invalidEntries: string[];
    chainBroken: boolean;
    firstBrokenAt?: string;
}
