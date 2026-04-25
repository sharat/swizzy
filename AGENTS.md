# AGENTS.md

This file provides guidance for agents working in this repository.

## Build / Lint / Test Commands

```bash
# Install dependencies
npm install

# Build
npm run build                     # TypeScript compilation

# Testing
npm test                          # unit tests
npm run test:integration          # integration tests
npm run test:ci                   # CI test suite (with coverage)
npm run test:smoke                # smoke test

# Linting
npm run lint                      # oxlint check
npm run lint:fix                  # auto-fix issues
```

## Project Overview

swizzy is a modern CLI tool that beautifies SwiftLint JSON output into readable formats (compact, table, JSON).

### Test Types
- **Unit tests**: Fast, isolated tests (`vitest.config.ts`)
- **Integration tests**: Full workflow tests (`vitest.config.integration.ts`)
- **Smoke test**: CLI execution test (`test/integration/smoke-test.js`)

### Build Output
- `dist/index.js` — Main entry
- `dist/index.d.ts` — TypeScript declarations

## Dependency Management

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Audit for vulnerabilities
npm audit
```

## CI/CD

Check `.github/workflows/` for CI configuration. Multiple workflows handle PR checks, releases, and Dependabot automation.
