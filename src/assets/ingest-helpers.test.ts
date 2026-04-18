import { describe, expect, it } from 'vitest';
import { validateEntryId } from '../../scripts/_ingest-helpers';

describe('validateEntryId', () => {
  it('accepts valid slug ids', () => {
    expect(() => validateEntryId('mossy-stone')).not.toThrow();
    expect(() => validateEntryId('misty_pines')).not.toThrow();
    expect(() => validateEntryId('id123')).not.toThrow();
    expect(() => validateEntryId('a')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateEntryId('')).toThrow();
  });

  it('rejects forward slash (path traversal)', () => {
    expect(() => validateEntryId('foo/bar')).toThrow(/path separators/);
    expect(() => validateEntryId('../evil')).toThrow(/path separators/);
  });

  it('rejects backslash (Windows path traversal)', () => {
    expect(() => validateEntryId('foo\\bar')).toThrow(/path separators/);
  });

  it('rejects double-dot traversal sequence', () => {
    expect(() => validateEntryId('..')).toThrow(/path separators/);
    expect(() => validateEntryId('a..b')).toThrow(/path separators/);
  });

  it('rejects uppercase letters', () => {
    expect(() => validateEntryId('MyMaterial')).toThrow(/\[a-z0-9_-\]/);
  });

  it('rejects spaces and special characters', () => {
    expect(() => validateEntryId('foo bar')).toThrow(/\[a-z0-9_-\]/);
    expect(() => validateEntryId('foo@bar')).toThrow(/\[a-z0-9_-\]/);
  });
});
