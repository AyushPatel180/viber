import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import type {
    ConstitutionEntry,
    Blueprint,
    BlueprintModule,
    WorkbenchSession,
    WorkbenchFile,
    ContextStack,
    ContextQuery,
    ContextResult,
} from '../types/context.types.js';

/**
 * ContextStackService manages the three-tier context memory system.
 * - Constitution: Immutable project rules (persisted)
 * - Blueprint: Auto-generated architecture summary (persisted)
 * - Workbench: Ephemeral session-scoped staging (expires)
 */
export class ContextStackService {
    private static instance: ContextStackService;

    // In-memory storage (in production, use Redis/DB)
    private constitution: Map<string, ConstitutionEntry>;
    private blueprint: Blueprint | null;
    private workbenches: Map<string, WorkbenchSession>;

    // Session timeout (default 30 minutes)
    private sessionTimeoutMs = 30 * 60 * 1000;

    private constructor() {
        this.constitution = new Map();
        this.blueprint = null;
        this.workbenches = new Map();

        // Initialize default constitution entries
        this.initDefaultConstitution();

        // Start session cleanup interval
        setInterval(() => this.cleanupExpiredSessions(), 60000);
    }

    static getInstance(): ContextStackService {
        if (!ContextStackService.instance) {
            ContextStackService.instance = new ContextStackService();
        }
        return ContextStackService.instance;
    }

    /**
     * Initialize default constitution entries
     */
    private initDefaultConstitution(): void {
        const defaults: Omit<ConstitutionEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
            { key: 'safety.defaultDeny', value: 'true', description: 'Deny all actions by default' },
            { key: 'safety.sandboxFirst', value: 'true', description: 'Run all code in sandbox' },
            { key: 'safety.auditAll', value: 'true', description: 'Log all actions to audit trail' },
            { key: 'approval.requiredForProd', value: 'true', description: 'Require approval for production' },
            { key: 'approval.mfaForAdmin', value: 'true', description: 'MFA required for admin operations' },
        ];

