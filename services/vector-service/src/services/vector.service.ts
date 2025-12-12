import { v4 as uuidv4 } from 'uuid';

import { config } from '../config/index.js';
import type { VectorStoreAdapter, EmbeddingAdapter, VectorDocument, SearchResult, Chunk, VectorStats } from '../types/index.js';
import { ChunkerService } from './chunker.service.js';
import { createEmbeddingAdapter } from './embedding.adapter.js';
import { createVectorStore } from './vector.store.js';

/**
 * VectorService orchestrates chunking, embedding, and vector storage.
 */
export class VectorService {
    private static instance: VectorService;
    private store: VectorStoreAdapter;
    private embedder: EmbeddingAdapter;
    private chunker: ChunkerService;
    private fileChecksums: Map<string, string>;

    private constructor() {
        this.store = createVectorStore(config.VECTOR_STORE_TYPE);
        this.embedder = createEmbeddingAdapter(config.EMBEDDING_TYPE);
        this.chunker = ChunkerService.getInstance();
        this.fileChecksums = new Map();
    }

    static async getInstance(): Promise<VectorService> {
        if (!VectorService.instance) {
            VectorService.instance = new VectorService();
            await VectorService.instance.store.initialize();
        }
        return VectorService.instance;
    }

    /**
     * Index a file's content
     */
    async indexFile(filePath: string, content: string, checksum?: string): Promise<{ chunksCreated: number }> {
        // Check if content changed
        const contentChecksum = checksum ?? this.computeChecksum(content);
        const existingChecksum = this.fileChecksums.get(filePath);

        if (existingChecksum === contentChecksum) {
            return { chunksCreated: 0 };
        }

        // Remove old chunks for this file
        await this.store.deleteByFile(filePath);

        // Chunk the content
        const chunks = this.chunker.chunkContent(filePath, content);

        // Generate embeddings
        const embeddings = await this.embedder.embedBatch(chunks.map((c) => c.content));

        // Create vector documents
        const docs: VectorDocument[] = chunks.map((chunk, i) => ({
            id: uuidv4(),
            chunkId: chunk.id,
            embedding: embeddings[i],
            content: chunk.content,
            filePath: chunk.filePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            metadata: { checksum: chunk.checksum },
        }));

        // Insert into store
        await this.store.insert(docs);

        // Update checksum
        this.fileChecksums.set(filePath, contentChecksum);

        return { chunksCreated: docs.length };
    }

    /**
     * Search for similar content
     */
    async search(query: string, topK: number = 10, filters?: Record<string, unknown>): Promise<SearchResult[]> {
        // Generate query embedding
        const queryEmbedding = await this.embedder.embed(query);

        // Search vector store
        return this.store.search(queryEmbedding, topK, filters);
    }

    /**
     * Delete all vectors for a file
     */
    async deleteFile(filePath: string): Promise<void> {
        await this.store.deleteByFile(filePath);
        this.fileChecksums.delete(filePath);
    }

    /**
     * Get service statistics
     */
    async getStats(): Promise<VectorStats> {
        const count = await this.store.count();

        return {
            totalDocuments: count,
            totalFiles: this.fileChecksums.size,
            embeddingDimensions: this.embedder.getDimensions(),
            storeType: config.VECTOR_STORE_TYPE,
        };
    }

    /**
     * Compute content checksum
     */
    private computeChecksum(content: string): string {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(content).digest('hex');
    }
}
