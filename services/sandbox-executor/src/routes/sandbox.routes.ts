import { Router } from 'express';

import { SandboxRunner } from '../services/runner.service.js';
import { TestExecutor } from '../services/test.service.js';
import {
    ExecutionRequestSchema,
    TestRunRequestSchema,
    DryRunRequestSchema,
} from '../types/index.js';
import type { ApiResponse, ExecutionResult, TestResult, DryRunResult } from '../types/index.js';

const router = Router();

/**
 * POST /execute
 * Execute a command in sandbox
 */
router.post('/execute', async (req, res) => {
    const result = ExecutionRequestSchema.safeParse(req.body);

    if (!result.success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: result.error.errors.map((e) => e.message).join(', '),
            },
        };
        res.status(400).json(response);
        return;
    }

    try {
        const runner = SandboxRunner.getInstance();
        const execResult = await runner.execute(result.data);

        const response: ApiResponse<ExecutionResult> = {
            success: true,
            data: execResult,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'EXECUTION_ERROR',
                message: err instanceof Error ? err.message : 'Execution failed',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /executions/:id
 * Get execution result
 */
router.get('/executions/:id', (req, res) => {
    const runner = SandboxRunner.getInstance();
    const result = runner.get(req.params.id);

    if (!result) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Execution not found' },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<ExecutionResult> = {
        success: true,
        data: result,
    };
    res.json(response);
});

/**
 * POST /test
 * Run tests
 */
router.post('/test', async (req, res) => {
    const result = TestRunRequestSchema.safeParse(req.body);

    if (!result.success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: result.error.errors.map((e) => e.message).join(', '),
            },
        };
        res.status(400).json(response);
        return;
    }

    try {
        const executor = TestExecutor.getInstance();
        const testResult = await executor.runTests(result.data);

        const response: ApiResponse<TestResult> = {
            success: true,
            data: testResult,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'TEST_ERROR',
                message: err instanceof Error ? err.message : 'Test run failed',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * POST /dry-run
 * Run dry-run pipeline
 */
router.post('/dry-run', async (req, res) => {
    const result = DryRunRequestSchema.safeParse(req.body);

    if (!result.success) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: result.error.errors.map((e) => e.message).join(', '),
            },
        };
        res.status(400).json(response);
        return;
    }

    try {
        const executor = TestExecutor.getInstance();
        const dryRunResult = await executor.runDryRun(result.data);

        const response: ApiResponse<DryRunResult> = {
            success: true,
            data: dryRunResult,
        };
        res.json(response);
    } catch (err) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'DRY_RUN_ERROR',
                message: err instanceof Error ? err.message : 'Dry-run failed',
            },
        };
        res.status(500).json(response);
    }
});

/**
 * GET /dry-run/:id
 * Get dry-run result
 */
router.get('/dry-run/:id', (req, res) => {
    const executor = TestExecutor.getInstance();
    const result = executor.getDryRunResult(req.params.id);

    if (!result) {
        const response: ApiResponse<null> = {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Dry-run not found' },
        };
        res.status(404).json(response);
        return;
    }

    const response: ApiResponse<DryRunResult> = {
        success: true,
        data: result,
    };
    res.json(response);
});

/**
 * GET /stats
 * Get sandbox stats
 */
router.get('/stats', (req, res) => {
    const runner = SandboxRunner.getInstance();
    const executor = TestExecutor.getInstance();

    const response: ApiResponse<{
        executions: ReturnType<typeof runner.getStats>;
        tests: ReturnType<typeof executor.getStats>;
    }> = {
        success: true,
        data: {
            executions: runner.getStats(),
            tests: executor.getStats(),
        },
    };
    res.json(response);
});

export default router;
