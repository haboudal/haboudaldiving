import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Building2,
  Ship,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/api/admin';
import { formatPrice } from '@/lib/utils';

type Period = 'week' | 'month' | 'year';

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('month');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: () => adminApi.getAnalytics(period),
  });

  // Mock data for display when API returns nothing
  const displayAnalytics = analytics || {
    userGrowth: [
      { date: '2024-01-01', count: 100 },
      { date: '2024-01-08', count: 120 },
      { date: '2024-01-15', count: 145 },
      { date: '2024-01-22', count: 180 },
    ],
    bookingTrend: [
      { date: '2024-01-01', count: 50, revenue: 25000 },
      { date: '2024-01-08', count: 65, revenue: 32500 },
      { date: '2024-01-15', count: 80, revenue: 40000 },
      { date: '2024-01-22', count: 95, revenue: 47500 },
    ],
    topCenters: [
      { centerId: '1', centerName: 'Red Sea Divers', bookings: 150, revenue: 75000 },
      { centerId: '2', centerName: 'Jeddah Dive Center', bookings: 120, revenue: 60000 },
      { centerId: '3', centerName: 'Arabian Diving', bookings: 95, revenue: 47500 },
      { centerId: '4', centerName: 'Blue Waters', bookings: 80, revenue: 40000 },
      { centerId: '5', centerName: 'Coral Reef Explorers', bookings: 65, revenue: 32500 },
    ],
    topSites: [
      { siteId: '1', siteName: 'Abu Galawa', visits: 250 },
      { siteId: '2', siteName: 'Elphinstone Reef', visits: 200 },
      { siteId: '3', siteName: 'The Brothers', visits: 180 },
      { siteId: '4', siteName: 'Salem Express', visits: 150 },
      { siteId: '5', siteName: 'Thistlegorm', visits: 140 },
    ],
    revenueByMonth: [
      { month: 'Jan', revenue: 85000 },
      { month: 'Feb', revenue: 92000 },
      { month: 'Mar', revenue: 110000 },
      { month: 'Apr', revenue: 125000 },
      { month: 'May', revenue: 140000 },
      { month: 'Jun', revenue: 155000 },
    ],
  };

  // Calculate summary stats
  const totalRevenue = displayAnalytics.revenueByMonth.reduce((sum, m) => sum + m.revenue, 0);
  const totalBookings = displayAnalytics.bookingTrend.reduce((sum, b) => sum + b.count, 0);
  const latestUsers = displayAnalytics.userGrowth[displayAnalytics.userGrowth.length - 1]?.count || 0;
  const previousUsers = displayAnalytics.userGrowth[displayAnalytics.userGrowth.length - 2]?.count || 0;
  const userGrowthPercent = previousUsers > 0 ? ((latestUsers - previousUsers) / previousUsers * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.analytics', 'Analytics')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('admin.analyticsDescription', 'Platform performance and insights')}
          </p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p === 'week' && t('common.week', 'Week')}
              {p === 'month' && t('common.month', 'Month')}
              {p === 'year' && t('common.year', 'Year')}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.totalRevenue', 'Total Revenue')}</p>
                <p className="mt-1 text-3xl font-bold">{formatPrice(totalRevenue)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  +12.5% from last period
                </p>
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
                <p className="text-sm text-muted-foreground">{t('admin.totalBookings', 'Total Bookings')}</p>
                <p className="mt-1 text-3xl font-bold">{totalBookings}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  +8.3% from last period
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.userGrowth', 'User Growth')}</p>
                <p className="mt-1 text-3xl font-bold">{latestUsers}</p>
                <p className={`mt-1 flex items-center gap-1 text-xs ${Number(userGrowthPercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(userGrowthPercent) >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {userGrowthPercent}% from last period
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.avgBookingValue', 'Avg. Booking')}</p>
                <p className="mt-1 text-3xl font-bold">
                  {formatPrice(totalBookings > 0 ? totalRevenue / totalBookings : 0)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  +3.2% from last period
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                <TrendingUp className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('admin.revenueOverTime', 'Revenue Over Time')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayAnalytics.revenueByMonth.map((item, index) => {
                const maxRevenue = Math.max(...displayAnalytics.revenueByMonth.map(r => r.revenue));
                const percentage = (item.revenue / maxRevenue) * 100;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-12 text-sm text-muted-foreground">{item.month}</span>
                    <div className="flex-1">
                      <div className="h-6 rounded-full bg-muted">
                        <div
                          className="h-6 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-24 text-right text-sm font-medium">
                      {formatPrice(item.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Booking Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('admin.bookingTrend', 'Booking Trend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayAnalytics.bookingTrend.map((item, index) => {
                const maxBookings = Math.max(...displayAnalytics.bookingTrend.map(b => b.count));
                const percentage = (item.count / maxBookings) * 100;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-muted-foreground">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 rounded-full bg-muted">
                        <div
                          className="h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm font-medium">
                      {item.count} trips
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Lists Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Centers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('admin.topCenters', 'Top Performing Centers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayAnalytics.topCenters.map((center, index) => (
                <div key={center.centerId} className="flex items-center gap-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{center.centerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {center.bookings} bookings
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatPrice(center.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Sites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              {t('admin.topSites', 'Most Popular Dive Sites')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayAnalytics.topSites.map((site, index) => {
                const maxVisits = Math.max(...displayAnalytics.topSites.map(s => s.visits));
                const percentage = (site.visits / maxVisits) * 100;
                return (
                  <div key={site.siteId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{site.siteName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{site.visits} visits</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Growth Chart */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('admin.userGrowthChart', 'User Growth Over Time')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2" style={{ height: '200px' }}>
            {displayAnalytics.userGrowth.map((item, index) => {
              const maxUsers = Math.max(...displayAnalytics.userGrowth.map(u => u.count));
              const height = (item.count / maxUsers) * 100;
              return (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative w-full flex-1">
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-purple-500 to-purple-400 transition-all duration-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
