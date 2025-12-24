import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';

// Mock the API module
vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getMe: vi.fn(),
  },
  setAccessToken: vi.fn(),
}));

import { authApi, setAccessToken } from '@/api';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'diver' as const,
  status: 'active' as const,
  preferredLanguage: 'en' as const,
  phoneNumber: '+966500000000',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset the store
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('sets user and token on successful login', async () => {
      vi.mocked(authApi.login).mockResolvedValue({
        user: mockUser,
        accessToken: 'test-token',
      });

      await useAuthStore.getState().login({
        email: 'test@example.com',
        password: 'password123',
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('test-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(setAccessToken).toHaveBeenCalledWith('test-token');
    });

    it('handles login with tokens object', async () => {
      vi.mocked(authApi.login).mockResolvedValue({
        user: mockUser,
        tokens: { accessToken: 'nested-token', refreshToken: 'refresh-token', expiresIn: 900 },
      });

      await useAuthStore.getState().login({
        email: 'test@example.com',
        password: 'password123',
      });

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('nested-token');
    });

    it('sets error on failed login', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(authApi.login).mockRejectedValue(error);

      await expect(
        useAuthStore.getState().login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('sets loading state during login', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let resolveLogin: (value: any) => void;
      vi.mocked(authApi.login).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          })
      );

      const loginPromise = useAuthStore.getState().login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Check loading state is set
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Resolve the login
      resolveLogin!({ user: mockUser, accessToken: 'token' });
      await loginPromise;

      // Loading should be false after completion
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('sets user and token on successful registration', async () => {
      vi.mocked(authApi.register).mockResolvedValue({
        user: mockUser,
        accessToken: 'new-user-token',
      });

      await useAuthStore.getState().register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '+966500000000',
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('new-user-token');
      expect(state.isAuthenticated).toBe(true);
      expect(setAccessToken).toHaveBeenCalledWith('new-user-token');
    });

    it('sets error on failed registration', async () => {
      const error = new Error('Email already exists');
      vi.mocked(authApi.register).mockRejectedValue(error);

      await expect(
        useAuthStore.getState().register({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: '+966500000000',
        })
      ).rejects.toThrow('Email already exists');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Email already exists');
    });
  });

  describe('logout', () => {
    it('clears all auth state on logout', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
      });

      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(setAccessToken).toHaveBeenCalledWith(null);
    });

    it('clears state even if logout API fails', async () => {
      useAuthStore.setState({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
      });

      vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('updates access token on successful refresh', async () => {
      useAuthStore.setState({
        accessToken: 'old-token',
        isAuthenticated: true,
      });

      vi.mocked(authApi.refresh).mockResolvedValue({
        accessToken: 'new-token',
      });

      await useAuthStore.getState().refreshToken();

      expect(useAuthStore.getState().accessToken).toBe('new-token');
      expect(setAccessToken).toHaveBeenCalledWith('new-token');
    });

    it('logs out user if refresh fails', async () => {
      useAuthStore.setState({
        user: mockUser,
        accessToken: 'expired-token',
        isAuthenticated: true,
      });

      vi.mocked(authApi.refresh).mockRejectedValue(new Error('Token expired'));
      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      await expect(useAuthStore.getState().refreshToken()).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe('checkAuth', () => {
    it('fetches user when access token exists', async () => {
      useAuthStore.setState({
        accessToken: 'valid-token',
        isLoading: true,
      });

      vi.mocked(authApi.getMe).mockResolvedValue(mockUser);

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(setAccessToken).toHaveBeenCalledWith('valid-token');
    });

    it('sets not authenticated when no token', async () => {
      useAuthStore.setState({
        accessToken: null,
        isLoading: true,
      });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(authApi.getMe).not.toHaveBeenCalled();
    });

    it('clears auth state when getMe fails', async () => {
      useAuthStore.setState({
        accessToken: 'invalid-token',
        isLoading: true,
      });

      vi.mocked(authApi.getMe).mockRejectedValue(new Error('Unauthorized'));

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('utility actions', () => {
    it('clearError clears the error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('setUser updates the user', () => {
      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().user).toEqual(mockUser);
    });
  });
});
