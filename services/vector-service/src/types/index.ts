import { z } from 'zod';

// =============================================================================
// Chunk Types
// =============================================================================

export const ChunkSchema = z.object({
    id: z.string(),
    content: z.string(),
    filePath: z.string(),
    startLine: z.number(),
    endLine: z.number(),
    checksum: z.string(),
    metadata: z.record(z.unknown()).optional(),
});

export type Chunk = z.infer<typeof ChunkSchema>;

export const VectorDocumentSchema = z.object({
    id: z.string(),
    chunkId: z.string(),
    embedding: z.array(z.number()),
    content: z.string(),
    filePath: z.string(),
    startLine: z.number(),
    endLine: z.number(),
    metadata: z.record(z.unknown()).optional(),
});

export type VectorDocument = z.infer<typeof VectorDocumentSchema>;

// =============================================================================
// Vector Store Interface (Adapter Pattern)
// =============================================================================

export interface VectorStoreAdapter {
    initialize(): Promise<void>;
    insert(docs: VectorDocument[]): Promise<void>;
    search(embedding: number[], topK: number, filters?: Record<string, unknown>): Promise<SearchResult[]>;
    delete(ids: string[]): Promise<void>;
    deleteByFile(filePath: string): Promise<void>;
    count(): Promise<number>;
}

export interface SearchResult {
    id: string;
    score: number;
    document: VectorDocument;
}

// =============================================================================
// Embedding Interface (Adapter Pattern)
// =============================================================================

export interface EmbeddingAdapter {
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    getDimensions(): number;
}

// =============================================================================
// Chunking Policy
// =============================================================================

export const ChunkingPolicySchema = z.object({
    maxChunkSize: z.number().default(512), // tokens
    chunkOverlap: z.number().default(64), // tokens
    minChunkSize: z.number().default(50), // tokens
});

export type ChunkingPolicy = z.infer<typeof ChunkingPolicySchema>;

// =============================================================================
// API Request/Response Types
// =============================================================================

export const IndexRequestSchema = z.object({
    filePath: z.string(),
    content: z.string(),
});

export type IndexRequest = z.infer<typeof IndexRequestSchema>;

export const SearchRequestSchema = z.object({
    query: z.string(),
    topK: z.number().min(1).max(100).default(10),
    filters: z.record(z.unknown()).optional(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

export interface VectorStats {
    totalDocuments: number;
    totalFiles: number;
    embeddingDimensions: number;
    storeType: string;
}
