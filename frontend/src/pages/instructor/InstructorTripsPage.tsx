import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Ship,
  Calendar,
  Clock,
  Users,
  MapPin,
  Filter,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { instructorApi } from '@/api/instructor';
import { formatDate, formatTime, formatPrice } from '@/lib/utils';

type TripFilter = 'all' | 'upcoming' | 'in_progress' | 'completed';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  full: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function InstructorTripsPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<TripFilter>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-trips', statusFilter, page],
    queryFn: () => instructorApi.getMyTrips({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      page,
      limit,
    }),
  });

  // Mock data for display
  const mockAssignments = [
    {
      id: '1',
      tripId: 'trip-1',
      instructorId: 'inst-1',
      role: 'lead' as const,
      assignedAt: new Date().toISOString(),
      trip: {
        id: 'trip-1',
        centerId: 'center-1',
        diveSiteId: 'site-1',
        titleEn: 'Morning Dive at Coral Gardens',
        titleAr: 'غوصة صباحية في حدائق المرجان',
        tripType: 'morning' as const,
        status: 'published' as const,
        departureDatetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        returnDatetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
        maxParticipants: 12,
        currentParticipants: 8,
        pricePerPersonSar: 350,
        siteName: 'Coral Gardens',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: '2',
      tripId: 'trip-2',
      instructorId: 'inst-1',
      role: 'assistant' as const,
      assignedAt: new Date().toISOString(),
      trip: {
        id: 'trip-2',
        centerId: 'center-1',
        diveSiteId: 'site-2',
        titleEn: 'Night Dive Experience',
        titleAr: 'تجربة الغوص الليلي',
        tripType: 'night' as const,
        status: 'published' as const,
        departureDatetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        returnDatetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
        maxParticipants: 8,
        currentParticipants: 6,
        pricePerPersonSar: 450,
        siteName: 'Blue Lagoon',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  const assignments = data?.assignments || mockAssignments;
  const total = data?.total || mockAssignments.length;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('instructor.myTrips', 'My Trips')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('instructor.tripsDescription', 'View and manage your assigned diving trips')}
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as TripFilter); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="me-2 h-4 w-4" />
                <SelectValue placeholder="Filter trips" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', 'All Trips')}</SelectItem>
                <SelectItem value="upcoming">{t('instructor.upcoming', 'Upcoming')}</SelectItem>
                <SelectItem value="in_progress">{t('instructor.inProgress', 'In Progress')}</SelectItem>
                <SelectItem value="completed">{t('instructor.completed', 'Completed')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('instructor.showingTrips', 'Showing {{count}} trips', { count: assignments.length })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trips List */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ship className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {t('instructor.noTrips', 'No trips found')}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {statusFilter !== 'all'
                ? t('instructor.noTripsFilter', 'Try adjusting your filters')
                : t('instructor.noAssignedTrips', 'You have no assigned trips yet')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Trip Info */}
                  <div className="flex-1 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{assignment.trip.titleEn}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[assignment.trip.status]}`}>
                            {assignment.trip.status.replace('_', ' ')}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            assignment.role === 'lead'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {assignment.role === 'lead' ? 'Lead Instructor' : 'Assistant'}
                          </span>
                        </div>
                        {assignment.trip.titleAr && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{assignment.trip.titleAr}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(assignment.trip.departureDatetime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(assignment.trip.departureDatetime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{assignment.trip.siteName || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{assignment.trip.currentParticipants}/{assignment.trip.maxParticipants} divers</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        {formatPrice(assignment.trip.pricePerPersonSar)}/person
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Assigned: {formatDate(assignment.assignedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t p-4 lg:border-l lg:border-t-0">
                    <Button variant="outline" asChild>
                      <Link to={`/trips/${assignment.tripId}`}>
                        <Eye className="me-2 h-4 w-4" />
                        {t('common.viewDetails', 'View Details')}
                      </Link>
                    </Button>
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

      {/* Stats Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {assignments.filter(a => a.role === 'lead').length}
            </p>
            <p className="text-sm text-muted-foreground">{t('instructor.asLeadInstructor', 'As Lead Instructor')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {assignments.filter(a => a.role === 'assistant').length}
            </p>
            <p className="text-sm text-muted-foreground">{t('instructor.asAssistant', 'As Assistant')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {assignments.reduce((sum, a) => sum + a.trip.currentParticipants, 0)}
            </p>
            <p className="text-sm text-muted-foreground">{t('instructor.totalDivers', 'Total Divers')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
