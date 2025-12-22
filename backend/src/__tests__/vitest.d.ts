import 'vitest';

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeOneOf(expected: number[]): T;
  }
  interface AsymmetricMatchersContaining {
    toBeOneOf(expected: number[]): unknown;
  }
}
