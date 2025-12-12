import * as fs from 'fs/promises';
import * as path from 'path';

import { config, getSupportedExtensions } from '../config/index.js';
import { TypeScriptParser } from '../parsers/typescript.parser.js';
import type {
    CKGNode,
    CKGEdge,
    CKGraph,
    FileAnalysis,
    DependencyResult,
    GraphStats,
} from '../types/index.js';

/**
 * CKGService manages the Code Knowledge Graph.
 * Handles file parsing, graph building, and dependency queries.
 */
export class CKGService {
    private static instance: CKGService;
    private graph: CKGraph;
    private fileChecksums: Map<string, string>;
    private tsParser: TypeScriptParser;

    private constructor() {
        this.graph = {
            nodes: new Map(),
            edges: [],
        };
        this.fileChecksums = new Map();
        this.tsParser = TypeScriptParser.getInstance();
    }

    static getInstance(): CKGService {
        if (!CKGService.instance) {
            CKGService.instance = new CKGService();
        }
        return CKGService.instance;
    }

    /**
     * Index a directory recursively, parsing all supported files
     */
    async indexDirectory(dirPath: string): Promise<{ filesIndexed: number; nodesCreated: number; edgesCreated: number }> {
        const supportedExtensions = getSupportedExtensions();
        let filesIndexed = 0;
        let nodesCreated = 0;
        let edgesCreated = 0;

        const processDir = async (currentPath: string): Promise<void> => {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                // Skip node_modules and hidden directories
                if (entry.isDirectory()) {
                    if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
                        await processDir(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (supportedExtensions.includes(ext)) {
                        const result = await this.indexFile(fullPath);
                        if (result.updated) {
                            filesIndexed++;
                            nodesCreated += result.nodesCreated;
                            edgesCreated += result.edgesCreated;
                        }
                    }
                }
            }
        };

        await processDir(dirPath);
        return { filesIndexed, nodesCreated, edgesCreated };
    }

