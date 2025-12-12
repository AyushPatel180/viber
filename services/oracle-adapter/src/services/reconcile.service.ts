import { v4 as uuidv4 } from 'uuid';

import type {
    ReconcileRequest,
    ReconcileResult,
    RefinedDiff,
} from '../types/index.js';
import { OracleClient } from './oracle.service.js';

/**
 * ReconciliationService compares speculative diffs with oracle refinements.
 */
export class ReconciliationService {
    private static instance: ReconciliationService;
    private results: Map<string, ReconcileResult>;

    private constructor() {
        this.results = new Map();
    }

    static getInstance(): ReconciliationService {
        if (!ReconciliationService.instance) {
            ReconciliationService.instance = new ReconciliationService();
        }
        return ReconciliationService.instance;
    }

    /**
     * Reconcile speculative diffs with oracle
     */
    async reconcile(request: ReconcileRequest): Promise<ReconcileResult> {
        const id = uuidv4();
        const startTime = Date.now();
        const oracleClient = OracleClient.getInstance();

        // Build reconciliation prompt
        const prompt = this.buildReconcilePrompt(request);

        // Query oracle for refinement
        const oracleResponse = await oracleClient.query({
            sessionId: request.sessionId,
            prompt,
            systemPrompt: 'You are a code review expert. Review the proposed changes and suggest improvements.',
            provider: request.provider,
            model: request.model,
            maxTokens: 4096,
            temperature: 0.7,
        });

        // Parse oracle response into refined diffs
        const refinedDiffs = this.parseRefinedDiffs(
            request.speculativeDiffs,
            oracleResponse.response
        );

        // Calculate overall confidence
        const avgConfidence =
            refinedDiffs.reduce((sum, d) => sum + d.confidence, 0) / refinedDiffs.length;

        const result: ReconcileResult = {
            id,
            sessionId: request.sessionId,
            changeSetId: request.changeSetId,
            approved: avgConfidence > 0.8,
            refinedDiffs,
            reasoning: oracleResponse.response,
            confidence: avgConfidence,
            usage: oracleResponse.usage,
            cost: oracleResponse.cost,
            latencyMs: Date.now() - startTime,
        };

        this.results.set(id, result);
        return result;
    }

    /**
     * Build prompt for reconciliation
     */
    private buildReconcilePrompt(request: ReconcileRequest): string {
        const diffDescriptions = request.speculativeDiffs
            .map(
                (d, i) =>
                    `### Change ${i + 1}: ${d.filePath}\n\`\`\`\n${d.content}\n\`\`\`\nConfidence: ${(d.confidence * 100).toFixed(1)}%`
            )
            .join('\n\n');

        return `Please review the following proposed code changes and provide feedback:

${diffDescriptions}

For each change:
1. Verify correctness
2. Suggest improvements if needed
3. Identify potential issues
4. Rate your confidence in each change (0-100%)`;
    }

    /**
     * Parse oracle response into refined diffs
     */
    private parseRefinedDiffs(
        original: ReconcileRequest['speculativeDiffs'],
        response: string
    ): RefinedDiff[] {
        // In a real implementation, this would parse the LLM response
        // For mock, we simulate refinements
        return original.map((diff) => ({
            filePath: diff.filePath,
            originalContent: diff.content,
            refinedContent: diff.content, // Mock: no changes
            changes: [],
            confidence: Math.min(diff.confidence + 0.1, 1.0), // Boost confidence slightly
        }));
    }

    /**
     * Get result by ID
     */
    get(id: string): ReconcileResult | null {
        return this.results.get(id) ?? null;
    }

    /**
     * Get stats
     */
    getStats(): {
        totalReconciliations: number;
        approved: number;
        rejected: number;
        avgConfidence: number;
    } {
        let approved = 0;
        let totalConfidence = 0;

        for (const r of this.results.values()) {
            if (r.approved) {
                approved++;
            }
            totalConfidence += r.confidence;
        }

        return {
            totalReconciliations: this.results.size,
            approved,
            rejected: this.results.size - approved,
            avgConfidence:
                this.results.size > 0 ? totalConfidence / this.results.size : 0,
        };
    }
}
