import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar,
  MapPin,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tripsApi } from '@/api/trips';
import { formatPrice, formatDate } from '@/lib/utils';
import { useUIStore } from '@/store';
import { getErrorMessage } from '@/api';
import type { CreateBookingDto, PriceBreakdown } from '@/types';

const bookingSchema = z.object({
  participantCount: z.number().min(1, 'At least 1 participant required').max(10),
  requiresEquipmentRental: z.boolean(),
  specialRequests: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  wetsuitSize: z.string().optional(),
  bcdSize: z.string().optional(),
  finsSize: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language } = useUIStore();
  const [error, setError] = useState<string | null>(null);

  const { data: trip, isLoading: loadingTrip } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getById(id!),
    enabled: !!id,
  });

  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      participantCount: 1,
      requiresEquipmentRental: false,
    },
  });

  const participantCount = watch('participantCount');
  const requiresEquipmentRental = watch('requiresEquipmentRental');

  // Calculate price when parameters change
  const calculatePriceMutation = useMutation({
    mutationFn: (dto: CreateBookingDto) => tripsApi.calculatePrice(id!, dto),
    onSuccess: (data) => setPriceBreakdown(data),
  });

  const createBookingMutation = useMutation({
    mutationFn: (dto: CreateBookingDto) => tripsApi.createBooking(id!, dto),
    onSuccess: (booking) => {
      navigate(`/my-bookings/${booking.id}`, { replace: true });
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  // Recalculate price when inputs change
  const handleRecalculatePrice = () => {
    if (!id) return;
    calculatePriceMutation.mutate({
      participantCount: participantCount || 1,
      requiresEquipmentRental,
    });
  };

  const onSubmit = async (data: BookingFormData) => {
    setError(null);
    const dto: CreateBookingDto = {
      participantCount: data.participantCount,
      requiresEquipmentRental: data.requiresEquipmentRental,
      specialRequests: data.specialRequests,
      dietaryRequirements: data.dietaryRequirements,
      equipmentSizes: data.requiresEquipmentRental
        ? {
            wetsuit: data.wetsuitSize,
            bcd: data.bcdSize,
            fins: data.finsSize,
          }
        : undefined,
    };
    createBookingMutation.mutate(dto);
  };

  if (loadingTrip) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">{t('common.error')}</h2>
          <Button asChild className="mt-4">
            <Link to="/trips">{t('common.back')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const title = language === 'ar' && trip.titleAr ? trip.titleAr : trip.titleEn;
  const spotsLeft = trip.maxParticipants - trip.currentParticipants;

  return (
    <div className="container py-8">
      {/* Back link */}
      <Link
        to={`/trips/${id}`}
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="me-2 h-4 w-4" />
        {t('common.back')}
      </Link>

      <h1 className="mb-8 text-2xl font-bold">{t('trips.bookNow')}</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Booking Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                {error}
              </div>
            )}

            {/* Trip summary */}
            <Card>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(trip.departureDatetime)}
                  </span>
                  {trip.siteName && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {trip.siteName}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Number of participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="participantCount">Number of Divers</Label>
                  <Input
                    id="participantCount"
                    type="number"
                    min={1}
                    max={Math.min(10, spotsLeft)}
                    {...register('participantCount', { valueAsNumber: true })}
                    onBlur={handleRecalculatePrice}
                  />
                  {errors.participantCount && (
                    <p className="text-sm text-destructive">{errors.participantCount.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {t('trips.spotsLeft', { count: spotsLeft })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Equipment rental */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('bookings.equipmentRental')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requiresEquipmentRental"
                    {...register('requiresEquipmentRental')}
                    onChange={(e) => {
                      register('requiresEquipmentRental').onChange(e);
                      setTimeout(handleRecalculatePrice, 0);
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="requiresEquipmentRental">
                    I need to rent diving equipment
                    {trip.equipmentRentalPriceSar && (
                      <span className="text-muted-foreground">
                        {' '}
                        (+{formatPrice(trip.equipmentRentalPriceSar)} / person)
                      </span>
                    )}
                  </Label>
                </div>

                {requiresEquipmentRental && (
                  <div className="grid gap-4 rounded-lg bg-muted p-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="wetsuitSize">Wetsuit Size</Label>
                      <select
                        id="wetsuitSize"
                        {...register('wetsuitSize')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select size</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bcdSize">BCD Size</Label>
                      <select
                        id="bcdSize"
                        {...register('bcdSize')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select size</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="finsSize">Fins Size</Label>
                      <select
                        id="finsSize"
                        {...register('finsSize')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select size</option>
                        <option value="36-38">36-38</option>
                        <option value="39-41">39-41</option>
                        <option value="42-44">42-44</option>
                        <option value="45-47">45-47</option>
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Special requests */}
            <Card>
              <CardHeader>
                <CardTitle>{t('bookings.specialRequests')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialRequests">Special Requests (optional)</Label>
                  <textarea
                    id="specialRequests"
                    {...register('specialRequests')}
                    rows={3}
                    placeholder="Any special requirements or notes..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dietaryRequirements">Dietary Requirements (optional)</Label>
                  <Input
                    id="dietaryRequirements"
                    {...register('dietaryRequirements')}
                    placeholder="e.g., Vegetarian, Halal, allergies..."
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createBookingMutation.isPending}
            >
              {createBookingMutation.isPending && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              {t('trips.bookNow')}
            </Button>
          </form>
        </div>

        {/* Price Breakdown Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>{t('bookings.priceBreakdown.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {priceBreakdown ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{t('bookings.priceBreakdown.basePrice')}</span>
                      <span>{formatPrice(priceBreakdown.basePriceSar)}</span>
                    </div>
                    {priceBreakdown.equipmentRentalSar > 0 && (
                      <div className="flex justify-between">
                        <span>{t('bookings.priceBreakdown.equipment')}</span>
                        <span>{formatPrice(priceBreakdown.equipmentRentalSar)}</span>
                      </div>
                    )}
                    {priceBreakdown.conservationFeeSar > 0 && (
                      <div className="flex justify-between">
                        <span>{t('bookings.priceBreakdown.conservation')}</span>
                        <span>{formatPrice(priceBreakdown.conservationFeeSar)}</span>
                      </div>
                    )}
                    {priceBreakdown.insuranceFeeSar > 0 && (
                      <div className="flex justify-between">
                        <span>{t('bookings.priceBreakdown.insurance')}</span>
                        <span>{formatPrice(priceBreakdown.insuranceFeeSar)}</span>
                      </div>
                    )}
                    {priceBreakdown.platformFeeSar > 0 && (
                      <div className="flex justify-between">
                        <span>{t('bookings.priceBreakdown.platformFee')}</span>
                        <span>{formatPrice(priceBreakdown.platformFeeSar)}</span>
                      </div>
                    )}
                    {priceBreakdown.vatAmountSar > 0 && (
                      <div className="flex justify-between">
                        <span>{t('bookings.priceBreakdown.vat')}</span>
                        <span>{formatPrice(priceBreakdown.vatAmountSar)}</span>
                      </div>
                    )}
                    {priceBreakdown.discountAmountSar > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{t('bookings.priceBreakdown.discount')}</span>
                        <span>-{formatPrice(priceBreakdown.discountAmountSar)}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>{t('bookings.priceBreakdown.total')}</span>
                      <span>{formatPrice(priceBreakdown.totalAmountSar)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('bookings.priceBreakdown.basePrice')}</span>
                    <span>
                      {formatPrice(trip.pricePerPersonSar * (participantCount || 1))}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Estimated Total</span>
                      <span>
                        {formatPrice(trip.pricePerPersonSar * (participantCount || 1))}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Final price will include conservation fees and VAT
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleRecalculatePrice}
                disabled={calculatePriceMutation.isPending}
              >
                {calculatePriceMutation.isPending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="me-2 h-4 w-4" />
                )}
                Calculate Price
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
