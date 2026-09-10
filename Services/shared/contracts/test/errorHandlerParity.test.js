import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// The error handler and AppError are deliberately vendored into every service:
// each builds in its own Docker context, and only five of the eleven depend on
// this package. Nothing else stops those copies drifting apart, so this does.
//
// It lives here rather than in the gateway because the gateway has no test runner
// and is not in the CI matrix — a guard that never runs is not a guard.
const SERVICES_DIR = join(process.cwd(), '..', '..');

function servicesShipping(relativePath) {
  return readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(SERVICES_DIR, name, relativePath)))
    .sort();
}

function contentsOf(relativePath) {
  const services = servicesShipping(relativePath);
  return services.map((service) => ({
    service,
    content: readFileSync(join(SERVICES_DIR, service, relativePath), 'utf8'),
  }));
}

describe('vendored error modules', () => {
  it('ships a byte-identical errorHandler.js in every service', () => {
    const files = contentsOf(join('src', 'middleware', 'errorHandler.js'));

    expect(files.length).toBe(11);

    const [reference, ...rest] = files;
    const drifted = rest.filter((file) => file.content !== reference.content).map((f) => f.service);

    expect(drifted, `drifted from ${reference.service}`).toEqual([]);
  });

  it('ships a byte-identical appError.js in every service', () => {
    const files = contentsOf(join('src', 'utils', 'appError.js'));

    expect(files.length).toBe(11);

    const [reference, ...rest] = files;
    const drifted = rest.filter((file) => file.content !== reference.content).map((f) => f.service);

    expect(drifted, `drifted from ${reference.service}`).toEqual([]);
  });

  it('keeps the raw error message out of every vendored handler', () => {
    // The whole point of the shared body: a message only reaches a client when the
    // error marks itself operational.
    for (const { service, content } of contentsOf(join('src', 'middleware', 'errorHandler.js'))) {
      expect(content, `${service} no longer gates on operational`).toContain(
        "const operational = err.isOperational === true;",
      );
      expect(content, `${service} appears to emit err.message unconditionally`).not.toMatch(
        /message:\s*err\.message,/,
      );
    }
  });
});
