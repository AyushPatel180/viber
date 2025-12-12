import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

import { config } from '../config/index.js';
import type { SpeculativeDiff, SpeculativeChangeSet, GenerateResult } from '../types/index.js';
import { ChangeSetManager } from './changeset.service.js';

/**
 * DiffGeneratorService generates speculative diffs from prompts.
 * Uses a mock local model for development (would integrate with llama.cpp in production).
 */
export class DiffGeneratorService {
    private static instance: DiffGeneratorService;

    private constructor() { }

    static getInstance(): DiffGeneratorService {
        if (!DiffGeneratorService.instance) {
            DiffGeneratorService.instance = new DiffGeneratorService();
        }
        return DiffGeneratorService.instance;
    }

    /**
     * Generate speculative diffs for a prompt
     */
    async generate(
        prompt: string,
        focusedFiles: string[],
        sessionId: string,
        useOracle: boolean = false
    ): Promise<GenerateResult> {
        // Fetch context from orchestrator
        const context = await this.fetchContext(focusedFiles, sessionId);

        // Generate diffs (mock for development)
        const diffs = await this.mockGenerateDiffs(prompt, focusedFiles, context);

        // Create change set
        const changeSetManager = ChangeSetManager.getInstance();
        const changeSet = changeSetManager.create(
            sessionId,
            prompt,
            diffs,
            useOracle ? 'oracle' : 'local'
        );

        return {
            changeSet,
            contextTokens: Math.ceil(context.length / 4),
            responseTokens: Math.ceil(JSON.stringify(diffs).length / 4),
        };
    }

    /**
     * Fetch context from orchestrator
     */
    private async fetchContext(focusedFiles: string[], sessionId: string): Promise<string> {
        try {
            const response = await axios.post(`${config.ORCHESTRATOR_URL}/api/v1/context/assemble`, {
                focusedFiles,
                sessionId,
                includeTiers: ['constitution', 'blueprint', 'workbench'],
            });

            if (response.data.success && response.data.data) {
                // Serialize context
                const ctx = response.data.data;
                return JSON.stringify(ctx, null, 2);
            }
            return '';
        } catch {
            // Return empty context if orchestrator unavailable
            return '';
        }
    }

    /**
     * Mock diff generation (simulates local LLM response)
     */
    private async mockGenerateDiffs(
        prompt: string,
        focusedFiles: string[],
        context: string
    ): Promise<SpeculativeDiff[]> {
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        const diffs: SpeculativeDiff[] = [];
        const now = new Date().toISOString();

        // Generate mock diff based on prompt keywords
        const promptLower = prompt.toLowerCase();

        if (focusedFiles.length > 0) {
            const targetFile = focusedFiles[0];

            if (promptLower.includes('add')) {
                diffs.push({
                    id: uuidv4(),
                    filePath: targetFile,
                    diffType: 'insert',
                    startLine: 10,
                    endLine: 10,
                    proposedContent: `// Added by speculative engine\n// Prompt: ${prompt}\nexport function newFunction(): void {\n  console.log('New function added');\n}\n`,
                    confidence: 0.85,
                    reasoning: 'Adding new function based on prompt request',
                    createdAt: now,
                });
            } else if (promptLower.includes('fix') || promptLower.includes('bug')) {
                diffs.push({
                    id: uuidv4(),
                    filePath: targetFile,
                    diffType: 'replace',
                    startLine: 5,
                    endLine: 10,
                    originalContent: '// Original code\nconst value = null;',
                    proposedContent: '// Fixed code\nconst value = defaultValue ?? {};',
                    confidence: 0.9,
                    reasoning: 'Fixed potential null reference based on bug report',
                    createdAt: now,
                });
            } else if (promptLower.includes('remove') || promptLower.includes('delete')) {
                diffs.push({
                    id: uuidv4(),
                    filePath: targetFile,
                    diffType: 'delete',
                    startLine: 15,
                    endLine: 20,
                    originalContent: '// Deprecated code to remove\nfunction deprecatedFunction() {}',
                    proposedContent: '',
                    confidence: 0.75,
                    reasoning: 'Removing deprecated code as requested',
                    createdAt: now,
                });
            } else {
                // Default: suggest a refactor
                diffs.push({
                    id: uuidv4(),
                    filePath: targetFile,
                    diffType: 'replace',
                    startLine: 1,
                    endLine: 5,
                    originalContent: '// Original imports',
                    proposedContent: `// Refactored imports\n// Based on: ${prompt}\nimport { optimized } from './optimized';`,
                    confidence: 0.7,
                    reasoning: 'General refactoring suggestion based on prompt',
                    createdAt: now,
                });
            }
        }

        return diffs;
    }

    /**
     * Apply a change set (mock implementation)
     */
    async applyChangeSet(
        changeSetId: string,
        dryRun: boolean = true
    ): Promise<{
        applied: boolean;
        filesModified: string[];
        testsPassed: boolean;
        sandboxExitCode: number;
    }> {
        const changeSetManager = ChangeSetManager.getInstance();
        const changeSet = changeSetManager.get(changeSetId);

        if (!changeSet) {
            throw new Error('Change set not found');
        }

        if (changeSet.status !== 'pending' && changeSet.status !== 'approved') {
            throw new Error(`Cannot apply change set with status: ${changeSet.status}`);
        }

        // Extract unique files
        const filesModified = [...new Set(changeSet.diffs.map((d) => d.filePath))];

        // Mock sandbox execution
        const sandboxResult = {
            exitCode: 0,
            stdout: 'All tests passed.\n',
            stderr: '',
            durationMs: 150,
        };

        // Mock test results
        const testResults = {
            passed: 10,
            failed: 0,
            skipped: 2,
        };

        // Update change set
        changeSetManager.addSandboxResult(changeSetId, sandboxResult);
        changeSetManager.addTestResults(changeSetId, testResults);

        if (!dryRun) {
            changeSetManager.updateStatus(changeSetId, 'applied');
        }

        return {
            applied: !dryRun,
            filesModified,
            testsPassed: testResults.failed === 0,
            sandboxExitCode: sandboxResult.exitCode,
        };
    }
}
