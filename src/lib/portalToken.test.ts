import { describe, expect, it } from 'vitest';

import { readPortalToken } from './portalToken';

describe('readPortalToken', () => {
  it.each([
    ['#7kmp-4xq9wd', '7KMP4XQ9WD'],
    ['#OIL2345678', '0112345678'],
  ])('normalizes a valid fragment token %s', (fragment, expected) => {
    expect(readPortalToken(fragment)).toBe(expected);
  });

  it.each([
    '#terlalu-pendek',
    '',
    '?token=7KMP4XQ9WD',
    '#123e4567-e89b-12d3-a456-426614174000',
    '#ABCD',
  ])('rejects unsupported portal input %s', (fragment) => {
    expect(readPortalToken(fragment)).toBeNull();
  });
});
