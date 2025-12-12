# VIBER - Production-Grade Agentic IDE

<div align="center">

**Impact-aware • Grounded • Low-latency • Auditable • Safe-by-default**

![CI](https://github.com/your-org/viber/workflows/CI%20Pipeline/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

</div>

---

## Overview

VIBER is a production-grade agentic IDE designed with safety-first principles. It combines:

- **Graph-Vector Hybrid Retrieval** - Code Knowledge Graph (CKG) with semantic vector search
- **Context Stack Memory** - Tiered memory system for efficient context management
- **Speculative Local Model** - Low-latency diffs using local Llama models
- **Oracle Cloud Verification** - GPT/Claude validation with reconciliation
- **Sandboxed Execution** - Ephemeral containers/micro-VMs for safe testing

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VIBER Architecture                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │     UI      │───▶│ Orchestrator│───▶│  Speculative │───▶│   Oracle    │  │
│  │   (React)   │    │             │    │    Engine    │    │   Adapter   │  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘    └─────────────┘  │
│                            │                                                │
│         ┌──────────────────┼──────────────────┐                             │
│         ▼                  ▼                  ▼                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │ CKG Service │    │   Vector    │    │   Sandbox   │                      │
│  │  (Graph DB) │    │   Service   │    │  Executor   │                      │
│  └─────────────┘    └─────────────┘    └─────────────┘                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Cross-cutting Services                       │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │   │
│  │  │   Policy    │    │    Audit    │    │   Gateway   │              │   │
│  │  │   Service   │    │   Service   │    │   (AuthN)   │              │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Description | Port |
|---------|-------------|------|
| `orchestrator` | Main coordination and request routing | 3000 |
| `ckg-service` | Code Knowledge Graph - AST parsing, symbol extraction | 3001 |
| `vector-service` | Vector embeddings and semantic search | 3002 |
| `speculative-engine` | Local Llama model for instant diffs | 3003 |
| `oracle-adapter` | Cloud LLM integration (GPT/Claude) | 3004 |
| `sandbox-executor` | Ephemeral container execution | 3005 |
| `policy-service` | RBAC, capability tokens, approvals | 3006 |
| `audit-service` | Append-only immutable audit trail | 3007 |
| `ui` | Agent Manager React UI | 3010 |

## Quick Start

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- HashiCorp Vault (optional for dev)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/viber.git
cd viber

# Install dependencies
npm install

# Start with mock services
npm run dev:mock

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Docker Compose (Full Stack)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

See [.env.example](.env.example) for all available configuration options.

## Security Policies

VIBER enforces strict security policies:

- **Default-deny**: No network/secret access without explicit approval
- **Sandbox-first**: All execution in ephemeral containers
- **Immutable audit**: Append-only signed logs for all actions
- **RBAC**: Role-based access control (developer/reviewer/admin)
- **Cost controls**: Per-org/project/user spend caps

See [SECURITY.md](SECURITY.md) for details.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for our code of conduct and development process.

## License

MIT License - see [LICENSE](LICENSE) for details.
