import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Ship,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Clock,
  AlertCircle,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { centerOwnerApi } from '@/api/centers';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';
import type { Trip, Booking } from '@/types';

// Mock center ID - in real app, get from user's associated center
const useCenterId = () => {
  // This would come from auth context or user profile
  return 'mock-center-id';
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  full: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-blue-100 text-blue-700',
};

export function CenterDashboardPage() {
  const { t } = useTranslation();
  const centerId = useCenterId();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['center-dashboard', centerId],
    queryFn: () => centerOwnerApi.getDashboardStats(centerId),
  });

  const { data: center } = useQuery({
    queryKey: ['my-center'],
    queryFn: () => centerOwnerApi.getMyCenter(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mock data for display when API returns error
  const displayStats = stats || {
    totalTrips: 24,
    activeTrips: 5,
    totalBookings: 156,
    pendingBookings: 8,
    revenue: { thisMonth: 45000, lastMonth: 38000, total: 450000 },
    upcomingTrips: [],
    recentBookings: [],
  };

  const revenueChange = displayStats.revenue.lastMonth > 0
    ? ((displayStats.revenue.thisMonth - displayStats.revenue.lastMonth) / displayStats.revenue.lastMonth) * 100
    : 0;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('centerOwner.dashboard', 'Center Dashboard')}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {center?.nameEn || t('centerOwner.welcomeBack', 'Welcome back to your dashboard')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/center/trips/new">
              <Plus className="me-2 h-4 w-4" />
              {t('centerOwner.createTrip', 'Create Trip')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('centerOwner.activeTrips', 'Active Trips')}
                </p>
                <p className="mt-1 text-3xl font-bold">{displayStats.activeTrips}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('centerOwner.ofTotal', 'of {{total}} total', { total: displayStats.totalTrips })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Ship className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('centerOwner.pendingBookings', 'Pending Bookings')}
                </p>
                <p className="mt-1 text-3xl font-bold">{displayStats.pendingBookings}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('centerOwner.totalBookings', '{{total}} total bookings', { total: displayStats.totalBookings })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('centerOwner.thisMonthRevenue', 'This Month')}
                </p>
                <p className="mt-1 text-3xl font-bold">{formatPrice(displayStats.revenue.thisMonth)}</p>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {revenueChange >= 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{revenueChange.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">{revenueChange.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('centerOwner.rating', 'Center Rating')}
                </p>
                <p className="mt-1 text-3xl font-bold">{center?.ratingAverage?.toFixed(1) || '4.8'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('centerOwner.reviews', '{{count}} reviews', { count: center?.totalReviews || 42 })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">{t('centerOwner.quickActions', 'Quick Actions')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/center/trips">
              <Calendar className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('centerOwner.manageTrips', 'Manage Trips')}</p>
                <p className="text-xs text-muted-foreground">{t('centerOwner.viewEditTrips', 'View and edit trips')}</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/center/bookings">
              <Users className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('centerOwner.manageBookings', 'Manage Bookings')}</p>
                <p className="text-xs text-muted-foreground">{t('centerOwner.checkInDivers', 'Check-in divers')}</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/center/staff">
              <Users className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('centerOwner.manageStaff', 'Manage Staff')}</p>
                <p className="text-xs text-muted-foreground">{t('centerOwner.instructorsAndCrew', 'Instructors & crew')}</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/center/reviews">
              <Star className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('centerOwner.reviews', 'Reviews')}</p>
                <p className="text-xs text-muted-foreground">{t('centerOwner.respondToReviews', 'Respond to feedback')}</p>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Upcoming Trips */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('centerOwner.upcomingTrips', 'Upcoming Trips')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/center/trips">
                {t('common.viewAll', 'View All')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {displayStats.upcomingTrips.length > 0 ? (
              <div className="space-y-4">
                {displayStats.upcomingTrips.slice(0, 5).map((trip: Trip) => (
                  <Link
                    key={trip.id}
                    to={`/center/trips/${trip.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{trip.titleEn}</p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(trip.departureDatetime)} at {formatTime(trip.departureDatetime)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[trip.status]}`}>
                        {trip.status}
                      </span>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {trip.currentParticipants}/{trip.maxParticipants} divers
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">
                  {t('centerOwner.noUpcomingTrips', 'No upcoming trips')}
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/center/trips/new">
                    <Plus className="me-2 h-4 w-4" />
                    {t('centerOwner.createFirstTrip', 'Create your first trip')}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('centerOwner.recentBookings', 'Recent Bookings')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/center/bookings">
                {t('common.viewAll', 'View All')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {displayStats.recentBookings.length > 0 ? (
              <div className="space-y-4">
                {displayStats.recentBookings.slice(0, 5).map((booking: Booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{booking.userName || 'Guest'}</p>
                      <p className="text-sm text-muted-foreground">{booking.tripTitle}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[booking.status]}`}>
                        {booking.status}
                      </span>
                      <p className="mt-1 text-sm font-medium">{formatPrice(booking.totalAmountSar)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">
                  {t('centerOwner.noRecentBookings', 'No recent bookings')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {displayStats.pendingBookings > 0 && (
        <Card className="mt-8 border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">
                {t('centerOwner.pendingBookingsAlert', 'You have {{count}} pending bookings', { count: displayStats.pendingBookings })}
              </p>
              <p className="text-sm text-yellow-700">
                {t('centerOwner.reviewBookings', 'Review and confirm bookings to ensure smooth operations')}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/center/bookings?status=pending">
                {t('common.review', 'Review')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
