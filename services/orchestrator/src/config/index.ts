import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Service URLs
    CKG_SERVICE_URL: z.string().default('http://localhost:3001'),
    VECTOR_SERVICE_URL: z.string().default('http://localhost:3002'),
    POLICY_SERVICE_URL: z.string().default('http://localhost:3006'),
    AUDIT_SERVICE_URL: z.string().default('http://localhost:3007'),

    // GVR Settings
    GVR_SEMANTIC_WEIGHT: z.string().default('0.6'),
    GVR_GRAPH_WEIGHT: z.string().default('0.3'),
    GVR_FOCUS_WEIGHT: z.string().default('0.1'),
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

export function getGVRWeights(): { semantic: number; graph: number; focus: number } {
    return {
        semantic: parseFloat(config.GVR_SEMANTIC_WEIGHT),
        graph: parseFloat(config.GVR_GRAPH_WEIGHT),
        focus: parseFloat(config.GVR_FOCUS_WEIGHT),
    };
}
