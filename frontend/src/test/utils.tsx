import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: React.ReactNode;
}

// All-in-one wrapper for tests
function AllTheProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { createTestQueryClient };

// Helper to wait for loading states
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Helper to create mock user
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  role: 'diver' as const,
  status: 'active' as const,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Helper to create mock trip
export const createMockTrip = (overrides = {}) => ({
  id: 'trip-1',
  centerId: 'center-1',
  diveSiteId: 'site-1',
  titleEn: 'Morning Dive',
  titleAr: 'غوصة صباحية',
  tripType: 'morning' as const,
  status: 'published' as const,
  departureDatetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  returnDatetime: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
  maxParticipants: 12,
  currentParticipants: 5,
  pricePerPersonSar: 350,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Helper to create mock booking
export const createMockBooking = (overrides = {}) => ({
  id: 'booking-1',
  tripId: 'trip-1',
  userId: 'user-1',
  status: 'confirmed' as const,
  numberOfDivers: 1,
  totalPriceSar: 350,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Helper to create mock center
export const createMockCenter = (overrides = {}) => ({
  id: 'center-1',
  ownerUserId: 'user-1',
  nameEn: 'Red Sea Divers',
  nameAr: 'غواصو البحر الأحمر',
  slug: 'red-sea-divers',
  city: 'Jeddah',
  status: 'active' as const,
  ratingAverage: 4.5,
  totalReviews: 25,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
