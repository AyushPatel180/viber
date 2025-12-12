import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config/index.js';
import type { Chunk, ChunkingPolicy } from '../types/index.js';

/**
 * ChunkerService splits file content into chunks for embedding.
 * Uses a deterministic chunking policy with overlap.
 */
export class ChunkerService {
    private static instance: ChunkerService;
    private policy: ChunkingPolicy;

    private constructor() {
        this.policy = {
            maxChunkSize: parseInt(config.CHUNK_MAX_SIZE),
            chunkOverlap: parseInt(config.CHUNK_OVERLAP),
            minChunkSize: 50,
        };
    }

    static getInstance(): ChunkerService {
        if (!ChunkerService.instance) {
            ChunkerService.instance = new ChunkerService();
        }
        return ChunkerService.instance;
    }

    /**
     * Split content into chunks with overlap
     */
    chunkContent(filePath: string, content: string): Chunk[] {
        const lines = content.split('\n');
        const chunks: Chunk[] = [];

        // Estimate tokens per line (rough: ~4 chars per token)
        const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

        let currentChunk: string[] = [];
        let currentTokens = 0;
        let startLine = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineTokens = estimateTokens(line);

            // If adding this line exceeds max, create a chunk
            if (currentTokens + lineTokens > this.policy.maxChunkSize && currentChunk.length > 0) {
                const chunkContent = currentChunk.join('\n');

                // Only add if meets minimum size
                if (estimateTokens(chunkContent) >= this.policy.minChunkSize) {
                    chunks.push(this.createChunk(filePath, chunkContent, startLine, startLine + currentChunk.length - 1));
                }

                // Calculate overlap - keep last N lines
                const overlapLines = this.calculateOverlapLines(currentChunk, this.policy.chunkOverlap);
                currentChunk = overlapLines;
                currentTokens = estimateTokens(overlapLines.join('\n'));
                startLine = i + 1 - overlapLines.length;
            }

            currentChunk.push(line);
            currentTokens += lineTokens;
        }

        // Add final chunk if has content
        if (currentChunk.length > 0) {
            const chunkContent = currentChunk.join('\n');
            if (estimateTokens(chunkContent) >= this.policy.minChunkSize) {
                chunks.push(this.createChunk(filePath, chunkContent, startLine, startLine + currentChunk.length - 1));
            }
        }

        return chunks;
    }

    /**
     * Calculate lines to keep for overlap
     */
    private calculateOverlapLines(lines: string[], targetTokens: number): string[] {
        const result: string[] = [];
        let tokens = 0;

        // Work backwards from end
        for (let i = lines.length - 1; i >= 0; i--) {
            const lineTokens = Math.ceil(lines[i].length / 4);
            if (tokens + lineTokens > targetTokens) {
                break;
            }
            result.unshift(lines[i]);
            tokens += lineTokens;
        }

        return result;
    }

    /**
     * Create a chunk object
     */
    private createChunk(filePath: string, content: string, startLine: number, endLine: number): Chunk {
        const checksum = crypto.createHash('sha256').update(content).digest('hex');

        return {
            id: uuidv4(),
            content,
            filePath,
            startLine,
            endLine,
            checksum,
        };
    }

    /**
     * Get the current chunking policy
     */
    getPolicy(): ChunkingPolicy {
        return { ...this.policy };
    }
}
