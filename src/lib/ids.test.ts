import { describe, expect, it } from 'vitest';
import { ID_PATTERN, isServerId, newId } from './ids';

describe('newId', () => {
  it('returns 15 lowercase alphanumeric characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(newId()).toMatch(ID_PATTERN);
    }
  });

  it('does not repeat across many calls', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => newId()));
    expect(ids.size).toBe(5000);
  });
});

describe('isServerId', () => {
  it('accepts PocketBase ids and rejects UUIDs', () => {
    expect(isServerId('abc123def456ghi')).toBe(true);
    expect(isServerId('3f2a9c1e-8b7d-4e6f-a5c4-1b2d3e4f5a6b')).toBe(false);
    expect(isServerId('ABC123DEF456GHI')).toBe(false);
  });
});
