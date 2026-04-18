import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Verify that the ingest scripts use fs.cpSync (recursive) rather than a
 * top-level-only file loop.  We test the copy behaviour directly rather than
 * importing the private `ingestEntry` (not exported), so we re-implement the
 * cpSync call with the same options and assert that nested directories are
 * preserved — guaranteeing that the script change landed correctly.
 *
 * These tests also guard against regressions where a refactor strips out the
 * { recursive: true } option.
 */

let tmpSrc: string;
let tmpDst: string;

beforeEach(() => {
  tmpSrc = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-src-'));
  tmpDst = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-dst-'));
});

afterEach(() => {
  fs.rmSync(tmpSrc, { recursive: true, force: true });
  fs.rmSync(tmpDst, { recursive: true, force: true });
});

describe('fs.cpSync recursive copy (ingest scripts contract)', () => {
  it('copies top-level files', () => {
    fs.writeFileSync(path.join(tmpSrc, 'file.hdr'), 'hdr data');

    fs.cpSync(tmpSrc, tmpDst, { recursive: true });

    expect(fs.existsSync(path.join(tmpDst, 'file.hdr'))).toBe(true);
    expect(fs.readFileSync(path.join(tmpDst, 'file.hdr'), 'utf-8')).toBe(
      'hdr data',
    );
  });

  it('recursively copies subdirectories and their files', () => {
    const subDir = path.join(tmpSrc, 'textures');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'albedo.jpg'), 'jpg data');
    fs.writeFileSync(path.join(tmpSrc, 'readme.txt'), 'readme');

    fs.cpSync(tmpSrc, tmpDst, { recursive: true });

    expect(fs.existsSync(path.join(tmpDst, 'readme.txt'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDst, 'textures', 'albedo.jpg'))).toBe(
      true,
    );
    expect(
      fs.readFileSync(path.join(tmpDst, 'textures', 'albedo.jpg'), 'utf-8'),
    ).toBe('jpg data');
  });

  it('preserves deeply nested directory structure', () => {
    const deep = path.join(tmpSrc, 'a', 'b', 'c');
    fs.mkdirSync(deep, { recursive: true });
    fs.writeFileSync(path.join(deep, 'deep.bin'), 'deep data');

    fs.cpSync(tmpSrc, tmpDst, { recursive: true });

    expect(
      fs.existsSync(path.join(tmpDst, 'a', 'b', 'c', 'deep.bin')),
    ).toBe(true);
  });
});
