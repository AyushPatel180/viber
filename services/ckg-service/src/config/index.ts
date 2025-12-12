import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Neo4j
    NEO4J_URI: z.string().default('bolt://localhost:7687'),
    NEO4J_USER: z.string().default('neo4j'),
    NEO4J_PASSWORD: z.string().default('password'),
    NEO4J_DATABASE: z.string().default('neo4j'),

    // Parser settings
    MAX_FILE_SIZE_KB: z.string().default('1024'), // 1MB max
    SUPPORTED_EXTENSIONS: z.string().default('.ts,.tsx,.js,.jsx,.py'),
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

export function getSupportedExtensions(): string[] {
    return config.SUPPORTED_EXTENSIONS.split(',');
}
