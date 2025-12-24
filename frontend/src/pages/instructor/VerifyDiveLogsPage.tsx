import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Ruler,
  Thermometer,
  Eye,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { instructorApi } from '@/api/instructor';
import { formatDate } from '@/lib/utils';

export function VerifyDiveLogsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-pending-verifications', page],
    queryFn: () => instructorApi.getPendingVerifications(page, limit),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ diveLogId, notes }: { diveLogId: string; notes?: string }) =>
      instructorApi.verifyDiveLog(diveLogId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['instructor-dashboard'] });
      setSelectedLog(null);
      setVerificationNotes('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ diveLogId, reason }: { diveLogId: string; reason: string }) =>
      instructorApi.rejectDiveLog(diveLogId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['instructor-dashboard'] });
      setSelectedLog(null);
      setRejectionReason('');
    },
  });

  // Mock data for display
  const mockLogs = [
    {
      id: '1',
      usrId: 'diver-1',
      tripId: 'trip-1',
      siteName: 'Coral Gardens',
      diveDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      diveNumber: 45,
      maxDepthMeters: 18.5,
      bottomTimeMinutes: 48,
      waterTemperatureCelsius: 26,
      visibility: 'good',
      waterType: 'salt',
      notesEn: 'Spotted a sea turtle and various reef fish. Great visibility today.',
      diverName: 'Ahmed Al-Rashid',
      diverEmail: 'ahmed@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      usrId: 'diver-2',
      tripId: 'trip-1',
      siteName: 'Blue Lagoon',
      diveDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      diveNumber: 12,
      maxDepthMeters: 22.3,
      bottomTimeMinutes: 42,
      waterTemperatureCelsius: 25,
      visibility: 'excellent',
      waterType: 'salt',
      notesEn: 'First deep dive. Completed safety stop successfully.',
      diverName: 'Sarah Mohammed',
      diverEmail: 'sarah@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      usrId: 'diver-3',
      tripId: 'trip-2',
      siteName: 'Reef Point',
      diveDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      diveNumber: 78,
      maxDepthMeters: 15.0,
      bottomTimeMinutes: 55,
      waterTemperatureCelsius: 27,
      visibility: 'good',
      waterType: 'salt',
      notesEn: 'Night dive. Saw bioluminescent plankton.',
      diverName: 'Omar Khan',
      diverEmail: 'omar@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const diveLogs = data?.diveLogs || mockLogs;
  const total = data?.total || mockLogs.length;
  const totalPages = Math.ceil(total / limit);

  const handleVerify = (logId: string) => {
    verifyMutation.mutate({ diveLogId: logId, notes: verificationNotes || undefined });
  };

  const handleReject = (logId: string) => {
    if (!rejectionReason.trim()) {
      alert(t('instructor.rejectionReasonRequired', 'Please provide a reason for rejection'));
      return;
    }
    rejectMutation.mutate({ diveLogId: logId, reason: rejectionReason });
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('instructor.verifyDiveLogs', 'Verify Dive Logs')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('instructor.verifyDescription', 'Review and verify dive logs submitted by divers from your trips')}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <ClipboardCheck className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">{t('instructor.pendingReview', 'Pending Review')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dive Logs List */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : diveLogs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-semibold">
              {t('instructor.allCaughtUp', 'All caught up!')}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {t('instructor.noPendingLogs', 'No dive logs pending verification')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {diveLogs.map((log) => (
            <Card key={log.id} className={selectedLog === log.id ? 'ring-2 ring-primary' : ''}>
              <CardContent className="p-0">
                <div className="p-4">
                  {/* Diver Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{log.diverName}</p>
                        <p className="text-sm text-muted-foreground">{log.diverEmail}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      Pending
                    </span>
                  </div>

                  {/* Dive Details */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{log.siteName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(log.diveDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span>{log.maxDepthMeters}m max depth</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{log.bottomTimeMinutes} min</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      Dive #{log.diveNumber}
                    </span>
                    {log.waterTemperatureCelsius && (
                      <span className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                        <Thermometer className="h-3 w-3" />
                        {log.waterTemperatureCelsius}°C
                      </span>
                    )}
                    {log.visibility && (
                      <span className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                        <Eye className="h-3 w-3" />
                        {log.visibility}
                      </span>
                    )}
                    {log.waterType && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        {log.waterType}
                      </span>
                    )}
                  </div>

                  {log.notesEn && (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3">
                      <p className="text-sm font-medium">{t('instructor.diverNotes', 'Diver Notes')}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{log.notesEn}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedLog !== log.id ? (
                      <>
                        <Button
                          onClick={() => handleVerify(log.id)}
                          disabled={verifyMutation.isPending}
                        >
                          {verifyMutation.isPending ? (
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="me-2 h-4 w-4" />
                          )}
                          {t('instructor.verify', 'Verify')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedLog(log.id)}
                        >
                          {t('instructor.addNotesOrReject', 'Add Notes / Reject')}
                        </Button>
                      </>
                    ) : (
                      <div className="w-full space-y-3">
                        <div>
                          <label className="text-sm font-medium">
                            {t('instructor.verificationNotes', 'Verification Notes (optional)')}
                          </label>
                          <Textarea
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            placeholder={t('instructor.verificationNotesPlaceholder', 'Add any notes about this dive...')}
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            {t('instructor.rejectionReason', 'Rejection Reason')}
                          </label>
                          <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder={t('instructor.rejectionReasonPlaceholder', 'Explain why this log cannot be verified...')}
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => handleVerify(log.id)}
                            disabled={verifyMutation.isPending}
                          >
                            {verifyMutation.isPending ? (
                              <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="me-2 h-4 w-4" />
                            )}
                            {t('instructor.verifyWithNotes', 'Verify')}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(log.id)}
                            disabled={rejectMutation.isPending || !rejectionReason.trim()}
                          >
                            {rejectMutation.isPending ? (
                              <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="me-2 h-4 w-4" />
                            )}
                            {t('instructor.reject', 'Reject')}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedLog(null);
                              setVerificationNotes('');
                              setRejectionReason('');
                            }}
                          >
                            {t('common.cancel', 'Cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
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

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t('instructor.verificationInfo', 'About Verification')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-1">
            <li>• {t('instructor.verifyInfo1', 'Verify dive logs for dives you supervised or witnessed')}</li>
            <li>• {t('instructor.verifyInfo2', 'Verified dives count toward the diver\'s official log')}</li>
            <li>• {t('instructor.verifyInfo3', 'Reject logs with inaccurate information and explain why')}</li>
            <li>• {t('instructor.verifyInfo4', 'Your verification adds credibility to the diver\'s experience')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
