import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Ship,
  Calendar,
  ClipboardCheck,
  Star,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { instructorApi } from '@/api/instructor';
import { formatDate, formatTime } from '@/lib/utils';

export function InstructorDashboardPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['instructor-dashboard'],
    queryFn: () => instructorApi.getDashboardStats(),
  });

  const { data: upcomingTrips } = useQuery({
    queryKey: ['instructor-trips', 'upcoming'],
    queryFn: () => instructorApi.getMyTrips({ status: 'upcoming', limit: 5 }),
  });

  const { data: pendingVerifications } = useQuery({
    queryKey: ['instructor-pending-verifications'],
    queryFn: () => instructorApi.getPendingVerifications(1, 5),
  });

  // Mock data for display
  const displayStats = stats || {
    upcomingTrips: 5,
    completedTrips: 42,
    totalDivesSupervised: 156,
    pendingVerifications: 3,
    averageRating: 4.8,
    totalReviews: 28,
  };

  const displayTrips = upcomingTrips?.assignments || [];
  const displayVerifications = pendingVerifications?.diveLogs || [];

  if (statsLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('instructor.dashboard', 'Instructor Dashboard')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('instructor.dashboardDescription', 'Manage your trips, schedule, and dive log verifications')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('instructor.upcomingTrips', 'Upcoming Trips')}</p>
                <p className="mt-1 text-3xl font-bold">{displayStats.upcomingTrips}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Ship className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('instructor.completedTrips', 'Completed Trips')}</p>
                <p className="mt-1 text-3xl font-bold">{displayStats.completedTrips}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('instructor.pendingVerifications', 'Pending Verifications')}</p>
                <p className="mt-1 text-3xl font-bold">{displayStats.pendingVerifications}</p>
                {displayStats.pendingVerifications > 0 && (
                  <p className="mt-1 text-xs text-yellow-600">Awaiting your review</p>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <ClipboardCheck className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('instructor.rating', 'Your Rating')}</p>
                <p className="mt-1 text-3xl font-bold">{displayStats.averageRating.toFixed(1)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {displayStats.totalReviews} reviews
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">{t('instructor.quickActions', 'Quick Actions')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/instructor/trips">
              <Ship className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('instructor.myTrips', 'My Trips')}</p>
                <p className="text-xs text-muted-foreground">{t('instructor.viewAssignedTrips', 'View assigned trips')}</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/instructor/schedule">
              <Calendar className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('instructor.schedule', 'My Schedule')}</p>
                <p className="text-xs text-muted-foreground">{t('instructor.manageAvailability', 'Manage availability')}</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/instructor/verify-logs">
              <ClipboardCheck className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('instructor.verifyLogs', 'Verify Dive Logs')}</p>
                <p className="text-xs text-muted-foreground">
                  {displayStats.pendingVerifications} pending
                </p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/instructor/reviews">
              <Star className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('instructor.myReviews', 'My Reviews')}</p>
                <p className="text-xs text-muted-foreground">{t('instructor.viewFeedback', 'View diver feedback')}</p>
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
              <Clock className="h-5 w-5" />
              {t('instructor.upcomingTripsTitle', 'Upcoming Trips')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/instructor/trips">
                {t('common.viewAll', 'View All')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {displayTrips.length > 0 ? (
              <div className="space-y-4">
                {displayTrips.slice(0, 5).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{assignment.trip.titleEn}</p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(assignment.trip.departureDatetime)} at {formatTime(assignment.trip.departureDatetime)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        assignment.role === 'lead' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {assignment.role === 'lead' ? 'Lead' : 'Assistant'}
                      </span>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/trips/${assignment.tripId}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Ship className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">
                  {t('instructor.noUpcomingTrips', 'No upcoming trips assigned')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              {t('instructor.pendingVerificationsTitle', 'Pending Verifications')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/instructor/verify-logs">
                {t('common.viewAll', 'View All')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {displayVerifications.length > 0 ? (
              <div className="space-y-4">
                {displayVerifications.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50/50 p-3"
                  >
                    <div>
                      <p className="font-medium">{log.diverName}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.siteName || 'Dive'} - {formatDate(log.diveDate)}
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <Link to={`/instructor/verify-logs?id=${log.id}`}>Review</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-2 text-muted-foreground">
                  {t('instructor.noVerifications', 'No pending verifications')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('instructor.performanceSummary', 'Performance Summary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-3xl font-bold text-primary">{displayStats.totalDivesSupervised}</p>
              <p className="text-sm text-muted-foreground">{t('instructor.divesSupervised', 'Dives Supervised')}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-3xl font-bold text-primary">{displayStats.completedTrips}</p>
              <p className="text-sm text-muted-foreground">{t('instructor.tripsCompleted', 'Trips Completed')}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
                <span className="text-3xl font-bold">{displayStats.averageRating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('instructor.avgRating', 'Average Rating')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
