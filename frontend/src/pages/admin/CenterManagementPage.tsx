import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Search,
  Building2,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Ban,
  Eye,
  MapPin,
  Star,
  Calendar,
  Phone,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/api/admin';
import { formatDate } from '@/lib/utils';
import type { CenterStatus } from '@/types';

const statusColors: Record<CenterStatus, string> = {
  active: 'bg-green-100 text-green-700',
  pending_verification: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  deactivated: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<CenterStatus, string> = {
  active: 'Active',
  pending_verification: 'Pending Approval',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
};

export function CenterManagementPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showActions, setShowActions] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-centers', statusFilter, page, searchTerm],
    queryFn: () => adminApi.getCenters({
      status: statusFilter !== 'all' ? statusFilter as CenterStatus : undefined,
      search: searchTerm || undefined,
      page,
      limit,
    }),
  });

  const approveMutation = useMutation({
    mutationFn: (centerId: string) => adminApi.approveCenter(centerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setShowActions(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ centerId, reason }: { centerId: string; reason: string }) =>
      adminApi.rejectCenter(centerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      setShowActions(null);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ centerId, reason }: { centerId: string; reason: string }) =>
      adminApi.suspendCenter(centerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      setShowActions(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (centerId: string) => adminApi.activateCenter(centerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      setShowActions(null);
    },
  });

  const centers = data?.centers || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleReject = (centerId: string) => {
    const reason = prompt(t('admin.rejectReason', 'Enter rejection reason:'));
    if (reason) {
      rejectMutation.mutate({ centerId, reason });
    }
  };

  const handleSuspend = (centerId: string) => {
    const reason = prompt(t('admin.suspendReason', 'Enter suspension reason:'));
    if (reason) {
      suspendMutation.mutate({ centerId, reason });
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('admin.centerManagement', 'Center Management')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('admin.centerManagementDescription', 'Approve, manage, and monitor diving centers')}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">{t('admin.totalCenters', 'Total Centers')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {centers.filter(c => c.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">{t('admin.activeCenters', 'Active')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Building2 className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {centers.filter(c => c.status === 'pending_verification').length}
                </p>
                <p className="text-sm text-muted-foreground">{t('admin.pendingApproval', 'Pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {centers.filter(c => c.status === 'suspended').length}
                </p>
                <p className="text-sm text-muted-foreground">{t('admin.suspendedCenters', 'Suspended')}</p>
              </div>
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
                placeholder={t('admin.searchCenters', 'Search by name or city...')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="me-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStatuses', 'All Statuses')}</SelectItem>
                <SelectItem value="active">{t('status.active', 'Active')}</SelectItem>
                <SelectItem value="pending_verification">{t('status.pendingApproval', 'Pending Approval')}</SelectItem>
                <SelectItem value="suspended">{t('status.suspended', 'Suspended')}</SelectItem>
                <SelectItem value="deactivated">{t('status.deactivated', 'Deactivated')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Centers List */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : centers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {t('admin.noCenters', 'No centers found')}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {t('admin.noCentersFilter', 'Try adjusting your filters')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {centers.map((center) => (
            <Card key={center.id} className={center.status === 'pending_verification' ? 'border-yellow-300 bg-yellow-50/30' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{center.nameEn}</h3>
                      {center.nameAr && (
                        <span className="text-muted-foreground">({center.nameAr})</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[center.status]}`}>
                        {statusLabels[center.status]}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {center.city}
                      </span>
                      {center.phoneEmergency && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {center.phoneEmergency}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Registered {formatDate(center.createdAt)}
                      </span>
                      {center.ratingAverage > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {center.ratingAverage.toFixed(1)} ({center.totalReviews} reviews)
                        </span>
                      )}
                    </div>

                    {center.descriptionEn && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {center.descriptionEn}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/centers/${center.id}`}>
                        <Eye className="me-1 h-4 w-4" />
                        {t('common.view', 'View')}
                      </Link>
                    </Button>

                    {center.status === 'pending_verification' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(center.id)}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="me-1 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="me-1 h-4 w-4" />
                          )}
                          {t('admin.approve', 'Approve')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(center.id)}
                          disabled={rejectMutation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          {rejectMutation.isPending ? (
                            <Loader2 className="me-1 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="me-1 h-4 w-4" />
                          )}
                          {t('admin.reject', 'Reject')}
                        </Button>
                      </>
                    )}

                    {center.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuspend(center.id)}
                        disabled={suspendMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        {suspendMutation.isPending ? (
                          <Loader2 className="me-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="me-1 h-4 w-4" />
                        )}
                        {t('admin.suspend', 'Suspend')}
                      </Button>
                    )}

                    {center.status === 'suspended' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => activateMutation.mutate(center.id)}
                        disabled={activateMutation.isPending}
                      >
                        {activateMutation.isPending ? (
                          <Loader2 className="me-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="me-1 h-4 w-4" />
                        )}
                        {t('admin.activate', 'Activate')}
                      </Button>
                    )}

                    {/* More Actions */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowActions(showActions === center.id ? null : center.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {showActions === center.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-background shadow-lg">
                          <Link
                            to={`/admin/centers/${center.id}`}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                            onClick={() => setShowActions(null)}
                          >
                            <Eye className="h-4 w-4" />
                            {t('admin.viewDetails', 'View Details')}
                          </Link>
                          <Link
                            to={`/admin/centers/${center.id}/trips`}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                            onClick={() => setShowActions(null)}
                          >
                            <Calendar className="h-4 w-4" />
                            {t('admin.viewTrips', 'View Trips')}
                          </Link>
                        </div>
                      )}
                    </div>
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
            {t('common.showingResults', 'Showing {{start}}-{{end}} of {{total}} centers', {
              start: (page - 1) * limit + 1,
              end: Math.min(page * limit, total),
              total,
            })}
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
    </div>
  );
}