        const now = new Date().toISOString();
        for (const entry of defaults) {
            const id = uuidv4();
            this.constitution.set(entry.key, {
                ...entry,
                id,
                createdAt: now,
                updatedAt: now,
            });
        }
    }

    // ==========================================================================
    // Constitution Tier
    // ==========================================================================

    getConstitution(): ConstitutionEntry[] {
        return Array.from(this.constitution.values());
    }

    getConstitutionEntry(key: string): ConstitutionEntry | null {
        return this.constitution.get(key) ?? null;
    }

    setConstitutionEntry(key: string, value: string, description?: string): ConstitutionEntry {
        const existing = this.constitution.get(key);
        const now = new Date().toISOString();

        const entry: ConstitutionEntry = {
            id: existing?.id ?? uuidv4(),
            key,
            value,
            description: description ?? existing?.description,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };

        this.constitution.set(key, entry);
        return entry;
    }

    // ==========================================================================
    // Blueprint Tier
    // ==========================================================================

    getBlueprint(): Blueprint | null {
        return this.blueprint;
    }

    async generateBlueprint(projectRoot: string): Promise<Blueprint> {
        const modules: BlueprintModule[] = [];
        const folderMap: Record<string, string[]> = {};

        // Scan project structure
        await this.scanDirectory(projectRoot, modules, folderMap, '');

        const blueprint: Blueprint = {
            projectRoot,
            modules,
            folderMap,
            generatedAt: new Date().toISOString(),
            checksum: crypto.createHash('sha256').update(JSON.stringify(modules)).digest('hex'),
        };

        this.blueprint = blueprint;
        return blueprint;
    }

    private async scanDirectory(
        basePath: string,
        modules: BlueprintModule[],
        folderMap: Record<string, string[]>,
        relativePath: string
    ): Promise<void> {
        const fullPath = path.join(basePath, relativePath);

        try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const files: string[] = [];

            for (const entry of entries) {
                const entryRelPath = path.join(relativePath, entry.name);

                if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
                    continue;
                }

                if (entry.isDirectory()) {
                    await this.scanDirectory(basePath, modules, folderMap, entryRelPath);
                    modules.push({
                        path: entryRelPath,
                        type: 'directory',
                    });
                } else if (entry.isFile() && this.isSupportedFile(entry.name)) {
                    files.push(entry.name);
                    modules.push({
                        path: entryRelPath,
                        type: 'file',
                    });
                }
            }

            if (files.length > 0) {
                folderMap[relativePath || '/'] = files;
            }
        } catch {
            // Directory not readable
        }
    }

    private isSupportedFile(filename: string): boolean {
        const ext = path.extname(filename);
        return ['.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.md'].includes(ext);
    }

    getBlueprintModulesForPaths(paths: string[]): BlueprintModule[] {
        if (!this.blueprint) {
            return [];
        }

        const result: BlueprintModule[] = [];
        const pathSet = new Set(paths);

        for (const module of this.blueprint.modules) {
            // Include if path matches or is parent of any focused path
            for (const focusPath of pathSet) {
                if (focusPath.includes(module.path) || module.path.includes(focusPath)) {
                    result.push(module);
                    break;
                }
            }
        }

        return result;
    }

    // ==========================================================================
    // Workbench Tier
    // ==========================================================================

    createWorkbenchSession(userId: string): WorkbenchSession {
        const now = new Date();
        const session: WorkbenchSession = {
            id: uuidv4(),
            userId,
            files: [],
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + this.sessionTimeoutMs).toISOString(),
        };

        this.workbenches.set(session.id, session);
        return session;
    }

    getWorkbenchSession(sessionId: string): WorkbenchSession | null {
        const session = this.workbenches.get(sessionId);
        if (!session) {
            return null;
        }

        // Check if expired
        if (new Date(session.expiresAt) < new Date()) {
            this.workbenches.delete(sessionId);
            return null;
        }

        return session;
    }

    addFileToWorkbench(sessionId: string, file: Omit<WorkbenchFile, 'addedAt'>): WorkbenchFile | null {
        const session = this.getWorkbenchSession(sessionId);
        if (!session) {
            return null;
        }

        const workbenchFile: WorkbenchFile = {
            ...file,
            addedAt: new Date().toISOString(),
        };

        // Replace if exists, otherwise add
        const existingIndex = session.files.findIndex((f) => f.path === file.path);
        if (existingIndex >= 0) {
            session.files[existingIndex] = workbenchFile;
        } else {
            session.files.push(workbenchFile);
        }

        // Extend session expiry
        session.expiresAt = new Date(Date.now() + this.sessionTimeoutMs).toISOString();

        return workbenchFile;
    }

    removeFileFromWorkbench(sessionId: string, filePath: string): boolean {
        const session = this.getWorkbenchSession(sessionId);
        if (!session) {
            return false;
        }

        const index = session.files.findIndex((f) => f.path === filePath);
        if (index >= 0) {
            session.files.splice(index, 1);
            return true;
        }
        return false;
    }

    private cleanupExpiredSessions(): void {
        const now = new Date();
        for (const [id, session] of this.workbenches) {
            if (new Date(session.expiresAt) < now) {
                this.workbenches.delete(id);
            }
        }
    }

    // ==========================================================================
    // Context Assembly
    // ==========================================================================

    /**
     * Assemble context for a query based on focused files and tiers
     */
    assembleContext(query: ContextQuery): ContextResult {
        const result: ContextResult = {
            constitution: [],
            blueprintModules: [],
            workbenchFiles: [],
            tokenCount: 0,
        };

        const tiers = query.includeTiers ?? ['constitution', 'blueprint', 'workbench'];

        // Always include constitution
        if (tiers.includes('constitution')) {
            result.constitution = this.getConstitution();
        }

        // Include blueprint modules for focused paths
        if (tiers.includes('blueprint') && query.focusedFiles?.length) {
            result.blueprintModules = this.getBlueprintModulesForPaths(query.focusedFiles);
        }

        // Include workbench files from session
        if (tiers.includes('workbench') && query.sessionId) {
            const session = this.getWorkbenchSession(query.sessionId);
            if (session) {
                result.workbenchFiles = session.files;
            }
        }

        // Estimate token count (rough: 4 chars per token)
        const constitutionTokens = JSON.stringify(result.constitution).length / 4;
        const blueprintTokens = JSON.stringify(result.blueprintModules).length / 4;
        const workbenchTokens = result.workbenchFiles.reduce((sum, f) => sum + f.content.length / 4, 0);
        result.tokenCount = Math.ceil(constitutionTokens + blueprintTokens + workbenchTokens);

        return result;
    }

    // ==========================================================================
    // Stats
    // ==========================================================================

    getStats(): {
        constitutionEntries: number;
        blueprintModules: number;
        activeSessions: number;
        workbenchFiles: number;
    } {
        let workbenchFiles = 0;
        for (const session of this.workbenches.values()) {
            workbenchFiles += session.files.length;
        }

        return {
            constitutionEntries: this.constitution.size,
            blueprintModules: this.blueprint?.modules.length ?? 0,
            activeSessions: this.workbenches.size,
            workbenchFiles,
        };
    }
}
