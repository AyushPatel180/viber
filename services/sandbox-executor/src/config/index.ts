import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3004'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Sandbox Settings
  SANDBOX_MODE: z.enum(['mock', 'docker', 'firecracker']).default('mock'),
  MAX_CONCURRENT_EXECUTIONS: z.string().default('5'),
  DEFAULT_TIMEOUT_MS: z.string().default('30000'),
  MAX_OUTPUT_SIZE_BYTES: z.string().default('1048576'),

  // Service URLs
  SPECULATIVE_ENGINE_URL: z.string().default('http://localhost:3003'),
  AUDIT_SERVICE_URL: z.string().default('http://localhost:3007'),
});

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

export function isDevelopment(): boolean {
  return config.NODE_ENV === 'development';
}

export function getMaxConcurrent(): number {
  return parseInt(config.MAX_CONCURRENT_EXECUTIONS);
}

export function getDefaultTimeout(): number {
  return parseInt(config.DEFAULT_TIMEOUT_MS);
}
