import { z } from 'zod';

// =============================================================================
// GVR Query Types
// =============================================================================

export const GVRQuerySchema = z.object({
    query: z.string(),
    focusedFiles: z.array(z.string()).optional(),
    topK: z.number().min(1).max(50).default(10),
    graphDepth: z.number().min(1).max(5).default(2),
    includeGraphContext: z.boolean().default(true),
});

export type GVRQuery = z.infer<typeof GVRQuerySchema>;

// =============================================================================
// GVR Result Types
// =============================================================================

export interface GVRResult {
    id: string;
    content: string;
    filePath: string;
    startLine: number;
    endLine: number;
    score: number;
    scoreBreakdown: {
        semantic: number;
        graphRelevance: number;
        focusBoost: number;
    };
    connectedFiles: string[];
    nodeType?: string;
}

export interface GVRResponse {
    results: GVRResult[];
    graphContext: GraphContext | null;
    metadata: {
        queryTime: number;
        vectorHits: number;
        graphNodesVisited: number;
    };
}

export interface GraphContext {
    impactedFiles: string[];
    dependencyChain: DependencyChainNode[];
    modifiedSymbols: string[];
}

export interface DependencyChainNode {
    file: string;
    depth: number;
    relationship: string;
}

// =============================================================================
// Service Client Types
// =============================================================================

export interface CKGNode {
    id: string;
    type: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
    signature?: string;
}

export interface VectorSearchResult {
    id: string;
    score: number;
    document: {
        content: string;
        filePath: string;
        startLine: number;
        endLine: number;
    };
}

export interface DependencyResult {
    file: string;
    depth: number;
    relationship: string;
}

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
