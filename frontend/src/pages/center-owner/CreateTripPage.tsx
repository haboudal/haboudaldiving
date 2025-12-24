import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  ArrowLeft,
  Save,
  Send,
  Calendar,
  Users,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { centerOwnerApi, diveSitesApi } from '@/api/centers';
import { tripsApi } from '@/api/trips';
import type { TripType } from '@/types';

const useCenterId = () => 'mock-center-id';

const tripSchema = z.object({
  titleEn: z.string().min(1, 'Title is required'),
  titleAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  tripType: z.enum(['morning', 'afternoon', 'full_day', 'night', 'multi_day', 'liveaboard']),
  departureDatetime: z.string().min(1, 'Departure date is required'),
  returnDatetime: z.string().min(1, 'Return date is required'),
  vesselId: z.string().optional(),
  siteId: z.string().optional(),
  leadInstructorId: z.string().optional(),
  meetingPointEn: z.string().optional(),
  meetingPointAr: z.string().optional(),
  maxParticipants: z.number().min(1, 'At least 1 participant required'),
  minParticipants: z.number().min(1).optional(),
  minCertificationLevel: z.string().optional(),
  minLoggedDives: z.number().min(0).optional(),
  minAge: z.number().min(10).optional(),
  maxAge: z.number().optional(),
  numberOfDives: z.number().min(1).optional(),
  includesEquipment: z.boolean().optional(),
  includesMeals: z.boolean().optional(),
  includesRefreshments: z.boolean().optional(),
  pricePerPersonSar: z.number().min(1, 'Price is required'),
  equipmentRentalPriceSar: z.number().min(0).optional(),
  cancellationPolicy: z.string().optional(),
  cancellationDeadlineHours: z.number().min(0).optional(),
});

type TripFormData = z.infer<typeof tripSchema>;

const tripTypes: { value: TripType; label: string }[] = [
  { value: 'morning', label: 'Morning Trip' },
  { value: 'afternoon', label: 'Afternoon Trip' },
  { value: 'full_day', label: 'Full Day Trip' },
  { value: 'night', label: 'Night Dive' },
  { value: 'multi_day', label: 'Multi-Day Trip' },
  { value: 'liveaboard', label: 'Liveaboard' },
];

const certificationLevels = [
  { value: 'open_water', label: 'Open Water' },
  { value: 'advanced_open_water', label: 'Advanced Open Water' },
  { value: 'rescue', label: 'Rescue Diver' },
  { value: 'divemaster', label: 'Divemaster' },
  { value: 'instructor', label: 'Instructor' },
];

