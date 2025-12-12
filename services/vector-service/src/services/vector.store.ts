import type { VectorStoreAdapter, VectorDocument, SearchResult } from '../types/index.js';

/**
 * InMemoryVectorStore provides a simple in-memory vector store for development.
 * Uses cosine similarity for search.
 */
export class InMemoryVectorStore implements VectorStoreAdapter {
    private documents: Map<string, VectorDocument>;
    private fileIndex: Map<string, Set<string>>; // filePath -> documentIds

    constructor() {
        this.documents = new Map();
        this.fileIndex = new Map();
    }

    async initialize(): Promise<void> {
        // No initialization needed for in-memory store
    }

    async insert(docs: VectorDocument[]): Promise<void> {
        for (const doc of docs) {
            this.documents.set(doc.id, doc);

            // Update file index
            if (!this.fileIndex.has(doc.filePath)) {
                this.fileIndex.set(doc.filePath, new Set());
            }
            this.fileIndex.get(doc.filePath)!.add(doc.id);
        }
    }

    async search(embedding: number[], topK: number, filters?: Record<string, unknown>): Promise<SearchResult[]> {
        const results: SearchResult[] = [];

        for (const doc of this.documents.values()) {
            // Apply filters if provided
            if (filters) {
                if (filters.filePath && doc.filePath !== filters.filePath) {
                    continue;
                }
            }

            const score = this.cosineSimilarity(embedding, doc.embedding);
            results.push({ id: doc.id, score, document: doc });
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        // Return top K
        return results.slice(0, topK);
    }

    async delete(ids: string[]): Promise<void> {
        for (const id of ids) {
            const doc = this.documents.get(id);
            if (doc) {
                // Remove from file index
                const fileIds = this.fileIndex.get(doc.filePath);
                if (fileIds) {
                    fileIds.delete(id);
                    if (fileIds.size === 0) {
                        this.fileIndex.delete(doc.filePath);
                    }
                }
                this.documents.delete(id);
            }
        }
    }

    async deleteByFile(filePath: string): Promise<void> {
        const docIds = this.fileIndex.get(filePath);
        if (docIds) {
            for (const id of docIds) {
                this.documents.delete(id);
            }
            this.fileIndex.delete(filePath);
        }
    }

    async count(): Promise<number> {
        return this.documents.size;
    }

    /**
     * Compute cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        if (denominator === 0) {
            return 0;
        }

        return dotProduct / denominator;
    }
}

/**
 * Factory to create vector store adapter based on config
 */
export function createVectorStore(type: string): VectorStoreAdapter {
    switch (type) {
        case 'memory':
        default:
            return new InMemoryVectorStore();
        // Milvus adapter would go here:
        // case 'milvus':
        //   return new MilvusVectorStore(config.MILVUS_HOST, config.MILVUS_PORT);
    }
}
