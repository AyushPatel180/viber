import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxRunner } from '../services/runner.service.js';

describe('SandboxRunner', () => {
    let runner: SandboxRunner;

    beforeEach(() => {
        runner = SandboxRunner.getInstance();
    });

    describe('execute', () => {
        it('should execute a command in mock mode', async () => {
            const result = await runner.execute({
                sessionId: 'test-session-123',
                command: 'echo hello',
                timeout: 5000,
            });

            expect(result.id).toBeDefined();
            expect(result.sessionId).toBe('test-session-123');
            expect(result.status).toBe('completed');
            expect(result.exitCode).toBe(0);
            expect(result.timedOut).toBe(false);
        });

        it('should mock npm test output', async () => {
            const result = await runner.execute({
                sessionId: 'test-session-456',
                command: 'npm test',
                timeout: 5000,
            });

            expect(result.stdout).toContain('Test Files');
            expect(result.stdout).toContain('passed');
        });

        it('should mock build output', async () => {
            const result = await runner.execute({
                sessionId: 'test-session-789',
                command: 'npm run build',
                timeout: 5000,
            });

            expect(result.stdout).toContain('Successfully compiled');
        });
    });

    describe('get', () => {
        it('should return null for non-existent execution', () => {
            const result = runner.get('non-existent-id');
            expect(result).toBeNull();
        });

        it('should return execution by id', async () => {
            const execution = await runner.execute({
                sessionId: 'test-session',
                command: 'echo test',
                timeout: 5000,
            });

            const result = runner.get(execution.id);
            expect(result).not.toBeNull();
            expect(result?.command).toBe('echo test');
        });
    });

    describe('getStats', () => {
        it('should return stats', () => {
            const stats = runner.getStats();

            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('running');
            expect(stats).toHaveProperty('completed');
            expect(stats).toHaveProperty('failed');
        });
    });
});
