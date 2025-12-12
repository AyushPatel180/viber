import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config/index.js';
import type { CapabilityToken, MintTokenRequest } from '../types/index.js';

// In-memory storage for tokens
const tokens = new Map<string, CapabilityToken>();

/**
 * TokenService manages capability tokens for scoped resource access.
 */
export class TokenService {
    private static instance: TokenService;

    private constructor() { }

    static getInstance(): TokenService {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService();
        }
        return TokenService.instance;
    }

    /**
     * Sign token data with HMAC-SHA256
     */
    private signToken(data: Omit<CapabilityToken, 'signature'>): string {
        const payload = JSON.stringify(data);
        return crypto
            .createHmac('sha256', config.TOKEN_SIGNING_KEY)
            .update(payload)
            .digest('hex');
    }

    /**
     * Verify token signature
     */
    verifySignature(token: CapabilityToken): boolean {
        const { signature, ...data } = token;
        const expectedSignature = this.signToken(data);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Mint a new capability token
     * Requires approvals before use
     */
    mint(
        request: MintTokenRequest,
        issuedTo: string,
        issuedBy: string,
        approvers: string[] = []
    ): CapabilityToken {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + request.expiresInSeconds * 1000);

        const tokenData: Omit<CapabilityToken, 'signature'> = {
            id: uuidv4(),
            resource: request.resource,
            permissions: request.permissions,
            issuedTo,
            issuedBy,
            approvers,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            revoked: false,
        };

        const signature = this.signToken(tokenData);
        const token: CapabilityToken = { ...tokenData, signature };

        tokens.set(token.id, token);
        return token;
    }

    /**
     * Get a token by ID
     */
    getById(id: string): CapabilityToken | null {
        return tokens.get(id) ?? null;
    }

    /**
     * List all tokens (optionally filter by issuedTo)
     */
    list(issuedTo?: string): CapabilityToken[] {
        const allTokens = Array.from(tokens.values());
        if (issuedTo) {
            return allTokens.filter((t) => t.issuedTo === issuedTo);
        }
        return allTokens;
    }

    /**
     * Revoke a token
     */
    revoke(id: string, revokedBy: string): boolean {
        const token = tokens.get(id);
        if (!token) {
            return false;
        }

        token.revoked = true;
        token.revokedAt = new Date().toISOString();
        token.revokedBy = revokedBy;
        tokens.set(id, token);
        return true;
    }

    /**
     * Check if a token is valid (not expired, not revoked, signature valid)
     */
    isValid(token: CapabilityToken): { valid: boolean; reason?: string } {
        // Check revoked
        if (token.revoked) {
            return { valid: false, reason: 'Token has been revoked' };
        }

        // Check expiry
        if (new Date(token.expiresAt) < new Date()) {
            return { valid: false, reason: 'Token has expired' };
        }

        // Verify signature
        if (!this.verifySignature(token)) {
            return { valid: false, reason: 'Invalid token signature' };
        }

        return { valid: true };
    }

    /**
     * Add an approver to a token
     */
    addApprover(id: string, approver: string): boolean {
        const token = tokens.get(id);
        if (!token) {
            return false;
        }

        if (!token.approvers.includes(approver)) {
            token.approvers.push(approver);
            // Re-sign since data changed
            const { signature: _, ...data } = token;
            token.signature = this.signToken(data);
            tokens.set(id, token);
        }
        return true;
    }
}
