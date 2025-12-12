# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it via email to **security@viber.dev**. Do not open a public issue.

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Principles

VIBER is built with security-first principles:

### Default-Deny Access

- No agent action may access network, secrets, or production systems without explicit approval
- All destructive actions blocked until approved via documented workflow
- Capabilities tokens required for elevated operations

### Sandbox-First Execution

- All code execution runs in ephemeral containers/micro-VMs
- No host filesystem writes outside ephemeral workspace
- Network isolation by default

### Immutable Audit Trail

- Every agent action recorded in append-only store
- Cryptographic signing of all log entries
- Diffs, test logs, and approvals preserved

### RBAC & Least Privilege

- Role mappings: developer, reviewer, admin
- Minimal permissions by default
- Admin-only access for sensitive operations

### Cost Controls

- Per-org, per-project, per-user spend caps
- Admin approval required for cap increases
- MFA required for billing changes

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Measures

- All secrets stored in HashiCorp Vault
- TLS required for all service communication
- Regular dependency vulnerability scanning
- Penetration testing before production releases
