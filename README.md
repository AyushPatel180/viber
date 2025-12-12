# VIBER - Production-Grade Agentic IDE

> Visual Intelligent Builder for Evolutionary Refactoring

[![CI Pipeline](https://github.com/AyushPatel180/viber/actions/workflows/ci.yml/badge.svg)](https://github.com/AyushPatel180/viber/actions)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/AyushPatel180/viber.git
cd viber

# Install dependencies
npm install

# Start all services in development
npm run dev

# Or start with Docker Compose
docker-compose up -d
```

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| Orchestrator | 3000 | Central coordinator, GVR, metrics |
| CKG Service | 3001 | Code Knowledge Graph (AST + dependencies) |
| Vector Service | 3002 | Semantic embeddings & search |
| Speculative Engine | 3003 | Diff generation with local model |
| Sandbox Executor | 3004 | Test & dry-run pipeline |
| Oracle Adapter | 3005 | Cloud LLM integration |
| Policy Service | 3006 | RBAC, tokens, permissions |
| Audit Service | 3007 | Immutable audit logs |
| Agent UI | 5173 | React dashboard |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Agent Manager UI                   │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                    Orchestrator                      │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐  │
│  │ GVR Engine  │ │Context Stack│ │  Metrics      │  │
│  └─────────────┘ └─────────────┘ └───────────────┘  │
└──┬───────────────┬──────────────┬───────────────────┘
   │               │              │
┌──▼──┐        ┌───▼───┐     ┌────▼────┐
│ CKG │        │Vector │     │Speculative
│     │        │       │     │Engine   │
└─────┘        └───────┘     └────┬────┘
                                  │
               ┌──────────────────┼──────────────────┐
               │                  │                  │
          ┌────▼────┐       ┌─────▼────┐       ┌─────▼────┐
          │ Sandbox │       │  Oracle  │       │  Policy  │
          │ Executor│       │ Adapter  │       │  Service │
          └─────────┘       └──────────┘       └──────────┘
```

## 🔧 Development

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format

# Build all services
npm run build
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests for specific service
npm run test --workspace=services/speculative-engine
```

## 📊 Observability

### Prometheus Metrics
```bash
curl http://localhost:3000/api/v1/metrics
```

### JSON Metrics
```bash
curl http://localhost:3000/api/v1/metrics/json
```

## 🔐 Security

- RBAC via Policy Service
- Token-based authentication
- Audit logging for all operations
- Secrets management ready

## 📝 License

MIT
