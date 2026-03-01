import { CompactStream } from '../src/index';

const transformAsync = async (stream: CompactStream, data: Buffer | string): Promise<void> => {
  const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await new Promise<void>((resolve, reject) => {
    stream._transform(chunk, 'utf8', (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const flushAsync = async (stream: CompactStream): Promise<Error | null | undefined> => (
  new Promise((resolve) => {
    stream._flush((error) => {
      resolve(error);
    });
  })
);

describe('SwiftLint Text Pipeline Support', () => {
  it('parses default SwiftLint text reporter output', async () => {
    const stream = new CompactStream({
      format: 'compact',
      quiet: true,
      noColor: true
    });

    const swiftlintTextOutput = [
      '/Users/dev/MyApp/ViewController.swift:12:8: warning: Line should be 120 characters or less: currently 135 characters (line_length)',
      '/Users/dev/MyApp/AppDelegate.swift:27:5: error: Force unwrapping should be avoided (force_unwrapping)',
      'Done linting! Found 2 violations, 1 serious in 2 files.'
    ].join('\n');

    let output = '';
    stream.on('data', (chunk: Buffer | string) => {
      output += chunk.toString();
    });

    const endPromise = new Promise<void>((resolve, reject) => {
      stream.once('end', () => {
        try {
          expect(output).toContain('ViewController.swift');
          expect(output).toContain('AppDelegate.swift');
          expect(output).toContain('warning');
          expect(output).toContain('error');
          expect(output).toContain('line_length');
          expect(output).toContain('force_unwrapping');
          expect(output).toContain('✖ 2 problems');
          expect(stream.exitCode).toBe(1);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    await transformAsync(stream, swiftlintTextOutput);
    const error = await flushAsync(stream);
    expect(error).toBeFalsy();
    stream.end();
    await endPromise;
  });
});
