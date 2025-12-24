import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

// Mock the auth store
const mockAuthStore: {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string; role: string } | null;
} = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
};

vi.mock('@/store', () => ({
  useAuthStore: () => mockAuthStore,
}));

// Helper to render with router
const renderWithRouter = (
  ui: React.ReactElement,
  { initialEntries = ['/protected'] } = {}
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Reset mock state
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;
    mockAuthStore.user = null;
  });

  it('shows loading spinner when authentication is loading', () => {
    mockAuthStore.isLoading = true;

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Check for spinner (div with animate-spin class)
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    mockAuthStore.isAuthenticated = false;

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { id: '1', email: 'test@test.com', role: 'diver' };

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  describe('role-based access', () => {
    it('allows access when user has required role', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.user = { id: '1', email: 'admin@test.com', role: 'admin' };

      renderWithRouter(
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('redirects to home when user lacks required role', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.user = { id: '1', email: 'user@test.com', role: 'diver' };

      renderWithRouter(
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('allows access when user has one of multiple required roles', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.user = { id: '1', email: 'owner@test.com', role: 'center_owner' };

      renderWithRouter(
        <ProtectedRoute requiredRole={['admin', 'center_owner']}>
          <div>Admin or Owner Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Admin or Owner Content')).toBeInTheDocument();
    });

    it('redirects when user role not in allowed roles array', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.user = { id: '1', email: 'diver@test.com', role: 'diver' };

      renderWithRouter(
        <ProtectedRoute requiredRole={['admin', 'center_owner']}>
          <div>Admin or Owner Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });
});
