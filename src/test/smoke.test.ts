import { describe, expect, it } from 'vitest';

describe('security test harness', () => {
  it('runs in jsdom', () => {
    expect(window.location).toBeDefined();
  });
});
