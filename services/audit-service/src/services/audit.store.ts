import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { config, isLocalStore } from '../config/index.js';
import type {
    AuditLogEntry,
    CreateAuditLogInput,
    AuditLogQuery,
    IntegrityCheckResult,
} from '../types/index.js';

// In-memory index for fast queries (in production, use a real database)
const logsIndex = new Map<string, AuditLogEntry>();
let lastLogId: string | undefined;
let sequenceCounter = 0;

/**
 * AuditStore provides append-only immutable audit log storage.
 */
export class AuditStore {
    private static instance: AuditStore;
    private initialized = false;

    private constructor() { }

    static getInstance(): AuditStore {
        if (!AuditStore.instance) {
            AuditStore.instance = new AuditStore();
        }
        return AuditStore.instance;
    }

    /**
     * Initialize the audit store (create directories, load existing logs)
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        if (isLocalStore()) {
            const storePath = config.AUDIT_STORE_PATH;
            await fs.mkdir(storePath, { recursive: true });

            // Load existing logs into index
            try {
                const files = await fs.readdir(storePath);
                const logFiles = files.filter((f) => f.endsWith('.json')).sort();

                for (const file of logFiles) {
                    const content = await fs.readFile(path.join(storePath, file), 'utf-8');
                    const entry = JSON.parse(content) as AuditLogEntry;
                    logsIndex.set(entry.id, entry);
                    lastLogId = entry.id;
                    sequenceCounter = Math.max(sequenceCounter, entry.sequenceNumber);
                }
            } catch {
                // No existing logs, that's fine
            }
        }

        this.initialized = true;
    }

    /**
     * Sign log entry data with HMAC-SHA256
     */
    private signEntry(data: Omit<AuditLogEntry, 'signature'>): string {
        const payload = JSON.stringify(data);
        return crypto
            .createHmac('sha256', config.AUDIT_SIGNING_KEY)
            .update(payload)
            .digest('hex');
    }

    /**
     * Verify entry signature
     */
    verifySignature(entry: AuditLogEntry): boolean {
        const { signature, ...data } = entry;
        const expectedSignature = this.signEntry(data);
        try {
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch {
            return false;
        }
    }

    /**
     * Append a new audit log entry (immutable)
     */
    async append(input: CreateAuditLogInput): Promise<AuditLogEntry> {
        await this.initialize();

        sequenceCounter++;

        const entryData: Omit<AuditLogEntry, 'signature'> = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            action: input.action,
            category: input.category,
            actor: input.actor,
            resource: input.resource,
            details: input.details,
            diff: input.diff,
            testResults: input.testResults,
            previousLogId: lastLogId,
            sequenceNumber: sequenceCounter,
        };

        const signature = this.signEntry(entryData);
        const entry: AuditLogEntry = { ...entryData, signature };

        // Persist to storage
        if (isLocalStore()) {
            const filename = `${entry.sequenceNumber.toString().padStart(10, '0')}-${entry.id}.json`;
            const filepath = path.join(config.AUDIT_STORE_PATH, filename);
            await fs.writeFile(filepath, JSON.stringify(entry, null, 2), { flag: 'wx' }); // wx = exclusive create
        } else {
            // S3 storage would go here
            throw new Error('S3 storage not yet implemented');
        }

        // Update index
        logsIndex.set(entry.id, entry);
        lastLogId = entry.id;

        return entry;
    }

    /**
     * Get a log entry by ID
     */
    async getById(id: string): Promise<AuditLogEntry | null> {
        await this.initialize();
        return logsIndex.get(id) ?? null;
    }

    /**
     * Query logs with filters and pagination
     */
    async query(query: AuditLogQuery): Promise<{ entries: AuditLogEntry[]; total: number }> {
        await this.initialize();

        let entries = Array.from(logsIndex.values());

        // Apply filters
        if (query.startTime) {
            entries = entries.filter((e) => e.timestamp >= query.startTime!);
        }
        if (query.endTime) {
            entries = entries.filter((e) => e.timestamp <= query.endTime!);
        }
        if (query.action) {
            entries = entries.filter((e) => e.action === query.action);
        }
        if (query.category) {
            entries = entries.filter((e) => e.category === query.category);
        }
        if (query.actorId) {
            entries = entries.filter((e) => e.actor.id === query.actorId);
        }
        if (query.resourceType) {
            entries = entries.filter((e) => e.resource.type === query.resourceType);
        }
        if (query.resourceId) {
            entries = entries.filter((e) => e.resource.id === query.resourceId);
        }

        // Sort by sequence number descending (newest first)
        entries.sort((a, b) => b.sequenceNumber - a.sequenceNumber);

        const total = entries.length;
        const start = (query.page - 1) * query.pageSize;
        const paginatedEntries = entries.slice(start, start + query.pageSize);

        return { entries: paginatedEntries, total };
    }

    /**
     * Verify integrity of the entire audit log chain
     */
    async verifyIntegrity(): Promise<IntegrityCheckResult> {
        await this.initialize();

        const entries = Array.from(logsIndex.values()).sort(
            (a, b) => a.sequenceNumber - b.sequenceNumber
        );

        const result: IntegrityCheckResult = {
            valid: true,
            entriesChecked: entries.length,
            invalidEntries: [],
            chainBroken: false,
        };

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            // Verify signature
            if (!this.verifySignature(entry)) {
                result.valid = false;
                result.invalidEntries.push(entry.id);
            }

            // Verify chain (previousLogId should match previous entry's id)
            if (i > 0) {
                const prevEntry = entries[i - 1];
                if (entry.previousLogId !== prevEntry.id) {
                    result.valid = false;
                    result.chainBroken = true;
                    if (!result.firstBrokenAt) {
                        result.firstBrokenAt = entry.id;
                    }
                }
            }
        }

        return result;
    }

    /**
     * Get statistics about the audit log
     */
    async getStats(): Promise<{
        totalEntries: number;
        latestEntry: AuditLogEntry | null;
        entriesByCategory: Record<string, number>;
        entriesByAction: Record<string, number>;
    }> {
        await this.initialize();

        const entries = Array.from(logsIndex.values());
        const entriesByCategory: Record<string, number> = {};
        const entriesByAction: Record<string, number> = {};

        for (const entry of entries) {
            entriesByCategory[entry.category] = (entriesByCategory[entry.category] ?? 0) + 1;
            entriesByAction[entry.action] = (entriesByAction[entry.action] ?? 0) + 1;
        }

        const latestEntry = entries.length > 0
            ? entries.reduce((a, b) => (a.sequenceNumber > b.sequenceNumber ? a : b))
            : null;

        return {
            totalEntries: entries.length,
            latestEntry,
            entriesByCategory,
            entriesByAction,
        };
    }
}