export function CreateTripPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const centerId = useCenterId();
  const queryClient = useQueryClient();
  const isEditing = !!tripId;

  // Fetch existing trip if editing
  const { data: existingTrip, isLoading: loadingTrip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getById(tripId!),
    enabled: isEditing,
  });

  // Fetch vessels
  const { data: vessels = [] } = useQuery({
    queryKey: ['center-vessels', centerId],
    queryFn: () => centerOwnerApi.getVessels(centerId),
  });

  // Fetch dive sites
  const { data: sites = [] } = useQuery({
    queryKey: ['dive-sites'],
    queryFn: () => diveSitesApi.list(),
  });

  // Fetch instructors
  const { data: instructors = [] } = useQuery({
    queryKey: ['center-instructors', centerId],
    queryFn: () => centerOwnerApi.getInstructors(centerId),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: existingTrip ? {
      titleEn: existingTrip.titleEn,
      titleAr: existingTrip.titleAr || '',
      descriptionEn: existingTrip.descriptionEn || '',
      descriptionAr: existingTrip.descriptionAr || '',
      tripType: existingTrip.tripType,
      departureDatetime: existingTrip.departureDatetime?.slice(0, 16),
      returnDatetime: existingTrip.returnDatetime?.slice(0, 16),
      vesselId: existingTrip.vesselId || '',
      siteId: existingTrip.siteId || '',
      leadInstructorId: existingTrip.leadInstructorId || '',
      meetingPointEn: existingTrip.meetingPointEn || '',
      maxParticipants: existingTrip.maxParticipants,
      minParticipants: existingTrip.minParticipants || 1,
      minCertificationLevel: existingTrip.minCertificationLevel || '',
      minLoggedDives: existingTrip.minLoggedDives || 0,
      minAge: existingTrip.minAge || 10,
      numberOfDives: existingTrip.numberOfDives || 2,
      includesEquipment: existingTrip.includesEquipment,
      includesMeals: existingTrip.includesMeals,
      includesRefreshments: existingTrip.includesRefreshments,
      pricePerPersonSar: existingTrip.pricePerPersonSar,
      equipmentRentalPriceSar: existingTrip.equipmentRentalPriceSar || 0,
      cancellationDeadlineHours: existingTrip.cancellationDeadlineHours || 24,
    } : {
      tripType: 'morning',
      maxParticipants: 12,
      minParticipants: 4,
      minLoggedDives: 0,
      minAge: 10,
      numberOfDives: 2,
      includesEquipment: false,
      includesMeals: false,
      includesRefreshments: true,
      cancellationDeadlineHours: 24,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TripFormData) => centerOwnerApi.createTrip(centerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-trips'] });
      navigate('/center/trips');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TripFormData) => centerOwnerApi.updateTrip(tripId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      navigate('/center/trips');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => centerOwnerApi.publishTrip(tripId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-trips'] });
      navigate('/center/trips');
    },
  });

  const onSubmit = (data: TripFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && loadingTrip) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/center/trips')} className="mb-4">
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('common.back', 'Back')}
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? t('centerOwner.editTrip', 'Edit Trip') : t('centerOwner.createTrip', 'Create Trip')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('centerOwner.tripFormDescription', 'Fill in the details for your diving trip')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('centerOwner.basicInfo', 'Basic Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="titleEn">{t('centerOwner.tripTitle', 'Trip Title')} *</Label>
              <Input id="titleEn" {...register('titleEn')} placeholder="e.g., Morning Dive at Red Sea" />
              {errors.titleEn && <p className="mt-1 text-sm text-destructive">{errors.titleEn.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="titleAr">{t('centerOwner.tripTitleAr', 'Trip Title (Arabic)')}</Label>
              <Input id="titleAr" {...register('titleAr')} dir="rtl" />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="descriptionEn">{t('centerOwner.description', 'Description')}</Label>
              <Textarea id="descriptionEn" {...register('descriptionEn')} rows={3} />
            </div>

            <div>
              <Label>{t('centerOwner.tripType', 'Trip Type')} *</Label>
              <Select value={watch('tripType')} onValueChange={(v) => setValue('tripType', v as TripType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tripTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('centerOwner.vessel', 'Vessel')}</Label>
              <Select value={watch('vesselId') || ''} onValueChange={(v) => setValue('vesselId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('centerOwner.selectVessel', 'Select vessel')} />
                </SelectTrigger>
                <SelectContent>
                  {vessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>{vessel.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="departureDatetime">{t('centerOwner.departure', 'Departure')} *</Label>
              <Input id="departureDatetime" type="datetime-local" {...register('departureDatetime')} />
              {errors.departureDatetime && <p className="mt-1 text-sm text-destructive">{errors.departureDatetime.message}</p>}
            </div>

            <div>
              <Label htmlFor="returnDatetime">{t('centerOwner.return', 'Return')} *</Label>
              <Input id="returnDatetime" type="datetime-local" {...register('returnDatetime')} />
              {errors.returnDatetime && <p className="mt-1 text-sm text-destructive">{errors.returnDatetime.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Location & Staff */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('centerOwner.locationStaff', 'Location & Staff')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label>{t('centerOwner.diveSite', 'Dive Site')}</Label>
              <Select value={watch('siteId') || ''} onValueChange={(v) => setValue('siteId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('centerOwner.selectSite', 'Select dive site')} />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>{site.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('centerOwner.leadInstructor', 'Lead Instructor')}</Label>
              <Select value={watch('leadInstructorId') || ''} onValueChange={(v) => setValue('leadInstructorId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('centerOwner.selectInstructor', 'Select instructor')} />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.userId}>
                      {instructor.userName || instructor.userEmail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="meetingPointEn">{t('centerOwner.meetingPoint', 'Meeting Point')}</Label>
              <Input id="meetingPointEn" {...register('meetingPointEn')} placeholder="e.g., Marina Gate 3" />
            </div>
          </CardContent>
        </Card>

        {/* Capacity & Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('centerOwner.capacityRequirements', 'Capacity & Requirements')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div>
              <Label htmlFor="maxParticipants">{t('centerOwner.maxParticipants', 'Max Participants')} *</Label>
              <Input id="maxParticipants" type="number" {...register('maxParticipants', { valueAsNumber: true })} min="1" />
              {errors.maxParticipants && <p className="mt-1 text-sm text-destructive">{errors.maxParticipants.message}</p>}
            </div>

            <div>
              <Label htmlFor="minParticipants">{t('centerOwner.minParticipants', 'Min Participants')}</Label>
              <Input id="minParticipants" type="number" {...register('minParticipants', { valueAsNumber: true })} min="1" />
            </div>

            <div>
              <Label htmlFor="numberOfDives">{t('centerOwner.numberOfDives', 'Number of Dives')}</Label>
              <Input id="numberOfDives" type="number" {...register('numberOfDives', { valueAsNumber: true })} min="1" />
            </div>

            <div>
              <Label>{t('centerOwner.minCertification', 'Min Certification')}</Label>
              <Select value={watch('minCertificationLevel') || ''} onValueChange={(v) => setValue('minCertificationLevel', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('centerOwner.selectLevel', 'Select level')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('common.none', 'None')}</SelectItem>
                  {certificationLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="minLoggedDives">{t('centerOwner.minLoggedDives', 'Min Logged Dives')}</Label>
              <Input id="minLoggedDives" type="number" {...register('minLoggedDives', { valueAsNumber: true })} min="0" />
            </div>

            <div>
              <Label htmlFor="minAge">{t('centerOwner.minAge', 'Min Age')}</Label>
              <Input id="minAge" type="number" {...register('minAge', { valueAsNumber: true })} min="10" />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('centerOwner.pricing', 'Pricing')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div>
              <Label htmlFor="pricePerPersonSar">{t('centerOwner.pricePerPerson', 'Price per Person (SAR)')} *</Label>
              <Input id="pricePerPersonSar" type="number" {...register('pricePerPersonSar', { valueAsNumber: true })} min="0" step="0.01" />
              {errors.pricePerPersonSar && <p className="mt-1 text-sm text-destructive">{errors.pricePerPersonSar.message}</p>}
            </div>

            <div>
              <Label htmlFor="equipmentRentalPriceSar">{t('centerOwner.equipmentRental', 'Equipment Rental (SAR)')}</Label>
              <Input id="equipmentRentalPriceSar" type="number" {...register('equipmentRentalPriceSar', { valueAsNumber: true })} min="0" step="0.01" />
            </div>

            <div>
              <Label htmlFor="cancellationDeadlineHours">{t('centerOwner.cancellationDeadline', 'Cancellation Deadline (hours)')}</Label>
              <Input id="cancellationDeadlineHours" type="number" {...register('cancellationDeadlineHours', { valueAsNumber: true })} min="0" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="includesEquipment" {...register('includesEquipment')} className="h-4 w-4" />
              <Label htmlFor="includesEquipment">{t('centerOwner.includesEquipment', 'Includes Equipment')}</Label>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="includesMeals" {...register('includesMeals')} className="h-4 w-4" />
              <Label htmlFor="includesMeals">{t('centerOwner.includesMeals', 'Includes Meals')}</Label>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="includesRefreshments" {...register('includesRefreshments')} className="h-4 w-4" />
              <Label htmlFor="includesRefreshments">{t('centerOwner.includesRefreshments', 'Includes Refreshments')}</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/center/trips')}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {isEditing ? t('common.save', 'Save Changes') : t('centerOwner.saveDraft', 'Save as Draft')}
          </Button>
          {isEditing && existingTrip?.status === 'draft' && (
            <Button
              type="button"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="me-2 h-4 w-4" />
              )}
              {t('centerOwner.publish', 'Publish Trip')}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
