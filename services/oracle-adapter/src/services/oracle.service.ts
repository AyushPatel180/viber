import { v4 as uuidv4 } from 'uuid';

import { config } from '../config/index.js';
import type {
    OracleRequest,
    OracleResponse,
    OracleProvider,
    OracleModel,
    TokenUsage,
    CostEstimate,
} from '../types/index.js';
import { MODEL_PRICING } from '../types/index.js';

/**
 * OracleClient handles communication with cloud LLM providers.
 * Uses mock mode for development, real APIs for production.
 */
export class OracleClient {
    private static instance: OracleClient;
    private requests: Map<string, OracleResponse>;
    private hourlyUsage: { cost: number; timestamp: number }[];

    private constructor() {
        this.requests = new Map();
        this.hourlyUsage = [];
    }

    static getInstance(): OracleClient {
        if (!OracleClient.instance) {
            OracleClient.instance = new OracleClient();
        }
        return OracleClient.instance;
    }

    /**
     * Send request to oracle
     */
    async query(request: OracleRequest): Promise<OracleResponse> {
        const id = uuidv4();
        const startTime = Date.now();

        // Use mock or real provider
        if (request.provider === 'mock' || config.DEFAULT_PROVIDER === 'mock') {
            return this.mockQuery(id, request, startTime);
        }

        return this.realQuery(id, request, startTime);
    }

    /**
     * Mock query for development
     */
    private async mockQuery(
        id: string,
        request: OracleRequest,
        startTime: number
    ): Promise<OracleResponse> {
        // Simulate latency
        await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));

        // Mock token usage
        const promptTokens = Math.ceil(
            (request.prompt.length + (request.context?.length ?? 0)) / 4
        );
        const completionTokens = Math.ceil(200 + Math.random() * 300);

        const usage: TokenUsage = {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
        };

        const cost = this.calculateCost(request.model, usage);

        // Generate mock response
        const mockResponse = this.generateMockResponse(request.prompt);

        const response: OracleResponse = {
            id,
            sessionId: request.sessionId,
            response: mockResponse,
            provider: request.provider,
            model: request.model,
            usage,
            cost,
            latencyMs: Date.now() - startTime,
            createdAt: new Date().toISOString(),
        };

        this.requests.set(id, response);
        this.trackCost(cost.totalCost);

        return response;
    }

    /**
     * Real query to cloud provider (placeholder)
     */
    private async realQuery(
        id: string,
        request: OracleRequest,
        startTime: number
    ): Promise<OracleResponse> {
        // In production, this would call the actual provider API
        // For now, fall back to mock
        return this.mockQuery(id, request, startTime);
    }

    /**
     * Generate mock response based on prompt
     */
    private generateMockResponse(prompt: string): string {
        const promptLower = prompt.toLowerCase();

        if (promptLower.includes('fix') || promptLower.includes('bug')) {
            return `Based on the code analysis, the issue appears to be:

1. The variable is not properly initialized before use
2. Consider adding null checks

Here's the suggested fix:

\`\`\`typescript
// Add proper initialization
const value = initialValue ?? defaultValue;

// Add null check
if (value !== null && value !== undefined) {
  processValue(value);
}
\`\`\`

This should resolve the issue while maintaining type safety.`;
        }

        if (promptLower.includes('refactor') || promptLower.includes('improve')) {
            return `Here are the suggested improvements:

1. **Extract common logic** into reusable functions
2. **Add error handling** for edge cases
3. **Improve type definitions** for better IDE support

The refactored code follows SOLID principles and improves maintainability.`;
        }

        if (promptLower.includes('add') || promptLower.includes('create')) {
            return `I'll help you create the new functionality:

\`\`\`typescript
export function newFeature(): void {
  // Implementation
  console.log('New feature added');
}
\`\`\`

This follows the existing patterns in your codebase.`;
        }

        return `Analysis complete. Based on the context provided:

1. The code structure follows best practices
2. Consider adding tests for edge cases
3. Documentation could be improved

Let me know if you need more specific guidance.`;
    }

    /**
     * Calculate cost based on usage
     */
    calculateCost(model: OracleModel, usage: TokenUsage): CostEstimate {
        const pricing = MODEL_PRICING[model];

        const promptCost = (usage.promptTokens / 1000) * pricing.prompt;
        const completionCost = (usage.completionTokens / 1000) * pricing.completion;

        return {
            promptCost: Math.round(promptCost * 10000) / 10000,
            completionCost: Math.round(completionCost * 10000) / 10000,
            totalCost: Math.round((promptCost + completionCost) * 10000) / 10000,
            currency: 'USD',
        };
    }

    /**
     * Track hourly cost
     */
    private trackCost(cost: number): void {
        const now = Date.now();
        const oneHourAgo = now - 3600000;

        // Remove old entries
        this.hourlyUsage = this.hourlyUsage.filter((u) => u.timestamp > oneHourAgo);

        // Add new entry
        this.hourlyUsage.push({ cost, timestamp: now });
    }

    /**
     * Get hourly cost
     */
    getHourlyCost(): number {
        const oneHourAgo = Date.now() - 3600000;
        return this.hourlyUsage
            .filter((u) => u.timestamp > oneHourAgo)
            .reduce((sum, u) => sum + u.cost, 0);
    }

    /**
     * Get request by ID
     */
    get(id: string): OracleResponse | null {
        return this.requests.get(id) ?? null;
    }

    /**
     * Get stats
     */
    getStats(): {
        totalRequests: number;
        totalTokens: number;
        totalCost: number;
        hourlyCost: number;
    } {
        let totalTokens = 0;
        let totalCost = 0;

        for (const r of this.requests.values()) {
            totalTokens += r.usage.totalTokens;
            totalCost += r.cost.totalCost;
        }

        return {
            totalRequests: this.requests.size,
            totalTokens,
            totalCost: Math.round(totalCost * 10000) / 10000,
            hourlyCost: Math.round(this.getHourlyCost() * 10000) / 10000,
        };
    }
}
