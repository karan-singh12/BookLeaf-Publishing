import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

/**
 * Architecture rules, enforced by reading the import statements. They keep the layering honest:
 * a rule that only lives in a README gets broken the first time someone is in a hurry.
 */

const SRC = path.resolve(__dirname, '../src');

const listFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [full] : [];
  });

/** Every relative import in a file, resolved to an absolute path (without extension). */
const relativeImports = (file: string): string[] => {
  const source = fs.readFileSync(file, 'utf8');
  const found: string[] = [];
  for (const marker of ["from '", 'from "']) {
    let from = 0;
    for (;;) {
      const start = source.indexOf(marker, from);
      if (start === -1) break;
      const specifierStart = start + marker.length;
      const specifierEnd = source.indexOf(marker.endsWith("'") ? "'" : '"', specifierStart);
      const specifier = source.slice(specifierStart, specifierEnd);
      if (specifier.startsWith('.')) found.push(path.resolve(path.dirname(file), specifier));
      from = specifierEnd + 1;
    }
  }
  return found;
};

const within = (target: string, folder: string): boolean => target === folder || target.startsWith(folder + path.sep);
const rel = (file: string): string => path.relative(SRC, file).split(path.sep).join('/');

const violations = (files: string[], isForbidden: (importPath: string, file: string) => boolean): string[] =>
  files.flatMap((file) => relativeImports(file).filter((target) => isForbidden(target, file)).map((target) => `${rel(file)} -> ${rel(target)}`));

describe('architecture', () => {
  const sdkRoot = path.join(SRC, 'ai-sdk');
  const ticketAiRoot = path.join(sdkRoot, 'ticket-ai');
  const sdkFiles = listFiles(sdkRoot);
  const genericSdkFiles = sdkFiles.filter((file) => !within(file, ticketAiRoot));

  it('the generic AI SDK knows nothing about BookLeaf: it imports only from itself, never from ticket-ai', () => {
    const bad = violations(genericSdkFiles, (target) => !within(target, sdkRoot) || within(target, ticketAiRoot));
    assert.deepEqual(bad, [], `generic SDK files must not import app code or ticket-ai:\n${bad.join('\n')}`);
  });

  it('ticket-ai builds on the SDK and the domain layer, never on HTTP or database code', () => {
    const files = listFiles(ticketAiRoot);
    const forbidden = ['controllers', 'routes', 'middleware', 'models', 'repositories', 'services', 'presenters'].map((d) => path.join(SRC, d));
    const bad = violations(files, (target) => forbidden.some((folder) => within(target, folder)));
    assert.deepEqual(bad, [], `ticket-ai must stay free of HTTP/database layers:\n${bad.join('\n')}`);
  });

  it('routes only wire controllers, middleware and validators (no business logic or data access)', () => {
    const files = listFiles(path.join(SRC, 'routes')).filter((file) => path.basename(file) !== 'index.ts');
    const forbidden = ['services', 'repositories', 'models'].map((d) => path.join(SRC, d));
    const bad = violations(files, (target) => forbidden.some((folder) => within(target, folder)));
    assert.deepEqual(bad, [], `routes must not reach into services/data:\n${bad.join('\n')}`);
  });

  it('controllers stay thin: they call services, never repositories or models', () => {
    const files = listFiles(path.join(SRC, 'controllers'));
    const forbidden = ['repositories', 'models'].map((d) => path.join(SRC, d));
    const bad = violations(files, (target) => forbidden.some((folder) => within(target, folder)));
    assert.deepEqual(bad, [], `controllers must not touch the data layer:\n${bad.join('\n')}`);
  });

  it('only the data layer talks to the database: models are not imported by controllers, routes or presenters', () => {
    const files = ['controllers', 'routes', 'presenters', 'middleware'].flatMap((d) => listFiles(path.join(SRC, d)));
    const models = path.join(SRC, 'models');
    // Presenters may use model *types* (BookAttrs etc.), which erase at compile time; they must not use runtime models.
    const bad = violations(files, (target, file) => within(target, models) && !file.includes(`${path.sep}presenters${path.sep}`));
    assert.deepEqual(bad, [], `these layers must not import models:\n${bad.join('\n')}`);
  });
});
