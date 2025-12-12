import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeSetManager } from '../services/changeset.service.js';

describe('ChangeSetManager', () => {
    let manager: ChangeSetManager;

    beforeEach(() => {
        // Get fresh singleton for each test
        manager = ChangeSetManager.getInstance();
    });

    describe('create', () => {
        it('should create a change set with pending status', () => {
            const changeSet = manager.create(
                'session-123',
                'Add error handling',
                [],
                'local'
            );

            expect(changeSet.id).toBeDefined();
            expect(changeSet.sessionId).toBe('session-123');
            expect(changeSet.prompt).toBe('Add error handling');
            expect(changeSet.status).toBe('pending');
            expect(changeSet.generatedBy).toBe('local');
        });

        it('should store diffs correctly', () => {
            const diffs = [
                {
                    id: 'diff-1',
                    filePath: '/src/index.ts',
                    diffType: 'replace' as const,
                    startLine: 10,
                    endLine: 15,
                    proposedContent: 'new code',
                    confidence: 0.9,
                    createdAt: new Date().toISOString(),
                },
            ];

            const changeSet = manager.create('session-456', 'Fix bug', diffs, 'oracle');

            expect(changeSet.diffs).toHaveLength(1);
            expect(changeSet.diffs[0].filePath).toBe('/src/index.ts');
        });
    });

    describe('updateStatus', () => {
        it('should update status to approved', () => {
            const changeSet = manager.create('session-789', 'Refactor', [], 'local');

            const result = manager.updateStatus(changeSet.id, 'approved');

            expect(result).toBe(true);
            expect(manager.get(changeSet.id)?.status).toBe('approved');
        });

        it('should return false for non-existent change set', () => {
            const result = manager.updateStatus('non-existent-id', 'approved');
            expect(result).toBe(false);
        });
    });

    describe('getStats', () => {
        it('should return correct stats', () => {
            // Create some change sets
            const cs1 = manager.create('s1', 'p1', [], 'local');
            manager.create('s2', 'p2', [], 'local');
            manager.updateStatus(cs1.id, 'approved');

            const stats = manager.getStats();

            expect(stats.total).toBeGreaterThanOrEqual(2);
            expect(stats.approved).toBeGreaterThanOrEqual(1);
        });
    });
});
