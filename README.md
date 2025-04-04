# swizzy

[![ESLint](https://img.shields.io/badge/code_style-eslint-4B32C3.svg)](https://eslint.org)
[![TypeScript](https://img.shields.io/badge/built_with-typescript-3178C6.svg)](https://www.typescriptlang.org)

Swizzy is a pretty formatter for SwiftLint output. It transforms SwiftLint's standard output into a more readable and stylish format. This project is inspired by [snazzy](https://github.com/feross/snazzy).

![JavaScript Style Guide](./output.png)

## Features

- Formats SwiftLint output in a compact and stylish way
- Written in TypeScript for better maintainability and type safety
- Easy integration with existing SwiftLint workflows
- Customizable output formatting
- Works seamlessly with CI/CD pipelines

## Installation

```bash
npm install -g swizzy
```

Make sure you have SwiftLint installed:

```bash
brew install swiftlint
```

## Usage

Swizzy can be used in two main ways:

1.  **Piping SwiftLint Output (Recommended):**

    Run `swiftlint` with the `--reporter json` flag and pipe the output directly to `swizzy`. This is the most reliable method.

    ```bash
    swiftlint lint --reporter json | swizzy
    ```

2.  **Automatic SwiftLint Execution:**

    If you run `swizzy` without any piped input, it will attempt to execute `swiftlint lint --reporter json` automatically for you. **Note:** This requires `swiftlint` to be installed and accessible in your system's PATH.

    ```bash
    swizzy
    ```

### Options

*   `--help`, `-h`: Show help message.
*   `--version`, `-v`: Show version number.

```bash
swizzy --help
swizzy -v
```

### Example in `package.json`

You can integrate `swizzy` into your npm scripts:

```json
{
  "scripts": {
    "lint": "swiftlint lint --reporter json | swizzy"
  }
}
```

Then run `npm run lint`.

## Screenshot

![JavaScript Style Guide](./output.png)

## Development

To contribute to swizzy, clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/swizzy.git
cd swizzy
npm install
```

Available scripts:

```bash
# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Testing

To run the basic test case included in the repository (which uses a predefined anonymized JSON file):

```bash
cat anonymized_lint.json | node dist/index.js
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](https://choosealicense.com/licenses/mit/)

[standard-url]: https://standardjs.com