import { getEmbeddingDimensions } from '../config/index.js';
import type { EmbeddingAdapter } from '../types/index.js';

/**
 * MockEmbeddingAdapter provides deterministic embeddings for development.
 * Uses a simple hashing approach to generate consistent vectors.
 */
export class MockEmbeddingAdapter implements EmbeddingAdapter {
    private dimensions: number;

    constructor() {
        this.dimensions = getEmbeddingDimensions();
    }

    /**
     * Generate a mock embedding for text
     * Uses a deterministic hash-based approach
     */
    async embed(text: string): Promise<number[]> {
        return this.generateDeterministicEmbedding(text);
    }

    /**
     * Generate mock embeddings for multiple texts
     */
    async embedBatch(texts: string[]): Promise<number[][]> {
        return texts.map((t) => this.generateDeterministicEmbedding(t));
    }

    getDimensions(): number {
        return this.dimensions;
    }

    /**
     * Generate a deterministic embedding based on text hash
     */
    private generateDeterministicEmbedding(text: string): number[] {
        const embedding: number[] = [];
        const normalized = text.toLowerCase().trim();

        // Simple hash-based seed
        let seed = 0;
        for (let i = 0; i < normalized.length; i++) {
            seed = ((seed << 5) - seed + normalized.charCodeAt(i)) | 0;
        }

        // Generate deterministic values using seeded random
        const random = this.seededRandom(seed);
        for (let i = 0; i < this.dimensions; i++) {
            // Generate value between -1 and 1
            embedding.push((random() * 2) - 1);
        }

        // Normalize to unit length
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        return embedding.map((v) => v / magnitude);
    }

    /**
     * Seeded pseudo-random number generator
     */
    private seededRandom(seed: number): () => number {
        let s = seed;
        return (): number => {
            s = Math.imul(48271, s) | 0 % 2147483647;
            return (s & 2147483647) / 2147483648;
        };
    }
}

/**
 * Factory to create embedding adapter based on config
 */
export function createEmbeddingAdapter(type: string): EmbeddingAdapter {
    switch (type) {
        case 'mock':
        default:
            return new MockEmbeddingAdapter();
        // OpenAI adapter would go here:
        // case 'openai':
        //   return new OpenAIEmbeddingAdapter(config.OPENAI_API_KEY);
    }
}
