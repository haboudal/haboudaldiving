import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Search,
  Filter,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { centerOwnerApi } from '@/api/centers';
import { formatPrice } from '@/lib/utils';
import type { Booking, BookingStatus } from '@/types';

const useCenterId = () => 'mock-center-id';

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-red-100 text-red-700',
};

const statusIcons: Record<BookingStatus, React.ElementType> = {
  pending: Clock,
  confirmed: CheckCircle,
  checked_in: UserCheck,
  completed: CheckCircle,
  cancelled: XCircle,
  no_show: XCircle,
};

export function ManageBookingsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const centerId = useCenterId();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['center-bookings', centerId, statusFilter],
    queryFn: () => centerOwnerApi.getCenterBookings(centerId, {
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const checkInMutation = useMutation({
    mutationFn: (bookingId: string) => centerOwnerApi.checkInBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-bookings'] });
    },
  });

  const bookings = data?.bookings || [];
  const filteredBookings = bookings.filter(booking =>
    (booking.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (booking.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    booking.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group bookings by trip
  const bookingsByTrip = filteredBookings.reduce((acc, booking) => {
    const tripId = booking.tripId;
    if (!acc[tripId]) {
      acc[tripId] = {
        tripTitle: booking.tripTitle || 'Unknown Trip',
        bookings: [],
      };
    }
    acc[tripId].bookings.push(booking);
    return acc;
  }, {} as Record<string, { tripTitle: string; bookings: Booking[] }>);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('centerOwner.manageBookings', 'Manage Bookings')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('centerOwner.bookingsDescription', 'View and manage all bookings for your trips')}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('centerOwner.pending', 'Pending')}</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('centerOwner.confirmed', 'Confirmed')}</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('centerOwner.checkedIn', 'Checked In')}</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'checked_in').length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('centerOwner.totalRevenue', 'Total Revenue')}</p>
                <p className="text-2xl font-bold">
                  {formatPrice(bookings.reduce((sum, b) => sum + (b.status !== 'cancelled' ? b.totalAmountSar : 0), 0))}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('centerOwner.searchBookings', 'Search by name, email, or booking #...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="me-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                <SelectItem value="pending">{t('bookings.status.pending', 'Pending')}</SelectItem>
                <SelectItem value="confirmed">{t('bookings.status.confirmed', 'Confirmed')}</SelectItem>
                <SelectItem value="checked_in">{t('bookings.status.checkedIn', 'Checked In')}</SelectItem>
                <SelectItem value="completed">{t('bookings.status.completed', 'Completed')}</SelectItem>
                <SelectItem value="cancelled">{t('bookings.status.cancelled', 'Cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {t('centerOwner.noBookings', 'No bookings found')}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? t('centerOwner.noBookingsFilter', 'Try adjusting your filters')
                : t('centerOwner.noBookingsYet', 'Bookings will appear here once divers book your trips')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(bookingsByTrip).map(([tripId, { tripTitle, bookings: tripBookings }]) => (
            <Card key={tripId}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {tripTitle}
                  </div>
                  <span className="text-sm font-normal text-muted-foreground">
                    {tripBookings.length} {tripBookings.length === 1 ? 'booking' : 'bookings'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {tripBookings.map((booking) => {
                    const StatusIcon = statusIcons[booking.status];
                    const isExpanded = expandedBooking === booking.id;

                    return (
                      <div key={booking.id} className="py-4 first:pt-0 last:pb-0">
                        <div
                          className="flex cursor-pointer items-center justify-between"
                          onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              <Users className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{booking.userName || 'Guest'}</p>
                              <p className="text-sm text-muted-foreground">
                                #{booking.bookingNumber} · {booking.numberOfDivers} {booking.numberOfDivers === 1 ? 'diver' : 'divers'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[booking.status]}`}>
                              <StatusIcon className="h-3 w-3" />
                              {booking.status.replace('_', ' ')}
                            </span>
                            <p className="font-medium">{formatPrice(booking.totalAmountSar)}</p>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 rounded-lg bg-muted/50 p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <h4 className="mb-2 font-medium">{t('centerOwner.contactInfo', 'Contact Info')}</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    {booking.userEmail || 'No email'}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    {t('common.notProvided', 'Not provided')}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="mb-2 font-medium">{t('centerOwner.bookingDetails', 'Booking Details')}</h4>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>{t('bookings.basePrice', 'Base')}: {formatPrice(booking.basePriceSar)}</p>
                                  {booking.equipmentRentalSar > 0 && (
                                    <p>{t('bookings.equipment', 'Equipment')}: {formatPrice(booking.equipmentRentalSar)}</p>
                                  )}
                                  {booking.vatAmountSar > 0 && (
                                    <p>{t('bookings.vat', 'VAT')}: {formatPrice(booking.vatAmountSar)}</p>
                                  )}
                                </div>
                              </div>

                              {booking.specialRequests && (
                                <div className="sm:col-span-2">
                                  <h4 className="mb-2 font-medium">{t('bookings.specialRequests', 'Special Requests')}</h4>
                                  <p className="text-sm text-muted-foreground">{booking.specialRequests}</p>
                                </div>
                              )}

                              <div className="sm:col-span-2">
                                <h4 className="mb-2 font-medium">{t('centerOwner.status', 'Status')}</h4>
                                <div className="flex flex-wrap gap-2 text-sm">
                                  <span className={`rounded px-2 py-0.5 ${booking.waiverSignedAt ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {booking.waiverSignedAt ? t('bookings.waiverSigned', 'Waiver Signed') : t('bookings.waiverPending', 'Waiver Pending')}
                                  </span>
                                  {booking.parentConsentRequired && (
                                    <span className={`rounded px-2 py-0.5 ${booking.parentConsentGivenAt ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {booking.parentConsentGivenAt ? t('bookings.consentGiven', 'Parent Consent Given') : t('bookings.consentPending', 'Consent Pending')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 flex gap-2">
                              {booking.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    checkInMutation.mutate(booking.id);
                                  }}
                                  disabled={checkInMutation.isPending}
                                >
                                  {checkInMutation.isPending ? (
                                    <Loader2 className="me-1 h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserCheck className="me-1 h-4 w-4" />
                                  )}
                                  {t('centerOwner.checkIn', 'Check In')}
                                </Button>
                              )}
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/my-bookings/${booking.id}`}>
                                  {t('common.viewDetails', 'View Details')}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
