import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Star,
  Calendar,
  User,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { instructorApi } from '@/api/instructor';
import { formatDate } from '@/lib/utils';

export function InstructorReviewsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-reviews', page],
    queryFn: () => instructorApi.getMyReviews(page, limit),
  });

  // Extended review type for instructor reviews
  interface InstructorReview {
    id: string;
    userId: string;
    bookingId: string;
    centerId: string;
    instructorId: string;
    overallRating: number;
    instructorRating?: number;
    reviewTextEn?: string;
    wouldRecommend: boolean;
    helpfulCount: number;
    reportCount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
    // Additional display fields
    reviewerName?: string;
    tripTitle?: string;
  }

  // Mock data for display
  const mockReviews: InstructorReview[] = [
    {
      id: '1',
      userId: 'user-1',
      bookingId: 'booking-1',
      centerId: 'center-1',
      instructorId: 'inst-1',
      overallRating: 5,
      instructorRating: 5,
      reviewTextEn: 'Excellent instructor! Very patient and knowledgeable. Made my first dive an amazing experience.',
      wouldRecommend: true,
      helpfulCount: 12,
      reportCount: 0,
      status: 'approved',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerName: 'Ahmed K.',
      tripTitle: 'Morning Dive at Coral Gardens',
    },
    {
      id: '2',
      userId: 'user-2',
      bookingId: 'booking-2',
      centerId: 'center-1',
      instructorId: 'inst-1',
      overallRating: 5,
      instructorRating: 5,
      reviewTextEn: 'Best diving experience I\'ve ever had. The instructor was professional and ensured everyone felt safe.',
      wouldRecommend: true,
      helpfulCount: 8,
      reportCount: 0,
      status: 'approved',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerName: 'Sarah M.',
      tripTitle: 'Night Dive Experience',
    },
    {
      id: '3',
      userId: 'user-3',
      bookingId: 'booking-3',
      centerId: 'center-1',
      instructorId: 'inst-1',
      overallRating: 4,
      instructorRating: 4,
      reviewTextEn: 'Great instructor, very safety-conscious. Would have liked more time at the reef.',
      wouldRecommend: true,
      helpfulCount: 3,
      reportCount: 0,
      status: 'approved',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerName: 'Omar H.',
      tripTitle: 'Full Day Diving Adventure',
    },
    {
      id: '4',
      userId: 'user-4',
      bookingId: 'booking-4',
      centerId: 'center-1',
      instructorId: 'inst-1',
      overallRating: 5,
      instructorRating: 5,
      reviewTextEn: 'Fantastic dive! The instructor pointed out so many interesting marine creatures. Highly recommend!',
      wouldRecommend: true,
      helpfulCount: 15,
      reportCount: 0,
      status: 'approved',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerName: 'Fatima R.',
      tripTitle: 'Wreck Dive Exploration',
    },
  ];

  const reviews = (data?.reviews || mockReviews) as InstructorReview[];
  const total = data?.total || mockReviews.length;
  const averageRating = data?.averageRating || 4.8;
  const totalPages = Math.ceil(total / limit);

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.overallRating === rating).length,
    percentage: (reviews.filter(r => r.overallRating === rating).length / reviews.length) * 100,
  }));

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('instructor.myReviews', 'My Reviews')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('instructor.reviewsDescription', 'See what divers are saying about you')}
        </p>
      </div>

      {/* Rating Summary */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
              <span className="text-5xl font-bold">{averageRating.toFixed(1)}</span>
            </div>
            <p className="mt-2 text-muted-foreground">
              {t('instructor.outOf5', 'out of 5')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('instructor.basedOnReviews', 'Based on {{count}} reviews', { count: total })}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t('instructor.ratingDistribution', 'Rating Distribution')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3">
                <span className="w-12 text-sm">{rating} stars</span>
                <div className="flex-1">
                  <div className="h-4 rounded-full bg-muted">
                    <div
                      className="h-4 rounded-full bg-amber-400 transition-all"
                      style={{ width: `${percentage || 0}%` }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-sm text-muted-foreground">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {t('instructor.noReviews', 'No reviews yet')}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {t('instructor.noReviewsDescription', 'Reviews from divers will appear here')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.reviewerName || 'Anonymous'}</span>
                        {review.status === 'approved' && (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {renderStars(review.overallRating)}
                        <span className="text-sm text-muted-foreground">
                          <Calendar className="me-1 inline h-3 w-3" />
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {review.tripTitle && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Trip: {review.tripTitle}
                  </p>
                )}

                <p className="mt-3 text-sm">{review.reviewTextEn}</p>

                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    {review.helpfulCount} found this helpful
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('common.previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {t('common.next', 'Next')}
            </Button>
          </div>
        </div>
      )}

      {/* Tips Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t('instructor.improveTips', 'Tips for Great Reviews')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-1">
            <li>• {t('instructor.tip1Reviews', 'Be patient and attentive to all skill levels')}</li>
            <li>• {t('instructor.tip2Reviews', 'Share your knowledge about marine life and dive sites')}</li>
            <li>• {t('instructor.tip3Reviews', 'Ensure safety briefings are thorough and clear')}</li>
            <li>• {t('instructor.tip4Reviews', 'Create a welcoming and positive atmosphere')}</li>
            <li>• {t('instructor.tip5Reviews', 'Follow up with divers after the trip')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
