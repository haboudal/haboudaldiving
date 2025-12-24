import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  Loader2,
  MessageSquare,
  Calendar,
  ThumbsUp,
  Edit,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { reviewsApi } from '@/api/reviews';
import { formatDate } from '@/lib/utils';
import type { Review } from '@/types';

export function MyReviewsPage() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewsApi.getMyReviews(),
  });

  const { data: pendingReviews, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: () => reviewsApi.getPendingReviews(),
  });

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('reviews.myReviews', 'My Reviews')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('reviews.myReviewsSubtitle', 'Manage your reviews and write new ones')}
        </p>
      </div>

      {/* Pending Reviews */}
      {pendingLoading ? (
        <div className="mb-8 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : pendingReviews && pendingReviews.length > 0 ? (
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              {t('reviews.pendingReviews', 'Trips Awaiting Your Review')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingReviews.map((pending) => (
                <div
                  key={pending.bookingId}
                  className="flex items-center justify-between rounded-lg bg-white p-4"
                >
                  <div>
                    <p className="font-medium">{pending.tripTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {pending.centerName} • {formatDate(pending.completedAt)}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to={`/my-bookings/${pending.bookingId}/review`}>
                      <Edit className="mr-2 h-4 w-4" />
                      {t('reviews.writeReview', 'Write Review')}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* My Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reviews.yourReviews', 'Your Reviews')}</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !reviews || reviews.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                {t('reviews.noReviews', "You haven't written any reviews yet")}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {t('reviews.startReviewing', 'Complete a dive trip to share your experience')}
              </p>
              <Button asChild className="mt-4">
                <Link to="/trips">{t('trips.browseTrips', 'Browse Trips')}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review: Review) => (
                <ReviewCard key={review.id} review={review} isArabic={isArabic} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewCard({ review, isArabic }: { review: Review; isArabic: boolean }) {
  const { t } = useTranslation();
  const title = isArabic ? review.titleAr || review.titleEn : review.titleEn;
  const text = isArabic ? review.reviewTextAr || review.reviewTextEn : review.reviewTextEn;

  return (
    <div className="border-b pb-6 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.overallRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                review.status === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : review.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {review.status}
            </span>
          </div>

          {title && <h3 className="mt-2 font-medium">{title}</h3>}
          {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(review.createdAt)}
            </span>
            {review.tripTitle && <span>{review.tripTitle}</span>}
            {review.helpfulCount > 0 && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {review.helpfulCount} {t('reviews.foundHelpful', 'found helpful')}
              </span>
            )}
          </div>

          {/* Detailed ratings */}
          {(review.safetyRating || review.equipmentRating || review.instructorRating || review.valueRating) && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              {review.safetyRating && (
                <span className="flex items-center gap-1">
                  Safety: {review.safetyRating}/5
                </span>
              )}
              {review.equipmentRating && (
                <span className="flex items-center gap-1">
                  Equipment: {review.equipmentRating}/5
                </span>
              )}
              {review.instructorRating && (
                <span className="flex items-center gap-1">
                  Instructor: {review.instructorRating}/5
                </span>
              )}
              {review.valueRating && (
                <span className="flex items-center gap-1">
                  Value: {review.valueRating}/5
                </span>
              )}
            </div>
          )}

          {/* Center response */}
          {(review.centerResponseEn || review.centerResponseAr) && (
            <div className="mt-4 rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t('reviews.centerResponse', 'Response from center')}
              </p>
              <p className="mt-1 text-sm">
                {isArabic ? review.centerResponseAr || review.centerResponseEn : review.centerResponseEn}
              </p>
            </div>
          )}
        </div>

        {review.wouldRecommend && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
              <ThumbsUp className="h-3 w-3" />
              {t('reviews.recommends', 'Recommends')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
