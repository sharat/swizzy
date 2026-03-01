# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2024-12-01

### Added
- 🎨 **Multiple Output Formats**: Added support for `compact`, `json`, and `table` output formats
- ⚙️ **Configuration File Support**: Added support for `swizzy.config.json` configuration files
- 🔧 **Enhanced CLI Options**: Added `--config`, `--quiet`, and `--no-color` flags
- 📊 **Table Format**: New table format for structured issue presentation
- 🛡️ **Type Safety**: Complete rewrite with TypeScript and Zod validation
- 🚀 **Performance Improvements**: Streaming-based processing for large codebases
- 📝 **Comprehensive Help**: Enhanced `--help` output with detailed usage examples
- 🎯 **Exit Code Handling**: Proper exit codes for CI/CD integration (0, 1, 2)
- 🔍 **Better Error Handling**: Detailed error messages and troubleshooting information

### Changed
- 💪 **Complete TypeScript Rewrite**: Migrated entire codebase to TypeScript for better maintainability
- 🏗️ **Modern Architecture**: Refactored to use functional programming patterns and Result types
- 📋 **Improved JSON Validation**: Enhanced SwiftLint JSON parsing with Zod schema validation
- 🎨 **Better Formatting**: Improved compact format with better spacing and colors
- 📦 **Build System**: Updated build process with proper TypeScript compilation
- 🧪 **Testing Suite**: Added comprehensive integration and performance tests

### Fixed
- 🐛 **Empty Input Handling**: Fixed handling of empty SwiftLint output
- 🔧 **Configuration Precedence**: Fixed CLI args > config file > defaults precedence
- 📊 **Character Position**: Fixed handling of null character positions from SwiftLint
- 🎨 **Color Output**: Fixed color output in different terminal environments
- 🚀 **Performance**: Resolved memory issues with large SwiftLint outputs

### Security
- 🔒 **Input Validation**: Added strict validation of SwiftLint JSON input
- 🛡️ **Type Safety**: Enhanced type safety to prevent runtime errors

## [2.2.0] - 2024-10-15

### Added
- 🚀 **Automatic SwiftLint Execution**: swizzy now runs SwiftLint automatically if no input is piped
- 📝 **Version Command**: Added `--version` flag to display current version
- 🔧 **Better CLI Interface**: Improved command-line argument parsing

### Changed
- 📦 **Package Dependencies**: Updated to latest versions of dependencies
- 🏗️ **Code Organization**: Improved code structure and modularity

### Fixed
- 🐛 **Error Messages**: Fixed unclear error messages when SwiftLint is not found
- 🔧 **Process Handling**: Better handling of SwiftLint subprocess execution

## [2.1.0] - 2024-09-20

### Added
- 🎨 **Color Support**: Enhanced color output for better readability
- 📊 **Issue Grouping**: Issues are now grouped by file for cleaner output
- 🔧 **Improved CLI**: Better command-line interface with help messages

### Changed
- 📝 **Output Format**: Refined the compact output format for better readability
- 🏗️ **Code Quality**: Improved code structure and error handling

### Fixed
- 🐛 **JSON Parsing**: Fixed issues with malformed SwiftLint JSON output
- 🔧 **File Path Display**: Fixed display of relative file paths

## [2.0.0] - 2024-08-10

### Added
- 🎯 **SwiftLint JSON Support**: Full support for SwiftLint's `--reporter json` output
- 🎨 **Styled Output**: Beautiful, colored terminal output inspired by snazzy
- 📊 **Issue Summary**: Shows total count of problems found
- 🔧 **Command Line Interface**: Proper CLI with argument parsing

### Changed
- 🏗️ **Complete Rewrite**: Rebuilt from scratch for SwiftLint specifically
- 📦 **Modern Dependencies**: Updated to use modern Node.js packages
- 🎨 **Output Format**: New format optimized for SwiftLint issue display

### Removed
- 🗑️ **Legacy Code**: Removed old formatting logic not specific to SwiftLint

## [1.0.0] - 2024-06-01

### Added
- 🎉 **Initial Release**: First version of swizzy
- 📝 **Basic Formatting**: Simple SwiftLint output formatting
- 🎨 **Color Support**: Basic terminal color support
- 📦 **npm Package**: Published to npm registry

---

## Development Guidelines

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backwards compatible manner
- **PATCH** version when you make backwards compatible bug fixes

### Change Categories

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

### Release Process

1. Update version in `package.json`
2. Update this CHANGELOG.md
3. Create git tag: `git tag v2.3.0`
4. Push changes: `git push origin main --tags`
5. Publish to npm: `npm publish`

---

## Links

- [npm Package](https://www.npmjs.com/package/swizzy)
- [GitHub Repository](https://github.com/sharat/swizzy)
- [Issues](https://github.com/sharat/swizzy/issues)
- [SwiftLint](https://github.com/realm/SwiftLint)