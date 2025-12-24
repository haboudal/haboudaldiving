import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001/api/v1';

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'diver',
  status: 'active',
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTrips = [
  {
    id: 'trip-1',
    centerId: 'center-1',
    titleEn: 'Morning Dive at Coral Gardens',
    tripType: 'morning',
    status: 'published',
    departureDatetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    returnDatetime: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 12,
    currentParticipants: 5,
    pricePerPersonSar: 350,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'trip-2',
    centerId: 'center-1',
    titleEn: 'Night Dive Experience',
    tripType: 'night',
    status: 'published',
    departureDatetime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    returnDatetime: new Date(Date.now() + 52 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 8,
    currentParticipants: 3,
    pricePerPersonSar: 450,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockCenters = [
  {
    id: 'center-1',
    ownerUserId: 'user-owner-1',
    nameEn: 'Red Sea Divers',
    nameAr: 'غواصو البحر الأحمر',
    slug: 'red-sea-divers',
    city: 'Jeddah',
    status: 'active',
    ratingAverage: 4.5,
    totalReviews: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        success: true,
        data: {
          user: mockUser,
          accessToken: 'mock-access-token',
        },
      });
    }
    return HttpResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/auth/register`, async () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: mockUser,
        message: 'Registration successful. Please verify your email.',
      },
    });
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_URL}/auth/refresh`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'new-mock-access-token',
      },
    });
  }),

  // User endpoints
  http.get(`${API_URL}/users/me`, () => {
    return HttpResponse.json({
      success: true,
      data: mockUser,
    });
  }),

  // Trips endpoints
  http.get(`${API_URL}/trips`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    let filteredTrips = mockTrips;
    if (status) {
      filteredTrips = mockTrips.filter((t) => t.status === status);
    }
    return HttpResponse.json({
      success: true,
      data: {
        trips: filteredTrips,
        total: filteredTrips.length,
      },
    });
  }),

  http.get(`${API_URL}/trips/:id`, ({ params }) => {
    const trip = mockTrips.find((t) => t.id === params.id);
    if (trip) {
      return HttpResponse.json({
        success: true,
        data: trip,
      });
    }
    return HttpResponse.json(
      { success: false, message: 'Trip not found' },
      { status: 404 }
    );
  }),

  // Centers endpoints
  http.get(`${API_URL}/centers`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        centers: mockCenters,
        total: mockCenters.length,
      },
    });
  }),

  http.get(`${API_URL}/centers/:id`, ({ params }) => {
    const center = mockCenters.find((c) => c.id === params.id);
    if (center) {
      return HttpResponse.json({
        success: true,
        data: center,
      });
    }
    return HttpResponse.json(
      { success: false, message: 'Center not found' },
      { status: 404 }
    );
  }),

  // Bookings endpoints
  http.get(`${API_URL}/trips/bookings/my`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        bookings: [],
        total: 0,
      },
    });
  }),

  http.post(`${API_URL}/trips/:tripId/bookings`, async () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'booking-new',
        tripId: 'trip-1',
        userId: 'user-1',
        status: 'pending_payment',
        numberOfDivers: 1,
        totalPriceSar: 350,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }),
];
