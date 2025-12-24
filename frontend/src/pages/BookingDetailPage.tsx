import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  ArrowLeft,
  Ship,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { bookingsApi, tripsApi } from '@/api/trips';
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils';
import type { BookingStatus } from '@/types';

const statusConfig: Record<BookingStatus, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  pending: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  confirmed: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  checked_in: { icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { icon: CheckCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  cancelled: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  no_show: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isArabic = i18n.language === 'ar';
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getById(id!),
    enabled: !!id,
  });

  const { data: trip } = useQuery({
    queryKey: ['trip', booking?.tripId],
    queryFn: () => tripsApi.getById(booking!.tripId),
    enabled: !!booking?.tripId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(id!, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setShowCancelConfirm(false);
    },
  });

  const waiverMutation = useMutation({
    mutationFn: () => bookingsApi.signWaiver(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">{t('bookings.notFound', 'Booking not found')}</h2>
        <Button asChild className="mt-4">
          <Link to="/my-bookings">{t('bookings.backToList', 'Back to my bookings')}</Link>
        </Button>
      </div>
    );
  }

  const StatusIcon = statusConfig[booking.status].icon;
  const tripTitle = trip ? (isArabic ? trip.titleAr || trip.titleEn : trip.titleEn) : booking.tripTitle;
  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const needsWaiver = !booking.waiverSignedAt && ['pending', 'confirmed'].includes(booking.status);

  return (
    <div className="container py-8">
      {/* Back link */}
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/my-bookings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('bookings.backToList', 'Back to my bookings')}
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                statusConfig[booking.status].bgColor
              } ${statusConfig[booking.status].color}`}
            >
              <StatusIcon className="h-4 w-4" />
              {t(`bookings.status.${booking.status}`)}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{tripTitle}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('bookings.bookingNumber', { number: booking.bookingNumber })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{t('bookings.total', 'Total')}</p>
          <p className="text-2xl font-bold text-primary">{formatPrice(booking.totalAmountSar)}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Details */}
          {trip && (
            <Card>
              <CardHeader>
                <CardTitle>{t('bookings.tripDetails', 'Trip Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">{t('trips.departure', 'Departure')}</Label>
                      <p className="font-medium">{formatDateTime(trip.departureDatetime)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">{t('trips.return', 'Return')}</Label>
                      <p className="font-medium">{formatDateTime(trip.returnDatetime)}</p>
                    </div>
                  </div>
                  {trip.meetingPointEn && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground">{t('trips.meetingPoint', 'Meeting Point')}</Label>
                        <p className="font-medium">
                          {isArabic ? trip.meetingPointAr || trip.meetingPointEn : trip.meetingPointEn}
                        </p>
                      </div>
                    </div>
                  )}
                  {trip.siteName && (
                    <div className="flex items-start gap-3">
                      <Ship className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground">{t('trips.diveSite', 'Dive Site')}</Label>
                        <p className="font-medium">{trip.siteName}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Button asChild variant="outline">
                    <Link to={`/trips/${trip.id}`}>{t('bookings.viewTrip', 'View Trip Details')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t('bookings.details', 'Booking Details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">{t('bookings.numberOfDivers', 'Number of Divers')}</Label>
                  <p className="flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4" />
                    {booking.numberOfDivers}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('bookings.bookedOn', 'Booked On')}</Label>
                  <p className="font-medium">{formatDateTime(booking.createdAt)}</p>
                </div>
              </div>

              {booking.equipmentSizes && Object.keys(booking.equipmentSizes).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">{t('bookings.equipment', 'Equipment Rental')}</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {booking.equipmentSizes.wetsuit && (
                      <span className="rounded-full bg-muted px-2 py-1 text-sm">
                        Wetsuit: {booking.equipmentSizes.wetsuit}
                      </span>
                    )}
                    {booking.equipmentSizes.bcd && (
                      <span className="rounded-full bg-muted px-2 py-1 text-sm">
                        BCD: {booking.equipmentSizes.bcd}
                      </span>
                    )}
                    {booking.equipmentSizes.fins && (
                      <span className="rounded-full bg-muted px-2 py-1 text-sm">
                        Fins: {booking.equipmentSizes.fins}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {booking.specialRequests && (
                <div>
                  <Label className="text-muted-foreground">{t('bookings.specialRequests', 'Special Requests')}</Label>
                  <p className="mt-1">{booking.specialRequests}</p>
                </div>
              )}

              {booking.dietaryRequirements && (
                <div>
                  <Label className="text-muted-foreground">{t('bookings.dietary', 'Dietary Requirements')}</Label>
                  <p className="mt-1">{booking.dietaryRequirements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waiver */}
          {needsWaiver && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <FileText className="h-5 w-5" />
                  {t('bookings.waiverRequired', 'Liability Waiver Required')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-amber-700">
                  {t('bookings.waiverDescription', 'You must sign the liability waiver before your trip.')}
                </p>
                <Button onClick={() => waiverMutation.mutate()} disabled={waiverMutation.isPending}>
                  {waiverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('bookings.signWaiver', 'Sign Waiver')}
                </Button>
              </CardContent>
            </Card>
          )}

          {booking.waiverSignedAt && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>{t('bookings.waiverSigned', 'Waiver signed on')} {formatDate(booking.waiverSignedAt)}</span>
            </div>
          )}

          {/* Cancel */}
          {canCancel && (
            <Card>
              <CardHeader>
                <CardTitle>{t('bookings.cancelBooking', 'Cancel Booking')}</CardTitle>
              </CardHeader>
              <CardContent>
                {!showCancelConfirm ? (
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    {t('bookings.cancelBooking', 'Cancel Booking')}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t('bookings.cancelWarning', 'Are you sure you want to cancel? This action cannot be undone.')}
                    </p>
                    <div>
                      <Label htmlFor="cancelReason">{t('bookings.cancelReason', 'Reason (optional)')}</Label>
                      <textarea
                        id="cancelReason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Why are you cancelling?"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('bookings.confirmCancel', 'Yes, Cancel Booking')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                        {t('common.back', 'Go Back')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {booking.cancellationReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">{t('bookings.cancelled', 'Booking Cancelled')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700">
                  {t('bookings.cancelledOn', 'Cancelled on')} {formatDate(booking.cancelledAt!)}
                </p>
                {booking.cancellationReason && (
                  <p className="mt-2 text-sm">{t('bookings.reason', 'Reason')}: {booking.cancellationReason}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>{t('bookings.priceBreakdown', 'Price Breakdown')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('bookings.basePrice', 'Base Price')}</span>
                <span>{formatPrice(booking.basePriceSar)}</span>
              </div>
              {booking.equipmentRentalSar > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('bookings.equipmentRental', 'Equipment Rental')}</span>
                  <span>{formatPrice(booking.equipmentRentalSar)}</span>
                </div>
              )}
              {booking.conservationFeeSar > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('bookings.conservationFee', 'Conservation Fee')}</span>
                  <span>{formatPrice(booking.conservationFeeSar)}</span>
                </div>
              )}
              {booking.insuranceFeeSar > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('bookings.insurance', 'Insurance')}</span>
                  <span>{formatPrice(booking.insuranceFeeSar)}</span>
                </div>
              )}
              {booking.platformFeeSar > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('bookings.platformFee', 'Platform Fee')}</span>
                  <span>{formatPrice(booking.platformFeeSar)}</span>
                </div>
              )}
              {booking.vatAmountSar > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('bookings.vat', 'VAT (15%)')}</span>
                  <span>{formatPrice(booking.vatAmountSar)}</span>
                </div>
              )}
              {booking.discountAmountSar > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('bookings.discount', 'Discount')}</span>
                  <span>-{formatPrice(booking.discountAmountSar)}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold">
                  <span>{t('bookings.total', 'Total')}</span>
                  <span className="text-primary">{formatPrice(booking.totalAmountSar)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Center Contact */}
          {booking.centerName && (
            <Card>
              <CardHeader>
                <CardTitle>{t('bookings.centerContact', 'Dive Center')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{booking.centerName}</p>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to={`/centers/${booking.centerId}`}>
                    {t('bookings.viewCenter', 'View Center')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {booking.status === 'pending' && (
            <Card className="border-primary">
              <CardContent className="p-4">
                <Button asChild className="w-full" size="lg">
                  <Link to={`/checkout/${booking.id}`}>
                    {t('bookings.payNow', 'Pay Now')} - {formatPrice(booking.totalAmountSar)}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {booking.status === 'completed' && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <Button asChild className="w-full">
                  <Link to={`/my-bookings/${booking.id}/review`}>
                    {t('bookings.writeReview', 'Write a Review')}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/dive-logs">
                    {t('bookings.logDive', 'Log Your Dive')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
