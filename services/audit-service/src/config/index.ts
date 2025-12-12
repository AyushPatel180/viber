import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3007'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Audit Store
    AUDIT_STORE_TYPE: z.enum(['local', 's3']).default('local'),
    AUDIT_STORE_PATH: z.string().default('./audit-logs'),
    AUDIT_SIGNING_KEY: z.string().default('dev-signing-key-change-in-production'),

    // AWS S3 (optional)
    AWS_REGION: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
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

export function isLocalStore(): boolean {
    return config.AUDIT_STORE_TYPE === 'local';
}

export function isDevelopment(): boolean {
    return config.NODE_ENV === 'development';
}

export function isProduction(): boolean {
    return config.NODE_ENV === 'production';
}
