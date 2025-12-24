import { Suspense, lazy, useEffect, memo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoader, FullPageLoader } from '@/components/LoadingFallback';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/store';
import type { UserRole } from '@/types';

// Import i18n
import '@/i18n';

// Lazy load pages for code splitting
// Public pages
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);
const TripsPage = lazy(() => import('@/pages/TripsPage').then((m) => ({ default: m.TripsPage })));
const TripDetailPage = lazy(() =>
  import('@/pages/TripDetailPage').then((m) => ({ default: m.TripDetailPage }))
);
const CentersPage = lazy(() =>
  import('@/pages/CentersPage').then((m) => ({ default: m.CentersPage }))
);
const CenterDetailPage = lazy(() =>
  import('@/pages/CenterDetailPage').then((m) => ({ default: m.CenterDetailPage }))
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

// Protected pages
const BookingPage = lazy(() =>
  import('@/pages/BookingPage').then((m) => ({ default: m.BookingPage }))
);
const MyBookingsPage = lazy(() =>
  import('@/pages/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage }))
);
const BookingDetailPage = lazy(() =>
  import('@/pages/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage }))
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const DiveLogsPage = lazy(() =>
  import('@/pages/DiveLogsPage').then((m) => ({ default: m.DiveLogsPage }))
);
const CheckoutPage = lazy(() =>
  import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const WriteReviewPage = lazy(() =>
  import('@/pages/WriteReviewPage').then((m) => ({ default: m.WriteReviewPage }))
);
const MyReviewsPage = lazy(() =>
  import('@/pages/MyReviewsPage').then((m) => ({ default: m.MyReviewsPage }))
);

// Center Owner pages
const CenterDashboardPage = lazy(() =>
  import('@/pages/center-owner/CenterDashboardPage').then((m) => ({
    default: m.CenterDashboardPage,
  }))
);
const ManageTripsPage = lazy(() =>
  import('@/pages/center-owner/ManageTripsPage').then((m) => ({ default: m.ManageTripsPage }))
);
const CreateTripPage = lazy(() =>
  import('@/pages/center-owner/CreateTripPage').then((m) => ({ default: m.CreateTripPage }))
);
const ManageBookingsPage = lazy(() =>
  import('@/pages/center-owner/ManageBookingsPage').then((m) => ({ default: m.ManageBookingsPage }))
);
const ManageStaffPage = lazy(() =>
  import('@/pages/center-owner/ManageStaffPage').then((m) => ({ default: m.ManageStaffPage }))
);

// Admin pages
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const UserManagementPage = lazy(() =>
  import('@/pages/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage }))
);
const CenterManagementPage = lazy(() =>
  import('@/pages/admin/CenterManagementPage').then((m) => ({ default: m.CenterManagementPage }))
);
const AnalyticsPage = lazy(() =>
  import('@/pages/admin/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const ModerationPage = lazy(() =>
  import('@/pages/admin/ModerationPage').then((m) => ({ default: m.ModerationPage }))
);

// Instructor pages
const InstructorDashboardPage = lazy(() =>
  import('@/pages/instructor/InstructorDashboardPage').then((m) => ({
    default: m.InstructorDashboardPage,
  }))
);
const InstructorTripsPage = lazy(() =>
  import('@/pages/instructor/InstructorTripsPage').then((m) => ({
    default: m.InstructorTripsPage,
  }))
);
const SchedulePage = lazy(() =>
  import('@/pages/instructor/SchedulePage').then((m) => ({ default: m.SchedulePage }))
);
const VerifyDiveLogsPage = lazy(() =>
  import('@/pages/instructor/VerifyDiveLogsPage').then((m) => ({ default: m.VerifyDiveLogsPage }))
);
const InstructorReviewsPage = lazy(() =>
  import('@/pages/instructor/InstructorReviewsPage').then((m) => ({
    default: m.InstructorReviewsPage,
  }))
);

// Configure React Query with production optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: import.meta.env.PROD ? 3 : 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: import.meta.env.PROD,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: import.meta.env.PROD ? 1 : 0,
    },
  },
});

// Memoized route wrapper for protected routes
const ProtectedRouteWrapper = memo(function ProtectedRouteWrapper({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <ProtectedRoute requiredRole={requiredRole}>{children}</ProtectedRoute>
      </Suspense>
    </ErrorBoundary>
  );
});

// Memoized public route wrapper
const PublicRouteWrapper = memo(function PublicRouteWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
});

function AppContent() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <PublicRouteWrapper>
              <HomePage />
            </PublicRouteWrapper>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRouteWrapper>
              <LoginPage />
            </PublicRouteWrapper>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRouteWrapper>
              <RegisterPage />
            </PublicRouteWrapper>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRouteWrapper>
              <ForgotPasswordPage />
            </PublicRouteWrapper>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRouteWrapper>
              <ResetPasswordPage />
            </PublicRouteWrapper>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PublicRouteWrapper>
              <VerifyEmailPage />
            </PublicRouteWrapper>
          }
        />

        {/* Trip browsing (public) */}
        <Route
          path="/trips"
          element={
            <PublicRouteWrapper>
              <TripsPage />
            </PublicRouteWrapper>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <PublicRouteWrapper>
              <TripDetailPage />
            </PublicRouteWrapper>
          }
        />

        {/* Diving centers (public) */}
        <Route
          path="/centers"
          element={
            <PublicRouteWrapper>
              <CentersPage />
            </PublicRouteWrapper>
          }
        />
        <Route
          path="/centers/:id"
          element={
            <PublicRouteWrapper>
              <CenterDetailPage />
            </PublicRouteWrapper>
          }
        />

        {/* Protected routes - Diver */}
        <Route
          path="/trips/:id/book"
          element={
            <ProtectedRouteWrapper>
              <BookingPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRouteWrapper>
              <MyBookingsPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/my-bookings/:id"
          element={
            <ProtectedRouteWrapper>
              <BookingDetailPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRouteWrapper>
              <ProfilePage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/dive-logs"
          element={
            <ProtectedRouteWrapper>
              <DiveLogsPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/checkout/:bookingId"
          element={
            <ProtectedRouteWrapper>
              <CheckoutPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/my-bookings/:bookingId/review"
          element={
            <ProtectedRouteWrapper>
              <WriteReviewPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/my-reviews"
          element={
            <ProtectedRouteWrapper>
              <MyReviewsPage />
            </ProtectedRouteWrapper>
          }
        />

        {/* Center Owner Routes */}
        <Route
          path="/center"
          element={
            <ProtectedRouteWrapper requiredRole="center_owner">
              <CenterDashboardPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/center/trips"
          element={
            <ProtectedRouteWrapper requiredRole="center_owner">
              <ManageTripsPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/center/trips/new"
          element={
            <ProtectedRouteWrapper requiredRole="center_owner">
              <CreateTripPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/center/trips/:tripId/edit"
          element={
            <ProtectedRouteWrapper requiredRole="center_owner">
              <CreateTripPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/center/bookings"
          element={
            <ProtectedRouteWrapper requiredRole="center_owner">
              <ManageBookingsPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/center/staff"
          element={
            <ProtectedRouteWrapper requiredRole="center_owner">
              <ManageStaffPage />
            </ProtectedRouteWrapper>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRouteWrapper requiredRole="admin">
              <AdminDashboardPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRouteWrapper requiredRole="admin">
              <UserManagementPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/admin/centers"
          element={
            <ProtectedRouteWrapper requiredRole="admin">
              <CenterManagementPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRouteWrapper requiredRole="admin">
              <AnalyticsPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <ProtectedRouteWrapper requiredRole="admin">
              <ModerationPage />
            </ProtectedRouteWrapper>
          }
        />

        {/* Instructor Routes */}
        <Route
          path="/instructor"
          element={
            <ProtectedRouteWrapper requiredRole="instructor">
              <InstructorDashboardPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/instructor/trips"
          element={
            <ProtectedRouteWrapper requiredRole="instructor">
              <InstructorTripsPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/instructor/schedule"
          element={
            <ProtectedRouteWrapper requiredRole="instructor">
              <SchedulePage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/instructor/verify-logs"
          element={
            <ProtectedRouteWrapper requiredRole="instructor">
              <VerifyDiveLogsPage />
            </ProtectedRouteWrapper>
          }
        />
        <Route
          path="/instructor/reviews"
          element={
            <ProtectedRouteWrapper requiredRole="instructor">
              <InstructorReviewsPage />
            </ProtectedRouteWrapper>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <PublicRouteWrapper>
              <NotFoundPage />
            </PublicRouteWrapper>
          }
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
          <Toaster />
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
