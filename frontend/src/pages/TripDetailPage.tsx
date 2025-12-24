import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Anchor,
  Ship,
  User,
  Waves,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tripsApi } from '@/api/trips';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';
import { useUIStore, useAuthStore } from '@/store';

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getById(id!),
    enabled: !!id,
  });

  const { data: eligibility } = useQuery({
    queryKey: ['trip-eligibility', id],
    queryFn: () => tripsApi.checkEligibility(id!),
    enabled: !!id && isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">{t('common.error')}</h2>
          <p className="mt-2 text-muted-foreground">{t('common.errorLoading')}</p>
          <Button asChild className="mt-4">
            <Link to="/trips">{t('common.back')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const title = language === 'ar' && trip.titleAr ? trip.titleAr : trip.titleEn;
  const description = language === 'ar' && trip.descriptionAr ? trip.descriptionAr : trip.descriptionEn;
  const meetingPoint = language === 'ar' && trip.meetingPointAr ? trip.meetingPointAr : trip.meetingPointEn;

  const spotsLeft = trip.maxParticipants - trip.currentParticipants;
  const isFull = spotsLeft <= 0;

  const departure = new Date(trip.departureDatetime);
  const returnTime = new Date(trip.returnDatetime);
  const durationHours = Math.round((returnTime.getTime() - departure.getTime()) / (1000 * 60 * 60));

  return (
    <div className="container py-8">
      {/* Back link */}
      <Link
        to="/trips"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="me-2 h-4 w-4" />
        {t('common.back')} {t('trips.title')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Hero image */}
          <div className="relative h-64 overflow-hidden rounded-lg bg-gradient-to-br from-ocean-400 to-ocean-600 md:h-80">
            <div className="flex h-full items-center justify-center">
              <Anchor className="h-20 w-20 text-white/30" />
            </div>
            <div className="absolute start-4 top-4 rounded bg-primary px-3 py-1 text-sm font-medium text-white">
              {t(`trips.tripTypes.${trip.tripType}`)}
            </div>
            {isFull && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="rounded-full bg-destructive px-6 py-2 text-lg font-semibold text-white">
                  {t('trips.full')}
                </span>
              </div>
            )}
          </div>

          {/* Title and description */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold">{title}</h1>
            {trip.centerName && (
              <p className="mt-2 text-lg text-muted-foreground">{trip.centerName}</p>
            )}
            {description && (
              <p className="mt-4 text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Trip details */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>{t('trips.details.departure')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('trips.details.departure')}</p>
                    <p className="font-medium">
                      {formatDate(trip.departureDatetime)} - {formatTime(trip.departureDatetime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('trips.details.return')}</p>
                    <p className="font-medium">
                      {formatDate(trip.returnDatetime)} - {formatTime(trip.returnDatetime)}
                    </p>
                  </div>
                </div>
                {meetingPoint && (
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('trips.details.meetingPoint')}</p>
                      <p className="font-medium">{meetingPoint}</p>
                    </div>
                  </div>
                )}
                {trip.siteName && (
                  <div className="flex items-center gap-3">
                    <Waves className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('trips.details.diveSite')}</p>
                      <p className="font-medium">{trip.siteName}</p>
                    </div>
                  </div>
                )}
                {trip.vesselName && (
                  <div className="flex items-center gap-3">
                    <Ship className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vessel</p>
                      <p className="font-medium">{trip.vesselName}</p>
                    </div>
                  </div>
                )}
                {trip.leadInstructorName && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('trips.details.leadInstructor')}</p>
                      <p className="font-medium">{trip.leadInstructorName}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* What's included */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('trips.includes.equipment').replace(' Included', '')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  {trip.includesEquipment ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={trip.includesEquipment ? '' : 'text-muted-foreground'}>
                    {t('trips.includes.equipment')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {trip.includesMeals ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={trip.includesMeals ? '' : 'text-muted-foreground'}>
                    {t('trips.includes.meals')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {trip.includesRefreshments ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={trip.includesRefreshments ? '' : 'text-muted-foreground'}>
                    {t('trips.includes.refreshments')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>{t('trips.details.numberOfDives', { count: trip.numberOfDives })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('trips.requirements.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {trip.minCertificationLevel && (
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {t('trips.requirements.certification', { level: trip.minCertificationLevel })}
                  </li>
                )}
                {trip.minLoggedDives > 0 && (
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {t('trips.requirements.minDives', { count: trip.minLoggedDives })}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  {t('trips.requirements.ageRange', {
                    min: trip.minAge,
                    max: trip.maxAge || 99,
                  })}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Booking card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-baseline justify-between">
                <CardTitle className="text-2xl">
                  {formatPrice(trip.pricePerPersonSar)}
                </CardTitle>
                <span className="text-muted-foreground">/ {t('trips.perPerson')}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('trips.details.departure')}</span>
                  <span className="font-medium">{formatDate(trip.departureDatetime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{durationHours} {t('common.hours')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Spots</span>
                  <span className="font-medium">
                    {spotsLeft} / {trip.maxParticipants}
                  </span>
                </div>
              </div>

              {/* Eligibility status */}
              {isAuthenticated && eligibility && (
                <div
                  className={`rounded-lg p-3 ${
                    eligibility.eligible
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {eligibility.eligible ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">You're eligible for this trip</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Not eligible</span>
                      </div>
                      <ul className="mt-2 text-xs">
                        {eligibility.reasons.map((reason, i) => (
                          <li key={i}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {isFull ? (
                <Button className="w-full" variant="secondary">
                  {t('trips.joinWaitlist')}
                </Button>
              ) : isAuthenticated ? (
                <Button asChild className="w-full" disabled={eligibility && !eligibility.eligible}>
                  <Link to={`/trips/${trip.id}/book`}>{t('trips.bookNow')}</Link>
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link to={`/login?redirect=/trips/${trip.id}/book`}>{t('auth.login')} to Book</Link>
                </Button>
              )}

              {trip.cancellationPolicy && (
                <p className="text-xs text-muted-foreground">
                  {trip.cancellationPolicy}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
