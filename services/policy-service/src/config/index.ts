import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3006'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Vault
    VAULT_ADDR: z.string().default('http://localhost:8200'),
    VAULT_TOKEN: z.string().optional(),
    VAULT_MOCK: z.string().default('true'),

    // Keycloak / OIDC
    KEYCLOAK_URL: z.string().default('http://localhost:8080'),
    KEYCLOAK_REALM: z.string().default('viber'),
    KEYCLOAK_CLIENT_ID: z.string().default('viber-api'),
    KEYCLOAK_CLIENT_SECRET: z.string().optional(),

    // Token signing
    TOKEN_SIGNING_KEY: z.string().default('dev-signing-key-change-in-production'),
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

export function isVaultMocked(): boolean {
    return config.VAULT_MOCK === 'true';
}

export function isDevelopment(): boolean {
    return config.NODE_ENV === 'development';
}

export function isProduction(): boolean {
    return config.NODE_ENV === 'production';
}
