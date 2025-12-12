import axios from 'axios';

import { config, getGVRWeights } from '../config/index.js';
import type {
    GVRQuery,
    GVRResult,
    GVRResponse,
    GraphContext,
    CKGNode,
    VectorSearchResult,
    DependencyResult,
} from '../types/index.js';

/**
 * GVRService implements Graph-Vector Retrieval.
 * Combines semantic vector search with graph-based dependency analysis.
 */
export class GVRService {
    private static instance: GVRService;

    private constructor() { }

    static getInstance(): GVRService {
        if (!GVRService.instance) {
            GVRService.instance = new GVRService();
        }
        return GVRService.instance;
    }

    /**
     * Execute a GVR query
     */
    async query(gvrQuery: GVRQuery): Promise<GVRResponse> {
        const startTime = Date.now();
        const weights = getGVRWeights();

        // Step 1: Get semantic search results from vector service
        const vectorResults = await this.searchVectors(gvrQuery.query, gvrQuery.topK * 2);

        // Step 2: Get graph context for focused files
        const graphContext = gvrQuery.includeGraphContext
            ? await this.buildGraphContext(gvrQuery.focusedFiles ?? [], gvrQuery.graphDepth)
            : null;

        // Step 3: Score and rank results
        const scoredResults = await this.scoreResults(
            vectorResults,
            graphContext,
            gvrQuery.focusedFiles ?? [],
            weights
        );

        // Step 4: Take top K results
        const topResults = scoredResults.slice(0, gvrQuery.topK);

        return {
            results: topResults,
            graphContext,
            metadata: {
                queryTime: Date.now() - startTime,
                vectorHits: vectorResults.length,
                graphNodesVisited: graphContext?.impactedFiles.length ?? 0,
            },
        };
    }

    /**
     * Search vectors via vector-service
     */
    private async searchVectors(query: string, topK: number): Promise<VectorSearchResult[]> {
        try {
            const response = await axios.post(`${config.VECTOR_SERVICE_URL}/api/v1/search`, {
                query,
                topK,
            });

            if (response.data.success && response.data.data) {
                return response.data.data as VectorSearchResult[];
            }
            return [];
        } catch (err) {
            // Log error but continue - graceful degradation
            // eslint-disable-next-line no-console
            console.error('Vector service error:', err);
            return [];
        }
    }

    /**
     * Build graph context by traversing dependencies
     */
    private async buildGraphContext(
        focusedFiles: string[],
        depth: number
    ): Promise<GraphContext> {
        const impactedFiles = new Set<string>();
        const dependencyChain: DependencyResult[] = [];
        const modifiedSymbols: string[] = [];

        for (const file of focusedFiles) {
            // Get dependents (files that depend on this file)
            const dependents = await this.getDependents(file, depth);
            dependents.forEach((d) => {
                impactedFiles.add(d.file);
                dependencyChain.push(d);
            });

            // Get nodes for symbols
            const nodes = await this.getNodesForFile(file);
            nodes.forEach((n) => {
                if (n.type === 'function' || n.type === 'class' || n.type === 'method') {
                    modifiedSymbols.push(n.name);
                }
            });
        }

        // Add focused files themselves
        focusedFiles.forEach((f) => impactedFiles.add(f));

        return {
            impactedFiles: Array.from(impactedFiles),
            dependencyChain,
            modifiedSymbols,
        };
    }

    /**
     * Get dependents from CKG service
     */
    private async getDependents(filePath: string, depth: number): Promise<DependencyResult[]> {
        try {
            const response = await axios.get(`${config.CKG_SERVICE_URL}/api/v1/dependents`, {
                params: { filePath, depth },
            });

            if (response.data.success && response.data.data) {
                return response.data.data as DependencyResult[];
            }
            return [];
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('CKG service error (dependents):', err);
            return [];
        }
    }

    /**
     * Get nodes for a file from CKG service
     */
    private async getNodesForFile(filePath: string): Promise<CKGNode[]> {
        try {
            const response = await axios.get(`${config.CKG_SERVICE_URL}/api/v1/nodes`, {
                params: { filePath },
            });

            if (response.data.success && response.data.data) {
                return response.data.data as CKGNode[];
            }
            return [];
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('CKG service error (nodes):', err);
            return [];
        }
    }

    /**
     * Score and rank results using hybrid scoring
     */
    private async scoreResults(
        vectorResults: VectorSearchResult[],
        graphContext: GraphContext | null,
        focusedFiles: string[],
        weights: { semantic: number; graph: number; focus: number }
    ): Promise<GVRResult[]> {
        const focusedFilesSet = new Set(focusedFiles);
        const impactedFilesSet = new Set(graphContext?.impactedFiles ?? []);

        const results: GVRResult[] = [];

        for (const vr of vectorResults) {
            const filePath = vr.document.filePath;

            // Calculate score components
            const semanticScore = vr.score;

            // Graph relevance: higher if file is in the impacted set
            const graphScore = impactedFilesSet.has(filePath) ? 1.0 : 0.0;

            // Focus boost: higher if file is directly focused
            const focusScore = focusedFilesSet.has(filePath) ? 1.0 : 0.0;

            // Combined weighted score
            const combinedScore =
                semanticScore * weights.semantic +
                graphScore * weights.graph +
                focusScore * weights.focus;

            // Get connected files from graph context
            const connectedFiles = graphContext?.dependencyChain
                .filter((d) => d.file === filePath || impactedFilesSet.has(d.file))
                .map((d) => d.file)
                .slice(0, 5) ?? [];

            results.push({
                id: vr.id,
                content: vr.document.content,
                filePath,
                startLine: vr.document.startLine,
                endLine: vr.document.endLine,
                score: combinedScore,
                scoreBreakdown: {
                    semantic: semanticScore,
                    graphRelevance: graphScore,
                    focusBoost: focusScore,
                },
                connectedFiles,
            });
        }

        // Sort by combined score descending
        results.sort((a, b) => b.score - a.score);

        return results;
    }

    /**
     * Index a project directory
     */
    async indexProject(projectPath: string): Promise<{
        ckgResult: { filesIndexed: number; nodesCreated: number; edgesCreated: number } | null;
        success: boolean;
    }> {
        try {
            // Index with CKG service
            const ckgResponse = await axios.post(`${config.CKG_SERVICE_URL}/api/v1/index`, {
                path: projectPath,
            });

            return {
                ckgResult: ckgResponse.data.success ? ckgResponse.data.data : null,
                success: ckgResponse.data.success,
            };
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Index project error:', err);
            return { ckgResult: null, success: false };
        }
    }
}
