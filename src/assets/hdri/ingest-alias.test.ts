import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aliasHdr } from '../../../scripts/ingest-hdri';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-hdri-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('aliasHdr', () => {
  it('copies _1k.hdr to <id>.hdr when canonical is absent', () => {
    const content = Buffer.from('HDR data misty_pines_1k');
    fs.writeFileSync(path.join(tmpDir, 'misty_pines_1k.hdr'), content);

    aliasHdr(tmpDir, 'misty-pines');

    const canonicalPath = path.join(tmpDir, 'misty-pines.hdr');
    expect(fs.existsSync(canonicalPath)).toBe(true);
    expect(fs.readFileSync(canonicalPath)).toEqual(content);
  });

  it('is a no-op when <id>.hdr already exists', () => {
    const existing = Buffer.from('already canonical');
    fs.writeFileSync(path.join(tmpDir, 'fog-dusk.hdr'), existing);
    fs.writeFileSync(
      path.join(tmpDir, 'fog_dusk_1k.hdr'),
      Buffer.from('pack copy'),
    );

    aliasHdr(tmpDir, 'fog-dusk');

    expect(fs.readFileSync(path.join(tmpDir, 'fog-dusk.hdr'))).toEqual(
      existing,
    );
  });

  it('prefers _1k over _2k when multiple resolutions are present', () => {
    const data1k = Buffer.from('one k data');
    const data2k = Buffer.from('two k data');
    fs.writeFileSync(path.join(tmpDir, 'kloppenheim_04_1k.hdr'), data1k);
    fs.writeFileSync(path.join(tmpDir, 'kloppenheim_04_2k.hdr'), data2k);

    aliasHdr(tmpDir, 'kloppenheim-04');

    const canonical = fs.readFileSync(path.join(tmpDir, 'kloppenheim-04.hdr'));
    expect(canonical).toEqual(data1k);
  });

  it('warns but does not throw when no .hdr files exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'preview.png'), Buffer.from('png'));

    expect(() => aliasHdr(tmpDir, 'empty-pack')).not.toThrow();
    expect(fs.existsSync(path.join(tmpDir, 'empty-pack.hdr'))).toBe(false);
  });
});
