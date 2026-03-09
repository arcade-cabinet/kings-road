import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toBe('foo baz');
  });

  it('handles undefined and null', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles arrays', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('handles objects', () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe('foo baz');
  });

  it('merges tailwind classes correctly', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('handles conflicting tailwind classes', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles complex tailwind merging', () => {
    const result = cn('bg-red-500 hover:bg-red-600', 'bg-blue-500');
    expect(result).toBe('hover:bg-red-600 bg-blue-500');
  });

  it('handles whitespace', () => {
    const result = cn('  foo  ', '  bar  ');
    expect(result).toBe('foo bar');
  });
});
