import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

import { config, getDefaultTimeout } from '../config/index.js';
import type {
    ExecutionRequest,
    ExecutionResult,
    SandboxStatus,
} from '../types/index.js';

/**
 * SandboxRunner executes commands in isolated environments.
 * Uses mock mode for development, Docker/Firecracker for production.
 */
export class SandboxRunner {
    private static instance: SandboxRunner;
    private executions: Map<string, ExecutionResult>;
    private runningCount: number;

    private constructor() {
        this.executions = new Map();
        this.runningCount = 0;
    }

    static getInstance(): SandboxRunner {
        if (!SandboxRunner.instance) {
            SandboxRunner.instance = new SandboxRunner();
        }
        return SandboxRunner.instance;
    }

    /**
     * Execute a command in sandbox
     */
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
        const id = request.id ?? uuidv4();
        const timeout = request.timeout ?? getDefaultTimeout();

        const result: ExecutionResult = {
            id,
            sessionId: request.sessionId,
            command: request.command,
            status: 'pending',
            exitCode: null,
            stdout: '',
            stderr: '',
            startedAt: new Date().toISOString(),
            completedAt: null,
            durationMs: null,
            timedOut: false,
        };

        this.executions.set(id, result);

        // Check if mock mode or real execution
        if (config.SANDBOX_MODE === 'mock') {
            return this.mockExecute(result, timeout);
        }

        return this.realExecute(result, request, timeout);
    }

    /**
     * Mock execution for development
     */
    private async mockExecute(
        result: ExecutionResult,
        timeout: number
    ): Promise<ExecutionResult> {
        result.status = 'running';
        this.runningCount++;

        // Simulate execution delay
        const delay = Math.min(100 + Math.random() * 200, timeout);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Mock output based on command
        const command = result.command.toLowerCase();

        if (command.includes('test') || command.includes('vitest') || command.includes('jest')) {
            result.stdout = `
 ✓ src/services/audit.store.test.ts (5 tests) 45ms
 ✓ src/routes/audit.routes.test.ts (8 tests) 67ms

 Test Files  2 passed (2)
      Tests  13 passed (13)
   Start at  ${new Date().toISOString()}
  Duration  ${delay}ms
`;
            result.exitCode = 0;
        } else if (command.includes('build') || command.includes('tsc')) {
            result.stdout = `Successfully compiled 42 files.\n`;
            result.exitCode = 0;
        } else if (command.includes('lint') || command.includes('eslint')) {
            result.stdout = `✔ 0 errors, 10 warnings\n`;
            result.exitCode = 0;
        } else if (command.includes('npm install')) {
            result.stdout = `added 234 packages in 2s\n`;
            result.exitCode = 0;
        } else if (command.includes('echo')) {
            result.stdout = result.command.replace(/^echo\s+/i, '') + '\n';
            result.exitCode = 0;
        } else {
            result.stdout = `Mock execution of: ${result.command}\n`;
            result.exitCode = 0;
        }

        result.status = 'completed';
        result.completedAt = new Date().toISOString();
        result.durationMs = delay;
        this.runningCount--;

        return result;
    }

    /**
     * Real execution using child_process (would use Docker in production)
     */
    private async realExecute(
        result: ExecutionResult,
        request: ExecutionRequest,
        timeout: number
    ): Promise<ExecutionResult> {
        result.status = 'running';
        this.runningCount++;
        const startTime = Date.now();

        return new Promise((resolve) => {
            const args = request.command.split(' ');
            const cmd = args.shift() ?? '';

            const child = spawn(cmd, args, {
                cwd: request.workdir,
                env: { ...process.env, ...request.env },
                shell: true,
            });

            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const timer = setTimeout(() => {
                timedOut = true;
                child.kill('SIGTERM');
            }, timeout);

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                clearTimeout(timer);

                result.stdout = stdout;
                result.stderr = stderr;
                result.exitCode = code;
                result.timedOut = timedOut;
                result.status = timedOut ? 'timeout' : (code === 0 ? 'completed' : 'failed');
                result.completedAt = new Date().toISOString();
                result.durationMs = Date.now() - startTime;

                this.runningCount--;
                resolve(result);
            });

            child.on('error', (err) => {
                clearTimeout(timer);

                result.stderr = err.message;
                result.exitCode = 1;
                result.status = 'failed';
                result.completedAt = new Date().toISOString();
                result.durationMs = Date.now() - startTime;

                this.runningCount--;
                resolve(result);
            });
        });
    }

    /**
     * Get execution by ID
     */
    get(id: string): ExecutionResult | null {
        return this.executions.get(id) ?? null;
    }

    /**
     * List executions for a session
     */
    listBySession(sessionId: string): ExecutionResult[] {
        return Array.from(this.executions.values()).filter(
            (e) => e.sessionId === sessionId
        );
    }

    /**
     * Get stats
     */
    getStats(): {
        total: number;
        running: number;
        completed: number;
        failed: number;
    } {
        let completed = 0;
        let failed = 0;

        for (const e of this.executions.values()) {
            if (e.status === 'completed') {
                completed++;
            } else if (e.status === 'failed' || e.status === 'timeout') {
                failed++;
            }
        }

        return {
            total: this.executions.size,
            running: this.runningCount,
            completed,
            failed,
        };
    }
}
