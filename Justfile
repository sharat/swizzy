# Justfile for swizzy

default: help

# Show available commands
help:
    @just --list

# --- Skills Management ---

# Check for agent skill updates
skills-check:
    npx skills check

# Update all installed agent skills
skills-update:
    npx skills update

# --- Build & Verification ---

# Install dependencies
install:
    npm install

# Build TypeScript output
build:
    npm run build

# Run unit test suite
test:
    npm test

# Run integration test suite
test-integration:
    npm run test:integration

# Run smoke test
test-smoke:
    npm run test:smoke

# Run full test & lint pipeline
ci:
    npm run lint && npm run build && npm test && npm run test:integration && npm run test:smoke

# --- Native Binaries & Benchmarking ---

# Build cross-platform native binaries using Bun
build-binaries:
    mkdir -p dist/binaries
    bun build --compile --target=bun-darwin-arm64 src/index.ts --outfile dist/binaries/swizzy-macos-arm64
    bun build --compile --target=bun-darwin-x64 src/index.ts --outfile dist/binaries/swizzy-macos-x64
    bun build --compile --target=bun-linux-x64 src/index.ts --outfile dist/binaries/swizzy-linux-x64
    bun build --compile --target=bun-linux-arm64 src/index.ts --outfile dist/binaries/swizzy-linux-arm64
    bun build --compile --target=bun-windows-x64 src/index.ts --outfile dist/binaries/swizzy-windows-x64.exe

# Run local performance benchmark
benchmark:
    node -e "const { execSync } = require('child_process'); const datasets = [{ name: 'Small', path: 'benchmarks/small.json' }, { name: 'Medium', path: 'benchmarks/medium.json' }, { name: 'Large', path: 'benchmarks/large.json' }, { name: 'Extra Large', path: 'benchmarks/extra-large.json' }]; datasets.forEach(d => { const start = process.hrtime.bigint(); try { execSync(\`cat \${d.path} | node dist/index.js --quiet\`, { stdio: 'ignore' }); } catch(e){} const end = process.hrtime.bigint(); console.log(\`\${d.name}: \${(Number(end - start)/1e6).toFixed(2)} ms\`); });"

# --- Releases ---

# Create a patch release (bump patch, git tag, push)
release-patch:
    npm version patch
    git push origin main --follow-tags

# Create a minor release (bump minor, git tag, push)
release-minor:
    npm version minor
    git push origin main --follow-tags
