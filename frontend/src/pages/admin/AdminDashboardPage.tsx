import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Users,
  Building2,
  Ship,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/api/admin';
import { formatPrice } from '@/lib/utils';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  pending_verification: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  deactivated: 'bg-gray-100 text-gray-700',
};

export function AdminDashboardPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboardStats(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mock data for display
  const displayStats = stats || {
    users: { total: 1250, active: 1100, pending: 85, suspended: 15, newThisMonth: 120 },
    centers: { total: 45, active: 38, pending: 5, suspended: 2 },
    trips: { total: 320, published: 85, completed: 210, cancelled: 25 },
    bookings: { total: 2800, thisMonth: 320, revenue: 850000, revenueThisMonth: 95000 },
    recentUsers: [],
    recentCenters: [],
    pendingCenters: [],
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('admin.dashboard', 'Admin Dashboard')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('admin.dashboardDescription', 'Platform overview and management')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.totalUsers', 'Total Users')}</p>
                <p className="mt-1 text-3xl font-bold">{displayStats.users.total.toLocaleString()}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <UserPlus className="h-3 w-3" />
                  +{displayStats.users.newThisMonth} this month
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.divingCenters', 'Diving Centers')}</p>
                <p className="mt-1 text-3xl font-bold">{displayStats.centers.total}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {displayStats.centers.active} active, {displayStats.centers.pending} pending
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.totalTrips', 'Total Trips')}</p>
                <p className="mt-1 text-3xl font-bold">{displayStats.trips.total}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {displayStats.trips.published} active, {displayStats.trips.completed} completed
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                <Ship className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.revenue', 'Total Revenue')}</p>
                <p className="mt-1 text-3xl font-bold">{formatPrice(displayStats.bookings.revenue)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  {formatPrice(displayStats.bookings.revenueThisMonth)} this month
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">{t('admin.quickActions', 'Quick Actions')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/admin/users">
              <Users className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('admin.manageUsers', 'Manage Users')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.viewAllUsers', 'View and manage all users')}</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/admin/centers">
              <Building2 className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('admin.manageCenters', 'Manage Centers')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.approveReject', 'Approve & manage centers')}</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/admin/analytics">
              <TrendingUp className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('admin.analytics', 'Analytics')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.viewReports', 'View platform reports')}</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" asChild>
            <Link to="/admin/moderation">
              <ShieldAlert className="me-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('admin.moderation', 'Moderation')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.reviewFlagged', 'Review flagged content')}</p>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Pending Centers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              {t('admin.pendingApprovals', 'Pending Approvals')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/centers?status=pending_verification">
                {t('common.viewAll', 'View All')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {displayStats.centers.pending > 0 ? (
              <div className="space-y-4">
                {displayStats.pendingCenters.length > 0 ? (
                  displayStats.pendingCenters.slice(0, 5).map((center) => (
                    <div
                      key={center.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{center.nameEn}</p>
                        <p className="text-sm text-muted-foreground">{center.city}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/admin/centers/${center.id}`}>Review</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-yellow-600" />
                    <p className="mt-2 font-medium text-yellow-800">
                      {displayStats.centers.pending} centers pending approval
                    </p>
                    <Button size="sm" className="mt-3" asChild>
                      <Link to="/admin/centers?status=pending_verification">
                        Review Now
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-2 text-muted-foreground">
                  {t('admin.noPending', 'No pending approvals')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t('admin.recentUsers', 'Recent Users')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/users">
                {t('common.viewAll', 'View All')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {displayStats.recentUsers.length > 0 ? (
              <div className="space-y-4">
                {displayStats.recentUsers.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[user.status] || statusColors.active}`}>
                      {user.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">
                  {t('admin.noRecentUsers', 'No recent user registrations')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Health */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('admin.platformHealth', 'Platform Health')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium">{t('admin.activeUsers', 'Active Users')}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{displayStats.users.active.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {((displayStats.users.active / displayStats.users.total) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="font-medium">{t('admin.pendingUsers', 'Pending Verification')}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{displayStats.users.pending}</p>
              <p className="text-xs text-muted-foreground">awaiting email verification</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="font-medium">{t('admin.suspendedUsers', 'Suspended')}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{displayStats.users.suspended}</p>
              <p className="text-xs text-muted-foreground">users suspended</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="font-medium">{t('admin.bookingsThisMonth', 'Bookings This Month')}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{displayStats.bookings.thisMonth}</p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(displayStats.bookings.revenueThisMonth)} revenue
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
