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

### Workflows
| Workflow | File | Purpose |
|----------|------|---------|
| PR | `.github/workflows/pr.yml` | Run tests on PRs |
| Publish | `.github/workflows/publish.yml` | Publish to npm on git tag push |
| Release | `.github/workflows/release.yml` | Manual release (bumps version, creates tag) |
| Dependabot | `.github/dependabot.yml` | Weekly Friday 03:30 UTC dependency updates |
| Auto-merge | `.github/workflows/dependabot-auto-merge.yml` | Auto-merge Dependabot PRs on open |

### Release Process

**Option 1: Standard npm version (Recommended)**
```bash
npm version patch   # or minor/major: bumps version in package.json and creates git tag
git push origin main --follow-tags
```
- Tag push (e.g., `v2.4.0`) triggers `.github/workflows/publish.yml`
- Workflow: install → build → test → publish to npm with provenance

**Option 2: GitHub workflow dispatch**
```bash
gh workflow run release.yml -f version_type=patch  # or minor
```

### Requirements
- `NPM_AUTH_TOKEN` secret configured in GitHub (for npm publishing)

## Notes
- `prepublishOnly` script runs build + test before publishing
- Node 26 is the primary runtime version
- TypeScript 7.0+ is used for type-checking and compilation
- No major version bumps via Dependabot (configured to skip)
- Uses npm provenance for supply chain security
