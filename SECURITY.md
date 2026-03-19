# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within swizzy, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Send an email to sarath@example.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- Acknowledgment of your report within 48 hours
- Regular updates on the progress
- Credit for the discovery (unless you prefer to stay anonymous)

### Scope

swizzy is a CLI tool that processes SwiftLint JSON output. Security concerns specific to this tool include:

- Handling of malformed JSON input
- Path traversal in configuration file handling
- Command injection risks

swizzy does NOT:
- Make network requests (except SwiftLint execution)
- Store sensitive data
- Handle user credentials

## Security Best Practices

When using swizzy:

- Ensure SwiftLint is from a trusted source
- Review configuration files before using them
- Keep swizzy updated to the latest version
