import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Star,
  Loader2,
  ArrowLeft,
  ThumbsUp,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bookingsApi } from '@/api/trips';
import { reviewsApi } from '@/api/reviews';
import { formatDate } from '@/lib/utils';

const reviewSchema = z.object({
  overallRating: z.number().min(1, 'Please select a rating').max(5),
  safetyRating: z.number().min(1).max(5).optional(),
  equipmentRating: z.number().min(1).max(5).optional(),
  instructorRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  titleEn: z.string().optional(),
  reviewTextEn: z.string().min(10, 'Please write at least 10 characters'),
  wouldRecommend: z.boolean(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export function WriteReviewPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [submitted, setSubmitted] = useState(false);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId!),
    enabled: !!bookingId,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      overallRating: 0,
      wouldRecommend: true,
    },
  });

  const overallRating = watch('overallRating');

  const mutation = useMutation({
    mutationFn: (data: ReviewFormData) =>
      reviewsApi.create({
        ...data,
        bookingId: bookingId!,
        centerId: booking!.centerId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      setSubmitted(true);
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
        <h2 className="mt-4 text-xl font-semibold">{t('reviews.bookingNotFound', 'Booking not found')}</h2>
        <Button asChild className="mt-4">
          <Link to="/my-bookings">{t('bookings.backToList', 'Back to my bookings')}</Link>
        </Button>
      </div>
    );
  }

  if (booking.status !== 'completed') {
    return (
      <div className="container py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-xl font-semibold">{t('reviews.tripNotCompleted', 'Trip not completed yet')}</h2>
        <p className="mt-2 text-muted-foreground">
          {t('reviews.completeFirst', 'You can write a review after completing your trip.')}
        </p>
        <Button asChild className="mt-4">
          <Link to={`/my-bookings/${bookingId}`}>{t('bookings.viewBooking', 'View Booking')}</Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container flex min-h-[400px] flex-col items-center justify-center py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">{t('reviews.thankYou', 'Thank You!')}</h2>
        <p className="mt-2 text-muted-foreground">
          {t('reviews.submitted', 'Your review has been submitted successfully.')}
        </p>
        <div className="mt-6 flex gap-4">
          <Button asChild>
            <Link to={`/centers/${booking.centerId}`}>{t('reviews.viewCenter', 'View Center')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/my-bookings">{t('bookings.title', 'My Bookings')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link to={`/my-bookings/${bookingId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back', 'Back')}
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('reviews.writeReview', 'Write a Review')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('reviews.shareExperience', 'Share your experience with other divers')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('reviews.overallRating', 'Overall Rating')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setValue('overallRating', rating)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-10 w-10 ${
                            rating <= overallRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {overallRating > 0 && (
                    <p className="text-lg font-medium">{ratingLabels[overallRating]}</p>
                  )}
                  {errors.overallRating && (
                    <p className="text-sm text-destructive">{errors.overallRating.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('reviews.detailedRatings', 'Detailed Ratings')} ({t('common.optional', 'Optional')})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RatingRow
                  label={t('reviews.safety', 'Safety')}
                  value={watch('safetyRating') || 0}
                  onChange={(val) => setValue('safetyRating', val)}
                />
                <RatingRow
                  label={t('reviews.equipment', 'Equipment')}
                  value={watch('equipmentRating') || 0}
                  onChange={(val) => setValue('equipmentRating', val)}
                />
                <RatingRow
                  label={t('reviews.instructor', 'Instructor')}
                  value={watch('instructorRating') || 0}
                  onChange={(val) => setValue('instructorRating', val)}
                />
                <RatingRow
                  label={t('reviews.valueForMoney', 'Value for Money')}
                  value={watch('valueRating') || 0}
                  onChange={(val) => setValue('valueRating', val)}
                />
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('reviews.yourReview', 'Your Review')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titleEn">{t('reviews.reviewTitle', 'Review Title')} ({t('common.optional', 'Optional')})</Label>
                  <Input
                    id="titleEn"
                    placeholder={t('reviews.titlePlaceholder', 'Summarize your experience')}
                    {...register('titleEn')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewTextEn">{t('reviews.reviewText', 'Your Review')} *</Label>
                  <textarea
                    id="reviewTextEn"
                    {...register('reviewTextEn')}
                    rows={5}
                    placeholder={t('reviews.reviewPlaceholder', 'Tell other divers about your experience...')}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  {errors.reviewTextEn && (
                    <p className="text-sm text-destructive">{errors.reviewTextEn.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <ThumbsUp className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">{t('reviews.wouldRecommend', 'Would you recommend this center?')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={watch('wouldRecommend') ? 'default' : 'outline'}
                    onClick={() => setValue('wouldRecommend', true)}
                  >
                    {t('common.yes', 'Yes')}
                  </Button>
                  <Button
                    type="button"
                    variant={!watch('wouldRecommend') ? 'default' : 'outline'}
                    onClick={() => setValue('wouldRecommend', false)}
                  >
                    {t('common.no', 'No')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={mutation.isPending} size="lg" className="w-full">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('reviews.submitReview', 'Submit Review')}
            </Button>

            {mutation.isError && (
              <p className="mt-4 text-center text-sm text-destructive">
                {t('common.errorSaving', 'Error submitting review. Please try again.')}
              </p>
            )}
          </form>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('reviews.tripDetails', 'Trip Details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">{t('trips.title', 'Trip')}</Label>
                <p className="font-medium">{booking.tripTitle}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('centers.center', 'Center')}</Label>
                <p className="font-medium">{booking.centerName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('bookings.date', 'Date')}</Label>
                <p className="font-medium">{formatDate(booking.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="p-0.5"
          >
            <Star
              className={`h-5 w-5 ${
                rating <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
