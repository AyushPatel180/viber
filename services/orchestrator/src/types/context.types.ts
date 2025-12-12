import { z } from 'zod';

// =============================================================================
// Context Stack Tiers
// =============================================================================

export const ContextTierSchema = z.enum(['constitution', 'blueprint', 'workbench']);
export type ContextTier = z.infer<typeof ContextTierSchema>;

// =============================================================================
// Constitution Tier - Immutable project rules
// =============================================================================

export const ConstitutionEntrySchema = z.object({
    id: z.string(),
    key: z.string(),
    value: z.string(),
    description: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type ConstitutionEntry = z.infer<typeof ConstitutionEntrySchema>;

// =============================================================================
// Blueprint Tier - Auto-generated architecture summary
// =============================================================================

export const BlueprintModuleSchema = z.object({
    path: z.string(),
    type: z.enum(['file', 'directory']),
    exports: z.array(z.string()).optional(),
    imports: z.array(z.string()).optional(),
    description: z.string().optional(),
    functions: z.array(z.string()).optional(),
    classes: z.array(z.string()).optional(),
});

export type BlueprintModule = z.infer<typeof BlueprintModuleSchema>;

export const BlueprintSchema = z.object({
    projectRoot: z.string(),
    modules: z.array(BlueprintModuleSchema),
    folderMap: z.record(z.array(z.string())),
    generatedAt: z.string().datetime(),
    checksum: z.string(),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;

// =============================================================================
// Workbench Tier - Ephemeral session-scoped staging
// =============================================================================

export const WorkbenchFileSchema = z.object({
    path: z.string(),
    content: z.string(),
    originalContent: z.string().optional(),
    staged: z.boolean(),
    modified: z.boolean(),
    addedAt: z.string().datetime(),
    ttlSeconds: z.number().optional(),
});

export type WorkbenchFile = z.infer<typeof WorkbenchFileSchema>;

export const WorkbenchSessionSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    files: z.array(WorkbenchFileSchema),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    metadata: z.record(z.unknown()).optional(),
});

export type WorkbenchSession = z.infer<typeof WorkbenchSessionSchema>;

// =============================================================================
// Context Stack - Combined state
// =============================================================================

export interface ContextStack {
    constitution: ConstitutionEntry[];
    blueprint: Blueprint | null;
    workbench: WorkbenchSession | null;
}

export interface ContextQuery {
    focusedFiles?: string[];
    includeTiers?: ContextTier[];
    sessionId?: string;
}

export interface ContextResult {
    constitution: ConstitutionEntry[];
    blueprintModules: BlueprintModule[];
    workbenchFiles: WorkbenchFile[];
    tokenCount: number;
}
