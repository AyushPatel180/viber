# @viber/audit-service

VIBER Audit Service - Append-only immutable audit trail.

## Overview

This service provides:

- **Append-Only Logs**: Immutable audit log entries with cryptographic signing
- **Chain Verification**: Verify integrity of the entire audit trail
- **Query Interface**: Filter and paginate audit logs
- **Multiple Backends**: Local file storage or S3 (with object lock)

## API Endpoints

### Logs
- `POST /api/v1/logs` - Append a new log entry
- `GET /api/v1/logs` - Query logs (with filters and pagination)
- `GET /api/v1/logs/:id` - Get a specific log entry
- `GET /api/v1/logs/:id/verify` - Verify a log entry's signature
- `POST /api/v1/logs/verify-chain` - Verify entire audit chain integrity

### Statistics
- `GET /api/v1/stats` - Get audit log statistics

## Log Entry Structure

```json
{
  "id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "action": "apply|propose|rollback|approve|...",
  "category": "agent|code|sandbox|approval|...",
  "actor": { "id": "string", "type": "user|service|agent" },
  "resource": { "type": "string", "id": "string" },
  "diff": { "before": ..., "after": ... },
  "testResults": { "passed": 10, "failed": 0 },
  "signature": "hmac-sha256-signature",
  "previousLogId": "uuid",
  "sequenceNumber": 1
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3007 | Service port |
| `AUDIT_STORE_TYPE` | local | Storage backend |
| `AUDIT_STORE_PATH` | ./audit-logs | Local storage path |
| `AUDIT_SIGNING_KEY` | dev-key | HMAC signing key |