    /**
     * Index a single file and update the graph
     */
    async indexFile(filePath: string): Promise<{ updated: boolean; nodesCreated: number; edgesCreated: number }> {
        try {
            const analysis = await this.tsParser.parseFile(filePath);

            // Check if file has changed
            const existingChecksum = this.fileChecksums.get(filePath);
            if (existingChecksum === analysis.checksum) {
                return { updated: false, nodesCreated: 0, edgesCreated: 0 };
            }

            // Remove old nodes and edges for this file
            this.removeFileFromGraph(filePath);

            // Add new nodes
            for (const node of analysis.nodes) {
                this.graph.nodes.set(node.id, node);
            }

            // Add new edges
            this.graph.edges.push(...analysis.edges);

            // Link imports to their target files
            this.linkImports(analysis);

            // Update checksum
            this.fileChecksums.set(filePath, analysis.checksum);

            return {
                updated: true,
                nodesCreated: analysis.nodes.length,
                edgesCreated: analysis.edges.length,
            };
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`Failed to parse file: ${filePath}`, err);
            return { updated: false, nodesCreated: 0, edgesCreated: 0 };
        }
    }

    /**
     * Remove all nodes and edges associated with a file
     */
    private removeFileFromGraph(filePath: string): void {
        // Get all node IDs for this file
        const nodeIdsToRemove = new Set<string>();
        for (const [id, node] of this.graph.nodes) {
            if (node.filePath === filePath) {
                nodeIdsToRemove.add(id);
            }
        }

        // Remove nodes
        for (const id of nodeIdsToRemove) {
            this.graph.nodes.delete(id);
        }

        // Remove edges that reference removed nodes
        this.graph.edges = this.graph.edges.filter(
            (edge) => !nodeIdsToRemove.has(edge.sourceId) && !nodeIdsToRemove.has(edge.targetId)
        );
    }

    /**
     * Link import nodes to their target file nodes
     */
    private linkImports(analysis: FileAnalysis): void {
        for (const importInfo of analysis.imports) {
            // Resolve import path relative to file
            const importSource = importInfo.source;
            if (importSource.startsWith('.')) {
                // Relative import - try to resolve to a file
                const baseDir = path.dirname(analysis.filePath);
                const possiblePaths = [
                    path.join(baseDir, `${importSource}.ts`),
                    path.join(baseDir, `${importSource}.tsx`),
                    path.join(baseDir, `${importSource}/index.ts`),
                    path.join(baseDir, `${importSource}/index.tsx`),
                    path.join(baseDir, importSource),
                ];

                for (const possiblePath of possiblePaths) {
                    const fileNode = this.findFileNode(possiblePath);
                    if (fileNode) {
                        // Create depends_on edge from current file to imported file
                        const currentFileNode = this.findFileNode(analysis.filePath);
                        if (currentFileNode) {
                            this.graph.edges.push({
                                id: `dep_${currentFileNode.id}_${fileNode.id}`,
                                type: 'depends_on',
                                sourceId: currentFileNode.id,
                                targetId: fileNode.id,
                            });
                        }
                        break;
                    }
                }
            }
        }
    }

    /**
     * Find the file node for a given path
     */
    private findFileNode(filePath: string): CKGNode | undefined {
        for (const node of this.graph.nodes.values()) {
            if (node.type === 'file' && node.filePath === filePath) {
                return node;
            }
        }
        return undefined;
    }

    /**
     * Get dependents of a file (files that depend on it)
     */
    getDependents(filePath: string, depth: number = 3): DependencyResult[] {
        const fileNode = this.findFileNode(filePath);
        if (!fileNode) {
            return [];
        }

        const results: DependencyResult[] = [];
        const visited = new Set<string>();

        const traverse = (nodeId: string, currentDepth: number): void => {
            if (currentDepth > depth || visited.has(nodeId)) {
                return;
            }
            visited.add(nodeId);

            // Find edges where this node is the target (files that depend on it)
            for (const edge of this.graph.edges) {
                if (edge.targetId === nodeId && edge.type === 'depends_on') {
                    const sourceNode = this.graph.nodes.get(edge.sourceId);
                    if (sourceNode && sourceNode.type === 'file') {
                        results.push({
                            file: sourceNode.filePath,
                            depth: currentDepth,
                            relationship: edge.type,
                        });
                        traverse(edge.sourceId, currentDepth + 1);
                    }
                }
            }
        };

        traverse(fileNode.id, 1);
        return results;
    }

    /**
     * Get dependencies of a file (files it depends on)
     */
    getDependencies(filePath: string, depth: number = 3): DependencyResult[] {
        const fileNode = this.findFileNode(filePath);
        if (!fileNode) {
            return [];
        }

        const results: DependencyResult[] = [];
        const visited = new Set<string>();

        const traverse = (nodeId: string, currentDepth: number): void => {
            if (currentDepth > depth || visited.has(nodeId)) {
                return;
            }
            visited.add(nodeId);

            // Find edges where this node is the source (files it depends on)
            for (const edge of this.graph.edges) {
                if (edge.sourceId === nodeId && edge.type === 'depends_on') {
                    const targetNode = this.graph.nodes.get(edge.targetId);
                    if (targetNode && targetNode.type === 'file') {
                        results.push({
                            file: targetNode.filePath,
                            depth: currentDepth,
                            relationship: edge.type,
                        });
                        traverse(edge.targetId, currentDepth + 1);
                    }
                }
            }
        };

        traverse(fileNode.id, 1);
        return results;
    }

    /**
     * Get a node by ID
     */
    getNode(id: string): CKGNode | undefined {
        return this.graph.nodes.get(id);
    }

    /**
     * Get all nodes for a file
     */
    getNodesForFile(filePath: string): CKGNode[] {
        const nodes: CKGNode[] = [];
        for (const node of this.graph.nodes.values()) {
            if (node.filePath === filePath) {
                nodes.push(node);
            }
        }
        return nodes;
    }

    /**
     * Search nodes by name (partial match)
     */
    searchNodes(query: string, limit: number = 20): CKGNode[] {
        const results: CKGNode[] = [];
        const lowerQuery = query.toLowerCase();

        for (const node of this.graph.nodes.values()) {
            if (node.name.toLowerCase().includes(lowerQuery)) {
                results.push(node);
                if (results.length >= limit) {
                    break;
                }
            }
        }

        return results;
    }

    /**
     * Get graph statistics
     */
    getStats(): GraphStats {
        const nodesByType: Record<string, number> = {};
        const edgesByType: Record<string, number> = {};
        const files = new Set<string>();

        for (const node of this.graph.nodes.values()) {
            nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
            files.add(node.filePath);
        }

        for (const edge of this.graph.edges) {
            edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1;
        }

        return {
            totalNodes: this.graph.nodes.size,
            totalEdges: this.graph.edges.length,
            nodesByType,
            edgesByType,
            fileCount: files.size,
        };
    }

    /**
     * Clear the entire graph
     */
    clear(): void {
        this.graph.nodes.clear();
        this.graph.edges = [];
        this.fileChecksums.clear();
    }
}
