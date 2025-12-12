import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { config, isVaultMocked } from '../config/index.js';
import type { ServiceAccount, CreateServiceAccountInput, Role, RolePermissions } from '../types/index.js';
import { RolePermissions as Permissions } from '../types/index.js';

// In-memory storage for development/mock mode
const serviceAccounts = new Map<string, ServiceAccount>();
const secretsCache = new Map<string, string>();

/**
 * VaultService provides secret management capabilities.
 * Uses mock implementation when VAULT_MOCK=true, otherwise connects to HashiCorp Vault.
 */
export class VaultService {
    private static instance: VaultService;

    private constructor() {
        // Initialize mock data in development
        if (isVaultMocked()) {
            this.initMockData();
        }
    }

    static getInstance(): VaultService {
        if (!VaultService.instance) {
            VaultService.instance = new VaultService();
        }
        return VaultService.instance;
    }

    private initMockData(): void {
        // Create default admin service account
        const adminAccount: ServiceAccount = {
            id: uuidv4(),
            name: 'admin-default',
            description: 'Default admin service account',
            roles: ['admin'],
            createdAt: new Date().toISOString(),
            createdBy: 'system',
            enabled: true,
        };
        serviceAccounts.set(adminAccount.id, adminAccount);
    }

    /**
     * Retrieve a secret from Vault
     */
    async getSecret(path: string): Promise<string | null> {
        if (isVaultMocked()) {
            return secretsCache.get(path) ?? null;
        }

        // Real Vault implementation would go here
        // const vault = require('node-vault')({ endpoint: config.VAULT_ADDR, token: config.VAULT_TOKEN });
        // const result = await vault.read(path);
        // return result.data.value;
        throw new Error('Real Vault integration not yet implemented');
    }

    /**
     * Store a secret in Vault
     */
    async setSecret(path: string, value: string): Promise<void> {
        if (isVaultMocked()) {
            secretsCache.set(path, value);
            return;
        }

        throw new Error('Real Vault integration not yet implemented');
    }
}

/**
 * RBACService handles role-based access control operations.
 */
export class RBACService {
    private static instance: RBACService;

    private constructor() { }

    static getInstance(): RBACService {
        if (!RBACService.instance) {
            RBACService.instance = new RBACService();
        }
        return RBACService.instance;
    }

    /**
     * Get all available roles
     */
    getRoles(): { name: Role; permissions: string[] }[] {
        return (Object.keys(Permissions) as Role[]).map((role) => ({
            name: role,
            permissions: Permissions[role],
        }));
    }

    /**
     * Check if a role has a specific permission
     */
    hasPermission(role: Role, permission: string): boolean {
        return Permissions[role]?.includes(permission) ?? false;
    }

    /**
     * Check if any of the given roles has a specific permission
     */
    anyRoleHasPermission(roles: Role[], permission: string): boolean {
        return roles.some((role) => this.hasPermission(role, permission));
    }

    /**
     * Get all permissions for a set of roles (deduplicated)
     */
    getPermissionsForRoles(roles: Role[]): string[] {
        const permissions = new Set<string>();
        roles.forEach((role) => {
            Permissions[role]?.forEach((p) => permissions.add(p));
        });
        return Array.from(permissions);
    }
}

/**
 * ServiceAccountService manages service accounts for agents and services.
 */
export class ServiceAccountService {
    private static instance: ServiceAccountService;

    private constructor() { }

    static getInstance(): ServiceAccountService {
        if (!ServiceAccountService.instance) {
            ServiceAccountService.instance = new ServiceAccountService();
        }
        return ServiceAccountService.instance;
    }

    /**
     * List all service accounts
     */
    list(page = 1, pageSize = 20): { accounts: ServiceAccount[]; total: number } {
        const accounts = Array.from(serviceAccounts.values());
        const start = (page - 1) * pageSize;
        const end = start + pageSize;

        return {
            accounts: accounts.slice(start, end),
            total: accounts.length,
        };
    }

    /**
     * Get a service account by ID
     */
    getById(id: string): ServiceAccount | null {
        return serviceAccounts.get(id) ?? null;
    }

    /**
     * Create a new service account
     */
    create(input: CreateServiceAccountInput, createdBy: string): ServiceAccount {
        const account: ServiceAccount = {
            id: uuidv4(),
            name: input.name,
            description: input.description,
            roles: input.roles,
            createdAt: new Date().toISOString(),
            createdBy,
            expiresAt: input.expiresAt,
            enabled: true,
        };

        serviceAccounts.set(account.id, account);
        return account;
    }

    /**
     * Disable a service account
     */
    disable(id: string): boolean {
        const account = serviceAccounts.get(id);
        if (!account) {
            return false;
        }

        account.enabled = false;
        serviceAccounts.set(id, account);
        return true;
    }

    /**
     * Enable a service account
     */
    enable(id: string): boolean {
        const account = serviceAccounts.get(id);
        if (!account) {
            return false;
        }

        account.enabled = true;
        serviceAccounts.set(id, account);
        return true;
    }

    /**
     * Delete a service account
     */
    delete(id: string): boolean {
        return serviceAccounts.delete(id);
    }
}
