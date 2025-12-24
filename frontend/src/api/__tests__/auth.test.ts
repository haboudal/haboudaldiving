import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from '../auth';
import { apiClient } from '../client';

// Mock the API client
vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'diver' as const,
  firstName: 'Test',
  lastName: 'User',
  phoneNumber: '+966500000000',
  emailVerified: true,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('sends login request and returns auth response', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockResponse = {
        data: {
          data: {
            user: mockUser,
            accessToken: 'access-token',
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.login(credentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual({
        user: mockUser,
        accessToken: 'access-token',
      });
    });

    it('throws error on failed login', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' };
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid credentials'));

      await expect(authApi.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('sends register request and returns auth response', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '+966500000000',
      };
      const mockResponse = {
        data: {
          data: {
            user: mockUser,
            accessToken: 'new-token',
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.register(registerData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result).toEqual({
        user: mockUser,
        accessToken: 'new-token',
      });
    });
  });

  describe('logout', () => {
    it('sends logout request', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});

      await authApi.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('refresh', () => {
    it('refreshes the access token', async () => {
      const mockResponse = {
        data: {
          data: { accessToken: 'new-access-token' },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.refresh();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });
  });

  describe('getMe', () => {
    it('fetches current user', async () => {
      const mockResponse = {
        data: { data: mockUser },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.getMe();

      expect(apiClient.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('verifyEmail', () => {
    it('sends email verification request', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});

      await authApi.verifyEmail('verification-token');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/verify-email', {
        token: 'verification-token',
      });
    });
  });

  describe('forgotPassword', () => {
    it('sends forgot password request', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});

      await authApi.forgotPassword('test@example.com');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('sends reset password request', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});

      await authApi.resetPassword('reset-token', 'new-password');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        password: 'new-password',
      });
    });
  });
});
