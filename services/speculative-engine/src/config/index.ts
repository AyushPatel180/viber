import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3003'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Orchestrator URL (for context assembly)
    ORCHESTRATOR_URL: z.string().default('http://localhost:3000'),

    // Local Model Settings
    LOCAL_MODEL_NAME: z.string().default('llama-3-8b'),
    LOCAL_MODEL_PATH: z.string().optional(),
    MAX_CONTEXT_TOKENS: z.string().default('4096'),
    MAX_RESPONSE_TOKENS: z.string().default('1024'),

    // Oracle fallback
    ORACLE_URL: z.string().default('http://localhost:3004'),
    USE_ORACLE_FALLBACK: z.string().default('false'),
});

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        // eslint-disable-next-line no-console
        console.error('❌ Invalid environment configuration:');
        // eslint-disable-next-line no-console
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
}

export const config = loadConfig();

export function isDevelopment(): boolean {
    return config.NODE_ENV === 'development';
}
