# Contributing to VIBER

Thank you for your interest in contributing to VIBER! This document provides guidelines and standards for contributing.

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates

Example: `feature/ckg-incremental-updates`

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes with tests
3. Ensure CI passes (lint, type-check, tests)
4. Request review from at least one maintainer
5. Address review feedback
6. Squash and merge when approved

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Testing**: Minimum 90% coverage for core services
- **Documentation**: Update relevant docs with changes
- **Security**: No secrets in code, use Vault

### Testing

```bash
# Run all tests
npm test

# Run tests for specific service
npm run test --workspace=services/policy-service

# Run with coverage
npm run test:coverage
```

## Architecture Decisions

Significant architecture changes require an ADR (Architecture Decision Record) in `docs/adr/`.

## Questions?

Open an issue or discussion on GitHub.
