import { describe, it, expect, beforeEach } from 'vitest';
import { OracleClient } from '../services/oracle.service.js';

describe('OracleClient', () => {
    let client: OracleClient;

    beforeEach(() => {
        client = OracleClient.getInstance();
    });

    describe('query', () => {
        it('should return a mock response', async () => {
            const response = await client.query({
                sessionId: 'test-session-123',
                prompt: 'Fix the bug',
                provider: 'mock',
                model: 'mock-model',
                maxTokens: 1000,
                temperature: 0.7,
            });

            expect(response.id).toBeDefined();
            expect(response.sessionId).toBe('test-session-123');
            expect(response.response).toBeTruthy();
            expect(response.usage.totalTokens).toBeGreaterThan(0);
            expect(response.cost.currency).toBe('USD');
        });

        it('should generate bug fix response for fix prompts', async () => {
            const response = await client.query({
                sessionId: 'test-session',
                prompt: 'Fix the null reference bug',
                provider: 'mock',
                model: 'mock-model',
                maxTokens: 1000,
                temperature: 0.7,
            });

            expect(response.response).toContain('fix');
        });

        it('should track latency', async () => {
            const response = await client.query({
                sessionId: 'test-session',
                prompt: 'Help me',
                provider: 'mock',
                model: 'mock-model',
                maxTokens: 1000,
                temperature: 0.7,
            });

            expect(response.latencyMs).toBeGreaterThan(0);
        });
    });

    describe('calculateCost', () => {
        it('should calculate cost correctly for GPT-4', () => {
            const cost = client.calculateCost('gpt-4', {
                promptTokens: 1000,
                completionTokens: 500,
                totalTokens: 1500,
            });

            expect(cost.promptCost).toBe(0.03);  // 1000 * 0.03 / 1000
            expect(cost.completionCost).toBe(0.03);  // 500 * 0.06 / 1000
            expect(cost.totalCost).toBe(0.06);
        });

        it('should return zero cost for mock model', () => {
            const cost = client.calculateCost('mock-model', {
                promptTokens: 1000,
                completionTokens: 500,
                totalTokens: 1500,
            });

            expect(cost.totalCost).toBe(0);
        });
    });

    describe('getStats', () => {
        it('should return usage stats', () => {
            const stats = client.getStats();

            expect(stats).toHaveProperty('totalRequests');
            expect(stats).toHaveProperty('totalTokens');
            expect(stats).toHaveProperty('totalCost');
            expect(stats).toHaveProperty('hourlyCost');
        });
    });
});
