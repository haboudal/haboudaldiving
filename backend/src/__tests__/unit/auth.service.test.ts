import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies before importing the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { AuthService } from '../../modules/auth/auth.service';
import { db } from '../../config/database';
import { UnauthorizedError, ConflictError, ValidationError } from '../../utils/errors';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    const validRegisterDto = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'diver' as const,
      dateOfBirth: '1990-01-15',
      phoneNumber: '+966500000000',
      preferredLanguage: 'en' as const,
    };

    it('should throw ConflictError if email already exists', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'existing-id' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.register(validRegisterDto)).rejects.toThrow('Email already registered');
    });

    it('should throw ValidationError if minor without parent email', async () => {
      const minorDto = {
        ...validRegisterDto,
        dateOfBirth: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 years old
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.register(minorDto)).rejects.toThrow('Parent/guardian email is required');
    });

    it('should successfully register a new user', async () => {
      const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock: email doesn't exist
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock transaction
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({
              rows: [{
                id: mockUserId,
                email: validRegisterDto.email,
                role: validRegisterDto.role,
                status: 'pending_verification',
                preferred_language: 'en',
                created_at: new Date(),
              }],
              rowCount: 1,
              command: 'INSERT',
              oid: 0,
              fields: [],
            })
            .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] }),
        };
        return callback(mockClient as any);
      });

      // Mock verification token insert
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Mock refresh token insert
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await authService.register(validRegisterDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(validRegisterDto.email);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });
  });

  describe('login', () => {
    const validLoginDto = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };

    it('should throw UnauthorizedError for non-existent user', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.login(validLoginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedError for locked account', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: validLoginDto.email,
          password_hash: await bcrypt.hash(validLoginDto.password, 10),
          role: 'diver',
          status: 'active',
          preferred_language: 'en',
          phone_number: '+966500000000',
          failed_login_attempts: 5,
          locked_until: futureDate,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.login(validLoginDto)).rejects.toThrow('Account temporarily locked');
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: validLoginDto.email,
          password_hash: await bcrypt.hash('different-password', 10),
          role: 'diver',
          status: 'active',
          preferred_language: 'en',
          phone_number: '+966500000000',
          failed_login_attempts: 0,
          locked_until: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock failed attempt increment
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(authService.login(validLoginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedError for suspended account', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: validLoginDto.email,
          password_hash: await bcrypt.hash(validLoginDto.password, 10),
          role: 'diver',
          status: 'suspended',
          preferred_language: 'en',
          phone_number: '+966500000000',
          failed_login_attempts: 0,
          locked_until: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.login(validLoginDto)).rejects.toThrow('Account suspended');
    });

    it('should successfully login valid user', async () => {
      const userId = 'user-id-123';
      const passwordHash = await bcrypt.hash(validLoginDto.password, 10);

      // Mock user query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: userId,
          email: validLoginDto.email,
          password_hash: passwordHash,
          role: 'diver',
          status: 'active',
          preferred_language: 'en',
          phone_number: '+966500000000',
          failed_login_attempts: 0,
          locked_until: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock profile query (is_minor check)
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ is_minor: false }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock reset failed attempts
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Mock refresh token insert
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await authService.login(validLoginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(validLoginDto.email);
      expect(result.user.role).toBe('diver');
    });
  });

  describe('verifyEmail', () => {
    it('should throw UnauthorizedError for invalid token', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow('Invalid or expired verification token');
    });

    it('should successfully verify email with valid token', async () => {
      const userId = 'user-id-123';

      // Mock token lookup
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ user_id: userId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock transaction
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] })
            .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] }),
        };
        return callback(mockClient as any);
      });

      await expect(authService.verifyEmail('valid-token')).resolves.toBeUndefined();
    });
  });

  describe('requestPasswordReset', () => {
    it('should not throw error for non-existent email (security)', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.requestPasswordReset('nonexistent@example.com')).resolves.toBeUndefined();
    });

    it('should generate reset token for existing user', async () => {
      const userId = 'user-id-123';

      // Mock user lookup
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: userId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock token insert
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      await expect(authService.requestPasswordReset('existing@example.com')).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should throw UnauthorizedError for invalid token', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.resetPassword('invalid-token', 'NewPassword123!')).rejects.toThrow('Invalid or expired reset token');
    });

    it('should successfully reset password with valid token', async () => {
      const userId = 'user-id-123';

      // Mock token lookup
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ user_id: userId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock transaction
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] })
            .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] })
            .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] }),
        };
        return callback(mockClient as any);
      });

      await expect(authService.resetPassword('valid-token', 'NewPassword123!')).resolves.toBeUndefined();
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(authService.logout('user-id', 'refresh-token')).resolves.toBeUndefined();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens'),
        expect.any(Array)
      );
    });
  });

  describe('logoutAllDevices', () => {
    it('should revoke all refresh tokens', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 3,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(authService.logoutAllDevices('user-id')).resolves.toBeUndefined();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens'),
        ['user-id']
      );
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedError for invalid JWT', async () => {
      await expect(authService.refreshTokens('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedError for revoked token', async () => {
      // Create a valid JWT but mock DB to say it's revoked
      const validJwt = jwt.sign({ userId: 'user-id' }, process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_at_least_32_chars');

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(authService.refreshTokens(validJwt)).rejects.toThrow('Invalid or expired refresh token');
    });
  });
});
