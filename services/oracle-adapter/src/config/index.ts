import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3005'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Oracle Settings
    DEFAULT_PROVIDER: z.enum(['openai', 'anthropic', 'google', 'azure', 'mock']).default('mock'),
    DEFAULT_MODEL: z.string().default('mock-model'),

    // API Keys (optional in mock mode)
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_AI_API_KEY: z.string().optional(),
    AZURE_OPENAI_KEY: z.string().optional(),
    AZURE_OPENAI_ENDPOINT: z.string().optional(),

    // Cost Controls
    MAX_COST_PER_REQUEST: z.string().default('1.00'),
    MAX_COST_PER_HOUR: z.string().default('10.00'),
    ENABLE_COST_TRACKING: z.string().default('true'),

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

export function getMaxCostPerRequest(): number {
    return parseFloat(config.MAX_COST_PER_REQUEST);
}

export function getMaxCostPerHour(): number {
    return parseFloat(config.MAX_COST_PER_HOUR);
}
