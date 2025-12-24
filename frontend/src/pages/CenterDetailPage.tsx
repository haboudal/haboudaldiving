import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  Loader2,
  Calendar,
  Users,
  Award,
  Shield,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { centersApi } from '@/api/centers';
import { tripsApi } from '@/api/trips';
import { reviewsApi } from '@/api/reviews';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Trip, Review } from '@/types';

export function CenterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const { data: center, isLoading, error } = useQuery({
    queryKey: ['center', id],
    queryFn: () => centersApi.getById(id!),
    enabled: !!id,
  });

  const { data: tripsData } = useQuery({
    queryKey: ['center-trips', id],
    queryFn: () => tripsApi.list({ centerId: id, status: 'published', limit: 6 }),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['center-reviews', id],
    queryFn: () => reviewsApi.getCenterReviews(id!, { limit: 5 }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !center) {
    return (
      <div className="container py-12 text-center">
        <h2 className="text-xl font-semibold">{t('centers.notFound', 'Center not found')}</h2>
        <Button asChild className="mt-4">
          <Link to="/centers">{t('centers.backToList', 'Back to centers')}</Link>
        </Button>
      </div>
    );
  }

  const name = isArabic ? center.nameAr || center.nameEn : center.nameEn;
  const description = isArabic
    ? center.descriptionAr || center.descriptionEn
    : center.descriptionEn;
  const address = isArabic ? center.addressAr || center.addressEn : center.addressEn;
  const trips = tripsData?.trips || [];
  const reviews = reviewsData?.reviews || [];
  const stats = reviewsData?.stats;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{name}</h1>
              {center.status === 'active' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  <Shield className="h-3 w-3" />
                  {t('centers.verified', 'Verified')}
                </span>
              )}
            </div>
            {center.city && (
              <p className="mt-2 flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {center.city}
                {address && ` - ${address}`}
              </p>
            )}
          </div>
          {center.ratingAverage > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-xl font-bold">{center.ratingAverage.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({center.totalReviews} {t('reviews.reviews', 'reviews')})
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {description && (
            <Card>
              <CardHeader>
                <CardTitle>{t('centers.about', 'About')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Trips */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('centers.upcomingTrips', 'Upcoming Trips')}</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/trips?centerId=${center.id}`}>
                  {t('common.viewAll', 'View all')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {trips.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  {t('centers.noTrips', 'No upcoming trips')}
                </p>
              ) : (
                <div className="space-y-4">
                  {trips.map((trip: Trip) => (
                    <TripRow key={trip.id} trip={trip} isArabic={isArabic} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('reviews.title', 'Reviews')}</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="mb-6 flex flex-wrap gap-6 rounded-lg bg-muted/50 p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</div>
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(stats.averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {stats.totalReviews} {t('reviews.reviews', 'reviews')}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="w-3 text-sm">{rating}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <div className="h-2 flex-1 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-yellow-400"
                            style={{
                              width: `${
                                stats.totalReviews > 0
                                  ? (stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] /
                                      stats.totalReviews) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-xs text-muted-foreground">
                          {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  {t('reviews.noReviews', 'No reviews yet')}
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review: Review) => (
                    <ReviewCard key={review.id} review={review} isArabic={isArabic} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('centers.contact', 'Contact')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {center.phoneEmergency && (
                <a
                  href={`tel:${center.phoneEmergency}`}
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                  {center.phoneEmergency}
                </a>
              )}
              {center.email && (
                <a
                  href={`mailto:${center.email}`}
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <Mail className="h-4 w-4" />
                  {center.email}
                </a>
              )}
              {center.website && (
                <a
                  href={center.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <Globe className="h-4 w-4" />
                  {t('centers.visitWebsite', 'Visit Website')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>

          {/* License Info */}
          {center.srsaLicenseNumber && (
            <Card>
              <CardHeader>
                <CardTitle>{t('centers.license', 'SRSA License')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{center.srsaLicenseNumber}</span>
                </div>
                {center.licenseExpiryDate && (
                  <p className="text-xs text-muted-foreground">
                    {t('centers.expiresOn', 'Expires')}: {formatDate(center.licenseExpiryDate)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-4">
              <Button asChild className="w-full">
                <Link to={`/trips?centerId=${center.id}`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {t('centers.browseTrips', 'Browse Trips')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TripRow({ trip, isArabic }: { trip: Trip; isArabic: boolean }) {
  const title = isArabic ? trip.titleAr || trip.titleEn : trip.titleEn;
  const spotsLeft = trip.maxParticipants - trip.currentParticipants;

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex-1">
        <h4 className="font-medium">{title}</h4>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(trip.departureDatetime)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {spotsLeft} spots left
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-primary">{formatPrice(trip.pricePerPersonSar)}</div>
        <ChevronRight className="ml-auto mt-1 h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function ReviewCard({ review, isArabic }: { review: Review; isArabic: boolean }) {
  const title = isArabic ? review.titleAr || review.titleEn : review.titleEn;
  const text = isArabic ? review.reviewTextAr || review.reviewTextEn : review.reviewTextEn;

  return (
    <div className="border-b pb-4 last:border-0">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{review.userName || 'Anonymous'}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= review.overallRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
        </div>
        {review.wouldRecommend && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            Recommends
          </span>
        )}
      </div>
      {title && <p className="mt-2 font-medium">{title}</p>}
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
