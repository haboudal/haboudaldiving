import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Flag,
  Star,
  User,
  MessageSquare,
  AlertTriangle,
  ThumbsUp,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '@/api/admin';
import { formatDate } from '@/lib/utils';

export function ModerationPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-flagged-reviews', page],
    queryFn: () => adminApi.getFlaggedReviews(page, limit),
  });

  const approveMutation = useMutation({
    mutationFn: (reviewId: string) => adminApi.approveReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flagged-reviews'] });
      setSelectedReview(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) =>
      adminApi.rejectReview(reviewId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flagged-reviews'] });
      setSelectedReview(null);
      setRejectionReason('');
    },
  });

  // Extended review type for display
  interface FlaggedReview {
    id: string;
    userId: string;
    bookingId: string;
    centerId: string;
    instructorId?: string;
    overallRating: number;
    reviewTextEn?: string;
    reviewTextAr?: string;
    wouldRecommend: boolean;
    helpfulCount: number;
    reportCount: number;
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    createdAt: string;
    updatedAt: string;
    // Display fields
    reviewerEmail?: string;
    centerName?: string;
    reportReasons?: string[];
  }

  // Mock data for display
  const mockReviews: FlaggedReview[] = [
    {
      id: '1',
      userId: 'user-1',
      bookingId: 'booking-1',
      centerId: 'center-1',
      overallRating: 1,
      reviewTextEn: 'This center was terrible! Never go there. The staff was rude and unprofessional. Complete waste of money.',
      wouldRecommend: false,
      helpfulCount: 2,
      reportCount: 5,
      status: 'flagged',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerEmail: 'angry.customer@example.com',
      centerName: 'Red Sea Divers',
      reportReasons: ['Inappropriate language', 'False information'],
    },
    {
      id: '2',
      userId: 'user-2',
      bookingId: 'booking-2',
      centerId: 'center-2',
      overallRating: 2,
      reviewTextEn: 'The equipment was old and seemed unsafe. I would not recommend this place to anyone who values their safety.',
      wouldRecommend: false,
      helpfulCount: 8,
      reportCount: 3,
      status: 'flagged',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerEmail: 'concerned.diver@example.com',
      centerName: 'Jeddah Dive Center',
      reportReasons: ['Disputed claims'],
    },
    {
      id: '3',
      userId: 'user-3',
      bookingId: 'booking-3',
      centerId: 'center-1',
      overallRating: 1,
      reviewTextEn: 'SPAM SPAM SPAM visit my website for cheap diving gear!!!',
      wouldRecommend: false,
      helpfulCount: 0,
      reportCount: 12,
      status: 'flagged',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerEmail: 'spammer@example.com',
      centerName: 'Red Sea Divers',
      reportReasons: ['Spam', 'Promotional content'],
    },
    {
      id: '4',
      userId: 'user-4',
      bookingId: 'booking-4',
      centerId: 'center-3',
      instructorId: 'inst-1',
      overallRating: 1,
      reviewTextEn: 'The instructor was extremely rude and made inappropriate comments during the dive. I felt very uncomfortable.',
      wouldRecommend: false,
      helpfulCount: 15,
      reportCount: 2,
      status: 'flagged',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerEmail: 'anonymous.diver@example.com',
      centerName: 'Arabian Diving',
      reportReasons: ['Serious allegation - needs verification'],
    },
  ];

  const reviews = (data?.reviews || mockReviews) as FlaggedReview[];
  const total = data?.total || mockReviews.length;
  const totalPages = Math.ceil(total / limit);

  const handleApprove = (reviewId: string) => {
    approveMutation.mutate(reviewId);
  };

  const handleReject = (reviewId: string) => {
    if (!rejectionReason.trim()) {
      alert(t('admin.rejectionReasonRequired', 'Please provide a reason for rejection'));
      return;
    }
    rejectMutation.mutate({ reviewId, reason: rejectionReason });
  };

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
        <h1 className="text-2xl font-bold">{t('admin.moderation', 'Content Moderation')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('admin.moderationDescription', 'Review and moderate flagged content from users')}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Flag className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">{t('admin.flaggedReviews', 'Flagged Reviews')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reviews.filter(r => r.reportCount >= 5).length}
                </p>
                <p className="text-sm text-muted-foreground">{t('admin.highPriority', 'High Priority')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reviews.reduce((sum, r) => sum + r.reportCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">{t('admin.totalReports', 'Total Reports')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Reviews List */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-semibold">
              {t('admin.noFlaggedContent', 'No flagged content')}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {t('admin.allClear', 'All content has been reviewed')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className={`${
                review.reportCount >= 5
                  ? 'border-red-300 bg-red-50/30'
                  : 'border-yellow-300 bg-yellow-50/30'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`h-5 w-5 ${review.reportCount >= 5 ? 'text-red-600' : 'text-yellow-600'}`} />
                    <CardTitle className="text-base">
                      {review.reportCount >= 5 ? t('admin.highPriorityReview', 'High Priority Review') : t('admin.flaggedReview', 'Flagged Review')}
                    </CardTitle>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {review.reportCount} {t('admin.reports', 'reports')}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Review Info */}
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{review.reviewerEmail || 'Unknown user'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{review.centerName || 'Unknown center'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(review.overallRating)}
                    <span className="ms-1 text-muted-foreground">({review.overallRating}/5)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                    <span>{review.helpfulCount} helpful</span>
                  </div>
                </div>

                {/* Report Reasons */}
                {review.reportReasons && review.reportReasons.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-red-700">{t('admin.reportReasons', 'Report Reasons:')}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {review.reportReasons.map((reason, idx) => (
                        <span key={idx} className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Content */}
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm font-medium">{t('admin.reviewContent', 'Review Content:')}</p>
                  <p className="mt-2 text-sm">{review.reviewTextEn || review.reviewTextAr || 'No content'}</p>
                </div>

                {/* Actions */}
                <div className="mt-4">
                  {selectedReview !== review.id ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleApprove(review.id)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="me-2 h-4 w-4" />
                        )}
                        {t('admin.approveReview', 'Approve Review')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedReview(review.id)}
                      >
                        <XCircle className="me-2 h-4 w-4" />
                        {t('admin.rejectReview', 'Reject Review')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">
                          {t('admin.rejectionReason', 'Rejection Reason')} *
                        </label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder={t('admin.rejectionReasonPlaceholder', 'Explain why this review is being rejected...')}
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(review.id)}
                          disabled={rejectMutation.isPending || !rejectionReason.trim()}
                        >
                          {rejectMutation.isPending ? (
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="me-2 h-4 w-4" />
                          )}
                          {t('admin.confirmReject', 'Confirm Rejection')}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedReview(null);
                            setRejectionReason('');
                          }}
                        >
                          {t('common.cancel', 'Cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
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

      {/* Moderation Guidelines */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">{t('admin.moderationGuidelines', 'Moderation Guidelines')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
              <span><strong>Approve</strong> reviews that are honest feedback, even if negative, as long as they don't violate guidelines</span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
              <span><strong>Reject</strong> reviews containing spam, hate speech, personal attacks, or false information</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-600" />
              <span><strong>Investigate</strong> serious allegations (safety concerns, misconduct) before making a decision</span>
            </li>
            <li className="flex items-start gap-2">
              <Flag className="mt-0.5 h-4 w-4 text-blue-600" />
              <span><strong>Prioritize</strong> reviews with 5+ reports as they likely need immediate attention</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
