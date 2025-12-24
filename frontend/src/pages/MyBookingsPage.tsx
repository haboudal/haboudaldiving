import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Loader2,
  Anchor,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { bookingsApi } from '@/api/trips';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Booking, BookingStatus } from '@/types';

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  checked_in: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-red-100 text-red-800',
};

const statusTabs: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function MyBookingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-bookings', activeTab],
    queryFn: () =>
      bookingsApi.getMy({
        status: activeTab === 'all' ? undefined : activeTab,
      }),
  });

  const bookings = data?.bookings || [];

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">{t('bookings.title')}</h1>

      {/* Status tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.value)}
          >
            {t(`bookings.status.${tab.value}`, { defaultValue: tab.label })}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-destructive">{t('common.errorLoading')}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Anchor className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('bookings.noBookings')}</h3>
          <p className="mt-2 text-muted-foreground">{t('bookings.startExploring')}</p>
          <Button asChild className="mt-4">
            <Link to="/trips">{t('trips.title')}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: Booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const { t } = useTranslation();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <Link to={`/my-bookings/${booking.id}`} className="block p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    statusColors[booking.status]
                  }`}
                >
                  {t(`bookings.status.${booking.status}`)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('bookings.bookingNumber', { number: booking.bookingNumber })}
                </span>
              </div>

              <h3 className="font-semibold">
                {booking.tripTitle || 'Diving Trip'}
              </h3>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(booking.createdAt)}
                </span>
                {booking.centerName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {booking.centerName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-primary">
                  {formatPrice(booking.totalAmountSar)}
                </span>
                <span className="text-sm text-muted-foreground">
                  • {booking.numberOfDivers} {booking.numberOfDivers === 1 ? 'diver' : 'divers'}
                </span>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
