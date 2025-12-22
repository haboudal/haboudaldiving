import { describe, it, expect } from 'vitest';
import {
  generateToken,
  hashToken,
  encrypt,
  decrypt,
  calculateAge,
  isMinor,
  sanitizeObject,
  generateSlug,
  paginate,
} from '../../utils/helpers';

describe('Helper Utilities', () => {
  describe('generateToken', () => {
    it('should generate a token of default length', () => {
      const token = generateToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate a token of specified length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash a token consistently', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce a 64-character hex string', () => {
      const hash = hashToken('test');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const original = 'sensitive data';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext each time (due to random IV)', () => {
      const text = 'same text';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const original = 'Hello! @#$%^&*() العربية 日本語';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const birthDate = `${birthYear}-01-01`;
      const age = calculateAge(birthDate);
      expect(age).toBeGreaterThanOrEqual(24);
      expect(age).toBeLessThanOrEqual(25);
    });

    it('should handle Date objects', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 30, 0, 1);
      const age = calculateAge(birthDate);
      expect(age).toBe(30);
    });

    it('should account for birthday not yet passed', () => {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear() - 20, today.getMonth() + 1, 15);
      const age = calculateAge(nextMonth);
      expect(age).toBe(19);
    });
  });

  describe('isMinor', () => {
    it('should return true for ages under 18', () => {
      const today = new Date();
      const minorBirthDate = `${today.getFullYear() - 15}-01-01`;
      expect(isMinor(minorBirthDate)).toBe(true);
    });

    it('should return false for ages 18 and over', () => {
      const today = new Date();
      const adultBirthDate = `${today.getFullYear() - 18}-01-01`;
      expect(isMinor(adultBirthDate)).toBe(false);
    });

    it('should return false for adults', () => {
      const today = new Date();
      const adultBirthDate = `${today.getFullYear() - 30}-01-01`;
      expect(isMinor(adultBirthDate)).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should remove undefined values', () => {
      const obj = { a: 1, b: undefined, c: 'test' };
      const result = sanitizeObject(obj);
      expect(result).toEqual({ a: 1, c: 'test' });
    });

    it('should remove null values', () => {
      const obj = { a: 1, b: null, c: 'test' };
      const result = sanitizeObject(obj);
      expect(result).toEqual({ a: 1, c: 'test' });
    });

    it('should keep falsy values like 0 and empty string', () => {
      const obj = { a: 0, b: '', c: false };
      const result = sanitizeObject(obj);
      expect(result).toEqual({ a: 0, b: '', c: false });
    });

    it('should handle empty objects', () => {
      const obj = {};
      const result = sanitizeObject(obj);
      expect(result).toEqual({});
    });
  });

  describe('generateSlug', () => {
    it('should convert text to lowercase', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('hello world test')).toBe('hello-world-test');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello! World?')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('hello   world')).toBe('hello-world');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(generateSlug(' hello world ')).toBe('hello-world');
    });
  });

  describe('paginate', () => {
    it('should return correct pagination structure', () => {
      const items = [1, 2, 3, 4, 5];
      const result = paginate(items, 100, { page: 1, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');
      expect(result.pagination).toHaveProperty('hasNext');
      expect(result.pagination).toHaveProperty('hasPrev');
    });

    it('should calculate totalPages correctly', () => {
      const result = paginate([], 25, { page: 1, limit: 10 });
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should set hasNext correctly', () => {
      const result1 = paginate([], 25, { page: 1, limit: 10 });
      expect(result1.pagination.hasNext).toBe(true);

      const result2 = paginate([], 25, { page: 3, limit: 10 });
      expect(result2.pagination.hasNext).toBe(false);
    });

    it('should set hasPrev correctly', () => {
      const result1 = paginate([], 25, { page: 1, limit: 10 });
      expect(result1.pagination.hasPrev).toBe(false);

      const result2 = paginate([], 25, { page: 2, limit: 10 });
      expect(result2.pagination.hasPrev).toBe(true);
    });

    it('should use default values when not provided', () => {
      const result = paginate([1, 2, 3], 3, {});
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should cap limit at 100', () => {
      const result = paginate([], 1000, { page: 1, limit: 500 });
      expect(result.pagination.limit).toBe(100);
    });

    it('should enforce minimum page of 1', () => {
      const result = paginate([], 10, { page: 0, limit: 10 });
      expect(result.pagination.page).toBe(1);
    });
  });
});
