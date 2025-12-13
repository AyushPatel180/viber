// VIBER API Client - Connects to all backend services

const API_BASE = 'http://localhost:3000/api/v1';
const SPECULATIVE_URL = 'http://localhost:3003/api/v1';
const SANDBOX_URL = 'http://localhost:3004/api/v1';
const ORACLE_URL = 'http://localhost:3005/api/v1';
const CKG_URL = 'http://localhost:3001/api/v1';

export interface SpeculativeDiff {
    id: string;
    filePath: string;
    diffType: 'insert' | 'delete' | 'replace';
    startLine: number;
    endLine?: number;
    originalContent?: string;
    proposedContent: string;
    confidence: number;
}

export interface ChangeSet {
    id: string;
    sessionId: string;
    prompt: string;
    diffs: SpeculativeDiff[];
    status: 'pending' | 'approved' | 'rejected' | 'applied';
    generatedBy: 'local' | 'oracle';
    createdAt: string;
}

export interface ExecutionResult {
    id: string;
    command: string;
    status: 'running' | 'completed' | 'failed' | 'timeout';
    stdout: string;
    stderr: string;
    exitCode: number | null;
    duration: number;
}

export interface OracleResponse {
    id: string;
    response: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: {
        totalCost: number;
        currency: string;
    };
}

export interface CKGNode {
    id: string;
    name: string;
    type: string;
    filePath: string;
    startLine: number;
    endLine: number;
}

class ViberAPI {
    private sessionId: string;

    constructor() {
        this.sessionId = crypto.randomUUID();
    }

    // ============ Orchestrator ============
    async healthCheck(): Promise<{ status: string; services: Record<string, string> }> {
        const res = await fetch('http://localhost:3000/health');
        return res.json();
    }

    async getMetrics(): Promise<{ services: Array<{ name: string; status: string; latencyMs: number }> }> {
        const res = await fetch(`${API_BASE}/metrics/json`);
        const data = await res.json();
        return data.data;
    }

    // ============ Context Stack ============
    async assembleContext(workdir?: string): Promise<{ constitution: unknown[]; blueprint: unknown; workbench: unknown }> {
        const res = await fetch(`${API_BASE}/context/assemble`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: this.sessionId, includeBlueprint: true, workdir }),
        });
        const data = await res.json();
        return data.data;
    }

    // ============ Speculative Engine ============
    async generateDiff(prompt: string, filePath?: string): Promise<ChangeSet> {
        const res = await fetch(`${SPECULATIVE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: this.sessionId,
                prompt,
                targetFiles: filePath ? [filePath] : undefined,
            }),
        });
        const data = await res.json();
        return data.data;
    }

    async getChangeSet(changeSetId: string): Promise<ChangeSet | null> {
        const res = await fetch(`${SPECULATIVE_URL}/changeset/${changeSetId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.data;
    }

    async approveChangeSet(changeSetId: string): Promise<boolean> {
        const res = await fetch(`${SPECULATIVE_URL}/approve/${changeSetId}`, {
            method: 'POST',
        });
        return res.ok;
    }

    async rejectChangeSet(changeSetId: string): Promise<boolean> {
        const res = await fetch(`${SPECULATIVE_URL}/reject/${changeSetId}`, {
            method: 'POST',
        });
        return res.ok;
    }

    async applyChangeSet(changeSetId: string, dryRun = true): Promise<{ success: boolean; appliedFiles: string[] }> {
        const res = await fetch(`${SPECULATIVE_URL}/apply/${changeSetId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dryRun }),
        });
        const data = await res.json();
        return data.data;
    }

    // ============ Sandbox Executor ============
    async executeCommand(command: string, workdir?: string): Promise<ExecutionResult> {
        const res = await fetch(`${SANDBOX_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: this.sessionId,
                command,
                workdir,
                timeout: 30000,
            }),
        });
        const data = await res.json();
        return data.data;
    }

    async runTests(workdir?: string): Promise<ExecutionResult> {
        const res = await fetch(`${SANDBOX_URL}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: this.sessionId,
                workdir,
                testCommand: 'npm test',
            }),
        });
        const data = await res.json();
        return data.data;
    }

    async runDryRun(changeSetId: string): Promise<{ success: boolean; steps: Array<{ name: string; status: string }> }> {
        const res = await fetch(`${SANDBOX_URL}/dry-run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: this.sessionId,
                changeSetId,
            }),
        });
        const data = await res.json();
        return data.data;
    }

    // ============ Oracle Adapter ============
    async queryOracle(prompt: string): Promise<OracleResponse> {
        const res = await fetch(`${ORACLE_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: this.sessionId,
                prompt,
                maxTokens: 2000,
                temperature: 0.7,
            }),
        });
        const data = await res.json();
        return data.data;
    }

    async estimateCost(promptTokens: number, completionTokens: number, model = 'gpt-4'): Promise<{ totalCost: number }> {
        const res = await fetch(`${ORACLE_URL}/estimate-cost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
            }),
        });
        const data = await res.json();
        return data.data;
    }

    // ============ CKG Service ============
    async indexDirectory(path: string): Promise<{ nodesCreated: number; edgesCreated: number }> {
        const res = await fetch(`${CKG_URL}/index`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        });
        const data = await res.json();
        return data.data;
    }

    async searchSymbols(query: string, type?: string): Promise<CKGNode[]> {
        const res = await fetch(`${CKG_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, type }),
        });
        const data = await res.json();
        return data.data?.nodes || [];
    }

    async getFileDependencies(filePath: string): Promise<{ imports: string[]; exports: string[] }> {
        const res = await fetch(`${CKG_URL}/dependencies?filePath=${encodeURIComponent(filePath)}`);
        const data = await res.json();
        return data.data;
    }

    getSessionId(): string {
        return this.sessionId;
    }
}

export const viber = new ViberAPI();
