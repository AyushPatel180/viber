# @viber/policy-service

VIBER Policy Service - RBAC, capability tokens, and approval workflows.

## Overview

This service handles:

- **Role-Based Access Control (RBAC)**: Manages developer/reviewer/admin roles and permissions
- **Service Accounts**: Create and manage service accounts for agents and services
- **Capability Tokens**: Mint, approve, and revoke scoped capability tokens
- **Vault Integration**: Secure secret management (mock mode available for development)

## API Endpoints

### Roles
- `GET /api/v1/roles` - List all roles and permissions

### Service Accounts
- `GET /api/v1/service-accounts` - List service accounts (paginated)
- `GET /api/v1/service-accounts/:id` - Get a service account
- `POST /api/v1/service-accounts` - Create service account (admin only)
- `DELETE /api/v1/service-accounts/:id` - Delete service account (admin only)
- `POST /api/v1/service-accounts/:id/disable` - Disable account (admin only)
- `POST /api/v1/service-accounts/:id/enable` - Enable account (admin only)

### Capability Tokens
- `GET /api/v1/tokens` - List tokens
- `GET /api/v1/tokens/:id` - Get a token
- `POST /api/v1/tokens/mint` - Mint a new token
- `POST /api/v1/tokens/:id/approve` - Approve a token
- `POST /api/v1/tokens/:id/revoke` - Revoke a token (admin only)
- `POST /api/v1/tokens/:id/validate` - Validate a token

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3006 | Service port |
| `NODE_ENV` | development | Environment |
| `VAULT_MOCK` | true | Use mock Vault |
| `VAULT_ADDR` | http://localhost:8200 | Vault address |
| `TOKEN_SIGNING_KEY` | dev-key | HMAC signing key |
