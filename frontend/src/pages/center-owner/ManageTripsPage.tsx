import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Plus,
  Search,
  Calendar,
  Users,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Send,
  XCircle,
  Filter,
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
import { centerOwnerApi } from '@/api/centers';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';
import type { TripStatus } from '@/types';

const useCenterId = () => 'mock-center-id';

const statusColors: Record<TripStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  full: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<TripStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  full: 'Full',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function ManageTripsPage() {
  const { t } = useTranslation();
  const centerId = useCenterId();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showActions, setShowActions] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['center-trips', centerId, statusFilter],
    queryFn: () => centerOwnerApi.getTrips(centerId, {
      status: statusFilter !== 'all' ? statusFilter as TripStatus : undefined,
    }),
  });

  const publishMutation = useMutation({
    mutationFn: (tripId: string) => centerOwnerApi.publishTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-trips'] });
      setShowActions(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ tripId, reason }: { tripId: string; reason: string }) =>
      centerOwnerApi.cancelTrip(tripId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-trips'] });
      setShowActions(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tripId: string) => centerOwnerApi.deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-trips'] });
      setShowActions(null);
    },
  });

  const trips = data?.trips || [];
  const filteredTrips = trips.filter(trip =>
    trip.titleEn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('centerOwner.manageTrips', 'Manage Trips')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('centerOwner.tripsDescription', 'Create, edit, and manage your diving trips')}
          </p>
        </div>
        <Button asChild>
          <Link to="/center/trips/new">
            <Plus className="me-2 h-4 w-4" />
            {t('centerOwner.createTrip', 'Create Trip')}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('centerOwner.searchTrips', 'Search trips...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="me-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                <SelectItem value="draft">{t('trips.status.draft', 'Draft')}</SelectItem>
                <SelectItem value="published">{t('trips.status.published', 'Published')}</SelectItem>
                <SelectItem value="full">{t('trips.status.full', 'Full')}</SelectItem>
                <SelectItem value="in_progress">{t('trips.status.inProgress', 'In Progress')}</SelectItem>
                <SelectItem value="completed">{t('trips.status.completed', 'Completed')}</SelectItem>
                <SelectItem value="cancelled">{t('trips.status.cancelled', 'Cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trips List */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTrips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {t('centerOwner.noTrips', 'No trips found')}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? t('centerOwner.noTripsFilter', 'Try adjusting your filters')
                : t('centerOwner.createFirstTrip', 'Create your first trip to get started')}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button asChild className="mt-4">
                <Link to="/center/trips/new">
                  <Plus className="me-2 h-4 w-4" />
                  {t('centerOwner.createTrip', 'Create Trip')}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((trip) => (
            <Card key={trip.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* Trip Info */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{trip.titleEn}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[trip.status]}`}>
                            {statusLabels[trip.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                          {trip.descriptionEn || t('centerOwner.noDescription', 'No description')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(trip.departureDatetime)} at {formatTime(trip.departureDatetime)}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {trip.currentParticipants}/{trip.maxParticipants} divers
                      </div>
                      <div className="font-medium text-primary">
                        {formatPrice(trip.pricePerPersonSar)}/person
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t p-4 sm:border-l sm:border-t-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/trips/${trip.id}`}>
                        <Eye className="me-1 h-4 w-4" />
                        {t('common.view', 'View')}
                      </Link>
                    </Button>
                    {trip.status === 'draft' && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/center/trips/${trip.id}/edit`}>
                            <Edit className="me-1 h-4 w-4" />
                            {t('common.edit', 'Edit')}
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => publishMutation.mutate(trip.id)}
                          disabled={publishMutation.isPending}
                        >
                          {publishMutation.isPending ? (
                            <Loader2 className="me-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="me-1 h-4 w-4" />
                          )}
                          {t('centerOwner.publish', 'Publish')}
                        </Button>
                      </>
                    )}
                    {trip.status === 'published' && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/center/trips/${trip.id}/bookings`}>
                          <Users className="me-1 h-4 w-4" />
                          {t('centerOwner.bookings', 'Bookings')}
                        </Link>
                      </Button>
                    )}

                    {/* More Actions Dropdown */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowActions(showActions === trip.id ? null : trip.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {showActions === trip.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-background shadow-lg">
                          {trip.status === 'draft' && (
                            <button
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted"
                              onClick={() => {
                                if (confirm(t('centerOwner.confirmDelete', 'Are you sure you want to delete this trip?'))) {
                                  deleteMutation.mutate(trip.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('common.delete', 'Delete')}
                            </button>
                          )}
                          {(trip.status === 'published' || trip.status === 'full') && (
                            <button
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted"
                              onClick={() => {
                                const reason = prompt(t('centerOwner.cancelReason', 'Enter cancellation reason:'));
                                if (reason) {
                                  cancelMutation.mutate({ tripId: trip.id, reason });
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                              {t('centerOwner.cancelTrip', 'Cancel Trip')}
                            </button>
                          )}
                          <Link
                            to={`/center/trips/${trip.id}/edit`}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                            onClick={() => setShowActions(null)}
                          >
                            <Edit className="h-4 w-4" />
                            {t('common.edit', 'Edit')}
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

      {/* Stats Summary */}
      {trips.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{trips.length}</p>
              <p className="text-sm text-muted-foreground">{t('centerOwner.totalTrips', 'Total Trips')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{trips.filter(t => t.status === 'published').length}</p>
              <p className="text-sm text-muted-foreground">{t('centerOwner.publishedTrips', 'Published')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{trips.filter(t => t.status === 'draft').length}</p>
              <p className="text-sm text-muted-foreground">{t('centerOwner.draftTrips', 'Drafts')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {trips.reduce((sum, t) => sum + t.currentParticipants, 0)}
              </p>
              <p className="text-sm text-muted-foreground">{t('centerOwner.totalBookings', 'Total Bookings')}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
