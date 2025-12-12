import { z } from 'zod';

// =============================================================================
// AST Node Types
// =============================================================================

export const NodeTypeSchema = z.enum([
    'file',
    'class',
    'function',
    'method',
    'variable',
    'import',
    'export',
    'interface',
    'type',
    'enum',
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export const CKGNodeSchema = z.object({
    id: z.string(),
    type: NodeTypeSchema,
    name: z.string(),
    filePath: z.string(),
    startLine: z.number(),
    endLine: z.number(),
    signature: z.string().optional(),
    docstring: z.string().optional(),
    language: z.enum(['typescript', 'javascript', 'python']),
    metadata: z.record(z.unknown()).optional(),
});

export type CKGNode = z.infer<typeof CKGNodeSchema>;

// =============================================================================
// Edge Types
// =============================================================================

export const EdgeTypeSchema = z.enum([
    'imports',
    'exports',
    'extends',
    'implements',
    'calls',
    'references',
    'contains',
    'depends_on',
]);

export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const CKGEdgeSchema = z.object({
    id: z.string(),
    type: EdgeTypeSchema,
    sourceId: z.string(),
    targetId: z.string(),
    metadata: z.record(z.unknown()).optional(),
});

export type CKGEdge = z.infer<typeof CKGEdgeSchema>;

// =============================================================================
// Graph Types
// =============================================================================

export interface CKGraph {
    nodes: Map<string, CKGNode>;
    edges: CKGEdge[];
}

export interface FileAnalysis {
    filePath: string;
    nodes: CKGNode[];
    edges: CKGEdge[];
    imports: ImportInfo[];
    exports: ExportInfo[];
    checksum: string;
}

export interface ImportInfo {
    source: string;
    specifiers: string[];
    isDefault: boolean;
    isNamespace: boolean;
    line: number;
}

export interface ExportInfo {
    name: string;
    isDefault: boolean;
    line: number;
}

// =============================================================================
// Query Types
// =============================================================================

export const GetDependentsQuerySchema = z.object({
    filePath: z.string(),
    depth: z.number().min(1).max(10).default(3),
    direction: z.enum(['upstream', 'downstream', 'both']).default('downstream'),
});

export type GetDependentsQuery = z.infer<typeof GetDependentsQuerySchema>;

export interface DependencyResult {
    file: string;
    depth: number;
    relationship: EdgeType;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

export interface GraphStats {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
    fileCount: number;
}
