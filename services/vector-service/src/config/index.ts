import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3002'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Vector Store
    VECTOR_STORE_TYPE: z.enum(['memory', 'milvus']).default('memory'),
    MILVUS_HOST: z.string().default('localhost'),
    MILVUS_PORT: z.string().default('19530'),

    // Embedding
    EMBEDDING_TYPE: z.enum(['mock', 'openai']).default('mock'),
    EMBEDDING_DIMENSIONS: z.string().default('384'),
    OPENAI_API_KEY: z.string().optional(),

    // Chunking
    CHUNK_MAX_SIZE: z.string().default('512'),
    CHUNK_OVERLAP: z.string().default('64'),
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

export function getEmbeddingDimensions(): number {
    return parseInt(config.EMBEDDING_DIMENSIONS);
}
