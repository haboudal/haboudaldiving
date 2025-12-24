import { describe, it, expect, beforeEach } from 'vitest';
import { setAccessToken, getAccessToken, getErrorMessage } from '../client';

describe('API Client', () => {
  describe('access token management', () => {
    beforeEach(() => {
      setAccessToken(null);
    });

    it('setAccessToken stores the token', () => {
      setAccessToken('test-token');
      expect(getAccessToken()).toBe('test-token');
    });

    it('setAccessToken can clear the token', () => {
      setAccessToken('test-token');
      setAccessToken(null);
      expect(getAccessToken()).toBeNull();
    });

    it('getAccessToken returns null by default', () => {
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('getErrorMessage', () => {
    it('extracts message from regular Error', () => {
      const error = new Error('Regular error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Regular error message');
    });

    it('returns default message for unknown error types', () => {
      const message = getErrorMessage('some string error');
      expect(message).toBe('An unexpected error occurred');
    });

    it('returns default message for null', () => {
      const message = getErrorMessage(null);
      expect(message).toBe('An unexpected error occurred');
    });

    it('returns default message for undefined', () => {
      const message = getErrorMessage(undefined);
      expect(message).toBe('An unexpected error occurred');
    });

    it('returns default message for object without message', () => {
      const message = getErrorMessage({ foo: 'bar' });
      expect(message).toBe('An unexpected error occurred');
    });
  });
});
