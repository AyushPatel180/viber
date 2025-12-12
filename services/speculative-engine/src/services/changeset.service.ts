import { v4 as uuidv4 } from 'uuid';

import type {
    SpeculativeDiff,
    SpeculativeChangeSet,
    ChangeSetStatus,
} from '../types/index.js';

/**
 * ChangeSetManager manages speculative change sets.
 * Tracks status, enables approval/rejection, and supports dry-run.
 */
export class ChangeSetManager {
    private static instance: ChangeSetManager;
    private changeSets: Map<string, SpeculativeChangeSet>;

    private constructor() {
        this.changeSets = new Map();
    }

    static getInstance(): ChangeSetManager {
        if (!ChangeSetManager.instance) {
            ChangeSetManager.instance = new ChangeSetManager();
        }
        return ChangeSetManager.instance;
    }

    /**
     * Create a new change set
     */
    create(
        sessionId: string,
        prompt: string,
        diffs: SpeculativeDiff[],
        generatedBy: 'local' | 'oracle'
    ): SpeculativeChangeSet {
        const now = new Date().toISOString();
        const changeSet: SpeculativeChangeSet = {
            id: uuidv4(),
            sessionId,
            prompt,
            diffs,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
            generatedBy,
        };

        this.changeSets.set(changeSet.id, changeSet);
        return changeSet;
    }

    /**
     * Get a change set by ID
     */
    get(id: string): SpeculativeChangeSet | null {
        return this.changeSets.get(id) ?? null;
    }

    /**
     * List change sets for a session
     */
    listBySession(sessionId: string): SpeculativeChangeSet[] {
        return Array.from(this.changeSets.values()).filter(
            (cs) => cs.sessionId === sessionId
        );
    }

    /**
     * Update change set status
     */
    updateStatus(id: string, status: ChangeSetStatus): boolean {
        const changeSet = this.changeSets.get(id);
        if (!changeSet) {
            return false;
        }

        changeSet.status = status;
        changeSet.updatedAt = new Date().toISOString();
        return true;
    }

    /**
     * Add test results to a change set
     */
    addTestResults(
        id: string,
        results: { passed: number; failed: number; skipped: number }
    ): boolean {
        const changeSet = this.changeSets.get(id);
        if (!changeSet) {
            return false;
        }

        changeSet.testResults = results;
        changeSet.updatedAt = new Date().toISOString();
        return true;
    }

    /**
     * Add sandbox result to a change set
     */
    addSandboxResult(
        id: string,
        result: { exitCode: number; stdout: string; stderr: string; durationMs: number }
    ): boolean {
        const changeSet = this.changeSets.get(id);
        if (!changeSet) {
            return false;
        }

        changeSet.sandboxResult = result;
        changeSet.updatedAt = new Date().toISOString();
        return true;
    }

    /**
     * Delete a change set
     */
    delete(id: string): boolean {
        return this.changeSets.delete(id);
    }

    /**
     * Get pending change sets
     */
    getPending(): SpeculativeChangeSet[] {
        return Array.from(this.changeSets.values()).filter(
            (cs) => cs.status === 'pending'
        );
    }

    /**
     * Get stats
     */
    getStats(): {
        total: number;
        pending: number;
        approved: number;
        applied: number;
        rejected: number;
    } {
        let pending = 0;
        let approved = 0;
        let applied = 0;
        let rejected = 0;

        for (const cs of this.changeSets.values()) {
            switch (cs.status) {
                case 'pending':
                    pending++;
                    break;
                case 'approved':
                    approved++;
                    break;
                case 'applied':
                    applied++;
                    break;
                case 'rejected':
                    rejected++;
                    break;
            }
        }

        return {
            total: this.changeSets.size,
            pending,
            approved,
            applied,
            rejected,
        };
    }
}
