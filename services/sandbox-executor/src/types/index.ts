import { z } from 'zod';

// =============================================================================
// Sandbox Execution Types
// =============================================================================

export const SandboxStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'timeout',
  'cancelled',
]);

export type SandboxStatus = z.infer<typeof SandboxStatusSchema>;

export const ExecutionRequestSchema = z.object({
  id: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  command: z.string(),
  workdir: z.string().optional(),
  env: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(300000).default(30000),
  stdin: z.string().optional(),
});

export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

export interface ExecutionResult {
  id: string;
  sessionId: string;
  command: string;
  status: SandboxStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  timedOut: boolean;
}

// =============================================================================
// Test Runner Types
// =============================================================================

export const TestRunRequestSchema = z.object({
  sessionId: z.string().uuid(),
  projectPath: z.string(),
  testPattern: z.string().optional(),
  coverage: z.boolean().default(false),
  timeout: z.number().min(5000).max(600000).default(60000),
});

export type TestRunRequest = z.infer<typeof TestRunRequestSchema>;

export interface TestResult {
  id: string;
  sessionId: string;
  projectPath: string;
  status: SandboxStatus;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  coverage: number | null;
  duration: number;
  failedTests: FailedTest[];
  stdout: string;
  stderr: string;
}

export interface FailedTest {
  name: string;
  file: string;
  error: string;
  expected?: string;
  actual?: string;
}

// =============================================================================
// Dry-Run Pipeline Types
// =============================================================================

export const DryRunRequestSchema = z.object({
  sessionId: z.string().uuid(),
  changeSetId: z.string().uuid(),
  projectPath: z.string(),
  runTests: z.boolean().default(true),
  runBuild: z.boolean().default(true),
  runLint: z.boolean().default(false),
});

export type DryRunRequest = z.infer<typeof DryRunRequestSchema>;

export interface DryRunResult {
  id: string;
  sessionId: string;
  changeSetId: string;
  status: SandboxStatus;
  steps: DryRunStep[];
  overallSuccess: boolean;
  duration: number;
}

export interface DryRunStep {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  exitCode: number | null;
  output: string;
  duration: number | null;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
