import { z } from 'zod';

// =============================================================================
// Oracle Provider Types
// =============================================================================

export const OracleProviderSchema = z.enum([
    'openai',
    'anthropic',
    'google',
    'azure',
    'mock',
]);

export type OracleProvider = z.infer<typeof OracleProviderSchema>;

export const OracleModelSchema = z.enum([
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'gemini-pro',
    'gemini-ultra',
    'mock-model',
]);

export type OracleModel = z.infer<typeof OracleModelSchema>;

// =============================================================================
// Request Types
// =============================================================================

export const OracleRequestSchema = z.object({
    sessionId: z.string().uuid(),
    prompt: z.string(),
    systemPrompt: z.string().optional(),
    context: z.string().optional(),
    provider: OracleProviderSchema.default('mock'),
    model: OracleModelSchema.default('mock-model'),
    maxTokens: z.number().min(1).max(32768).default(4096),
    temperature: z.number().min(0).max(2).default(0.7),
});

export type OracleRequest = z.infer<typeof OracleRequestSchema>;

export const ReconcileRequestSchema = z.object({
    sessionId: z.string().uuid(),
    changeSetId: z.string().uuid(),
    speculativeDiffs: z.array(z.object({
        filePath: z.string(),
        content: z.string(),
        confidence: z.number(),
    })),
    provider: OracleProviderSchema.default('mock'),
    model: OracleModelSchema.default('mock-model'),
});

export type ReconcileRequest = z.infer<typeof ReconcileRequestSchema>;

// =============================================================================
// Response Types
// =============================================================================

export interface OracleResponse {
    id: string;
    sessionId: string;
    response: string;
    provider: OracleProvider;
    model: OracleModel;
    usage: TokenUsage;
    cost: CostEstimate;
    latencyMs: number;
    createdAt: string;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface CostEstimate {
    promptCost: number;
    completionCost: number;
    totalCost: number;
    currency: string;
}

// =============================================================================
// Reconciliation Types
// =============================================================================

export interface ReconcileResult {
    id: string;
    sessionId: string;
    changeSetId: string;
    approved: boolean;
    refinedDiffs: RefinedDiff[];
    reasoning: string;
    confidence: number;
    usage: TokenUsage;
    cost: CostEstimate;
    latencyMs: number;
}

export interface RefinedDiff {
    filePath: string;
    originalContent: string;
    refinedContent: string;
    changes: string[];
    confidence: number;
}

// =============================================================================
// Cost Estimation Types
// =============================================================================

export const CostEstimateRequestSchema = z.object({
    provider: OracleProviderSchema,
    model: OracleModelSchema,
    promptTokens: z.number(),
    completionTokens: z.number(),
});

export type CostEstimateRequest = z.infer<typeof CostEstimateRequestSchema>;

// Model pricing (per 1K tokens)
export const MODEL_PRICING: Record<OracleModel, { prompt: number; completion: number }> = {
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'claude-3-opus': { prompt: 0.015, completion: 0.075 },
    'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
    'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
    'gemini-pro': { prompt: 0.00025, completion: 0.0005 },
    'gemini-ultra': { prompt: 0.00125, completion: 0.00375 },
    'mock-model': { prompt: 0, completion: 0 },
};

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
