import { z } from 'zod';

// =============================================================================
// Speculative Diff Types
// =============================================================================

export const DiffTypeSchema = z.enum(['insert', 'delete', 'replace', 'move']);
export type DiffType = z.infer<typeof DiffTypeSchema>;

export const SpeculativeDiffSchema = z.object({
    id: z.string().uuid(),
    filePath: z.string(),
    diffType: DiffTypeSchema,
    startLine: z.number(),
    endLine: z.number(),
    originalContent: z.string().optional(),
    proposedContent: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().optional(),
    createdAt: z.string().datetime(),
});

export type SpeculativeDiff = z.infer<typeof SpeculativeDiffSchema>;

// =============================================================================
// Speculative Change Set
// =============================================================================

export const ChangeSetStatusSchema = z.enum([
    'pending',    // Awaiting review
    'approved',   // Human approved
    'rejected',   // Human rejected
    'applied',    // Applied to codebase
    'reverted',   // Reverted after apply
]);

export type ChangeSetStatus = z.infer<typeof ChangeSetStatusSchema>;

export const SpeculativeChangeSetSchema = z.object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    prompt: z.string(),
    diffs: z.array(SpeculativeDiffSchema),
    status: ChangeSetStatusSchema,
    testResults: z.object({
        passed: z.number(),
        failed: z.number(),
        skipped: z.number(),
    }).optional(),
    sandboxResult: z.object({
        exitCode: z.number(),
        stdout: z.string(),
        stderr: z.string(),
        durationMs: z.number(),
    }).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    generatedBy: z.enum(['local', 'oracle']),
    metadata: z.record(z.unknown()).optional(),
});

export type SpeculativeChangeSet = z.infer<typeof SpeculativeChangeSetSchema>;

// =============================================================================
// API Request Types
// =============================================================================

export const GenerateDiffRequestSchema = z.object({
    prompt: z.string(),
    focusedFiles: z.array(z.string()),
    sessionId: z.string().uuid(),
    useOracle: z.boolean().default(false),
});

export type GenerateDiffRequest = z.infer<typeof GenerateDiffRequestSchema>;

export const ApplyDiffRequestSchema = z.object({
    changeSetId: z.string().uuid(),
    dryRun: z.boolean().default(true),
});

export type ApplyDiffRequest = z.infer<typeof ApplyDiffRequestSchema>;

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

export interface GenerateResult {
    changeSet: SpeculativeChangeSet;
    contextTokens: number;
    responseTokens: number;
}

export interface ApplyResult {
    applied: boolean;
    filesModified: string[];
    testsPassed: boolean;
    sandboxExitCode: number;
}
