import { Router } from 'express';
import axios from 'axios';

import { config } from '../config/index.js';
import type { ApiResponse } from '../types/index.js';

const router = Router();

interface ServiceMetrics {
    name: string;
    status: 'up' | 'down';
    latencyMs: number;
    stats: Record<string, unknown>;
}

interface SystemMetrics {
    timestamp: string;
    services: ServiceMetrics[];
    totals: {
        ckgNodes: number;
        vectorDocs: number;
        pendingChanges: number;
        auditEntries: number;
        oracleCost: number;
    };
}

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics', async (req, res) => {
    const metrics = await collectMetrics();

    // Format as Prometheus metrics
    const lines: string[] = [
        '# HELP viber_service_up Service health status',
        '# TYPE viber_service_up gauge',
    ];

    for (const service of metrics.services) {
        lines.push(`viber_service_up{service="${service.name}"} ${service.status === 'up' ? 1 : 0}`);
        lines.push(`viber_service_latency_ms{service="${service.name}"} ${service.latencyMs}`);
    }

    lines.push('');
    lines.push('# HELP viber_ckg_nodes Total nodes in Code Knowledge Graph');
    lines.push('# TYPE viber_ckg_nodes gauge');
    lines.push(`viber_ckg_nodes ${metrics.totals.ckgNodes}`);

    lines.push('');
    lines.push('# HELP viber_vector_documents Total documents in vector store');
    lines.push('# TYPE viber_vector_documents gauge');
    lines.push(`viber_vector_documents ${metrics.totals.vectorDocs}`);

    lines.push('');
    lines.push('# HELP viber_pending_changes Pending change sets');
    lines.push('# TYPE viber_pending_changes gauge');
    lines.push(`viber_pending_changes ${metrics.totals.pendingChanges}`);

    lines.push('');
    lines.push('# HELP viber_audit_entries Total audit log entries');
    lines.push('# TYPE viber_audit_entries counter');
    lines.push(`viber_audit_entries ${metrics.totals.auditEntries}`);

    lines.push('');
    lines.push('# HELP viber_oracle_cost_usd Total oracle API cost');
    lines.push('# TYPE viber_oracle_cost_usd counter');
    lines.push(`viber_oracle_cost_usd ${metrics.totals.oracleCost}`);

    res.set('Content-Type', 'text/plain');
    res.send(lines.join('\n'));
});

/**
 * GET /metrics/json
 * JSON metrics endpoint
 */
router.get('/metrics/json', async (req, res) => {
    const metrics = await collectMetrics();

    const response: ApiResponse<SystemMetrics> = {
        success: true,
        data: metrics,
    };
    res.json(response);
});

/**
 * Collect metrics from all services
 */
async function collectMetrics(): Promise<SystemMetrics> {
    const serviceUrls = [
        { name: 'ckg', url: config.CKG_SERVICE_URL },
        { name: 'vector', url: config.VECTOR_SERVICE_URL },
        { name: 'policy', url: config.POLICY_SERVICE_URL },
        { name: 'audit', url: config.AUDIT_SERVICE_URL },
    ];

    const services: ServiceMetrics[] = await Promise.all(
        serviceUrls.map(async ({ name, url }) => {
            const start = Date.now();
            try {
                const res = await axios.get(`${url}/health`, { timeout: 5000 });
                return {
                    name,
                    status: 'up' as const,
                    latencyMs: Date.now() - start,
                    stats: res.data.stats ?? {},
                };
            } catch {
                return {
                    name,
                    status: 'down' as const,
                    latencyMs: Date.now() - start,
                    stats: {},
                };
            }
        })
    );

    // Extract totals from service stats
    const ckgStats = services.find(s => s.name === 'ckg')?.stats ?? {};
    const vectorStats = services.find(s => s.name === 'vector')?.stats ?? {};
    const auditStats = services.find(s => s.name === 'audit')?.stats ?? {};

    return {
        timestamp: new Date().toISOString(),
        services,
        totals: {
            ckgNodes: (ckgStats as { totalNodes?: number }).totalNodes ?? 0,
            vectorDocs: (vectorStats as { totalDocuments?: number }).totalDocuments ?? 0,
            pendingChanges: 0,
            auditEntries: (auditStats as { totalEntries?: number }).totalEntries ?? 0,
            oracleCost: 0,
        },
    };
}

export default router;
