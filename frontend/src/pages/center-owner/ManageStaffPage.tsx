import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Plus,
  Users,
  UserCog,
  Trash2,
  Ship,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { centerOwnerApi } from '@/api/centers';
import type { CenterStaff, StaffRole, Vessel } from '@/types';

const useCenterId = () => 'mock-center-id';

const staffSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['manager', 'instructor', 'divemaster', 'boat_captain', 'crew', 'admin']),
  employeeNumber: z.string().optional(),
});

const vesselSchema = z.object({
  nameEn: z.string().min(1, 'Vessel name is required'),
  nameAr: z.string().optional(),
  vesselType: z.string().min(1, 'Vessel type is required'),
  registrationNumber: z.string().optional(),
  capacity: z.number().min(1, 'Capacity is required'),
  manufacturerYear: z.number().optional(),
  lengthMeters: z.number().optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;
type VesselFormData = z.infer<typeof vesselSchema>;

const roleLabels: Record<StaffRole, string> = {
  manager: 'Manager',
  instructor: 'Instructor',
  divemaster: 'Divemaster',
  boat_captain: 'Boat Captain',
  crew: 'Crew',
  admin: 'Admin',
};

const roleColors: Record<StaffRole, string> = {
  manager: 'bg-purple-100 text-purple-700',
  instructor: 'bg-blue-100 text-blue-700',
  divemaster: 'bg-green-100 text-green-700',
  boat_captain: 'bg-yellow-100 text-yellow-700',
  crew: 'bg-gray-100 text-gray-700',
  admin: 'bg-red-100 text-red-700',
};

const vesselTypes = [
  { value: 'speedboat', label: 'Speedboat' },
  { value: 'dhow', label: 'Dhow' },
  { value: 'yacht', label: 'Yacht' },
  { value: 'catamaran', label: 'Catamaran' },
  { value: 'liveaboard', label: 'Liveaboard' },
];

export function ManageStaffPage() {
  const { t } = useTranslation();
  const centerId = useCenterId();
  const queryClient = useQueryClient();
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showVesselForm, setShowVesselForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'staff' | 'vessels'>('staff');

  // Staff queries
  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['center-staff', centerId],
    queryFn: () => centerOwnerApi.getStaff(centerId),
  });

  // Vessel queries
  const { data: vessels = [], isLoading: loadingVessels } = useQuery({
    queryKey: ['center-vessels', centerId],
    queryFn: () => centerOwnerApi.getVessels(centerId),
  });

  // Staff form
  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'instructor' },
  });

  // Vessel form
  const vesselForm = useForm<VesselFormData>({
    resolver: zodResolver(vesselSchema),
    defaultValues: { vesselType: 'speedboat', capacity: 12 },
  });

  // Staff mutations
  const addStaffMutation = useMutation({
    mutationFn: (data: StaffFormData) => centerOwnerApi.addStaff(centerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-staff'] });
      setShowStaffForm(false);
      staffForm.reset();
    },
  });

  const removeStaffMutation = useMutation({
    mutationFn: (staffId: string) => centerOwnerApi.removeStaff(centerId, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-staff'] });
    },
  });

  // Vessel mutations
  const addVesselMutation = useMutation({
    mutationFn: (data: VesselFormData) => centerOwnerApi.createVessel(centerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-vessels'] });
      setShowVesselForm(false);
      vesselForm.reset();
    },
  });

  const deleteVesselMutation = useMutation({
    mutationFn: (vesselId: string) => centerOwnerApi.deleteVessel(centerId, vesselId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-vessels'] });
    },
  });

  const onAddStaff = (data: StaffFormData) => {
    addStaffMutation.mutate(data);
  };

  const onAddVessel = (data: VesselFormData) => {
    addVesselMutation.mutate(data);
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('centerOwner.manageStaffVessels', 'Staff & Vessels')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('centerOwner.staffDescription', 'Manage your team members and vessels')}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'staff'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          {t('centerOwner.staff', 'Staff')} ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab('vessels')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'vessels'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ship className="h-4 w-4" />
          {t('centerOwner.vessels', 'Vessels')} ({vessels.length})
        </button>
      </div>

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div>
          {/* Add Staff Button */}
          <div className="mb-6 flex justify-end">
            <Button onClick={() => setShowStaffForm(true)}>
              <Plus className="me-2 h-4 w-4" />
              {t('centerOwner.addStaff', 'Add Staff Member')}
            </Button>
          </div>

          {/* Add Staff Form */}
          {showStaffForm && (
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('centerOwner.addStaffMember', 'Add Staff Member')}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowStaffForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={staffForm.handleSubmit(onAddStaff)} className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="email">{t('common.email', 'Email')} *</Label>
                    <Input id="email" type="email" {...staffForm.register('email')} />
                    {staffForm.formState.errors.email && (
                      <p className="mt-1 text-sm text-destructive">{staffForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t('centerOwner.role', 'Role')} *</Label>
                    <Select
                      value={staffForm.watch('role')}
                      onValueChange={(v) => staffForm.setValue('role', v as StaffRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="employeeNumber">{t('centerOwner.employeeNumber', 'Employee #')}</Label>
                    <Input id="employeeNumber" {...staffForm.register('employeeNumber')} />
                  </div>
                  <div className="sm:col-span-3">
                    <Button type="submit" disabled={addStaffMutation.isPending}>
                      {addStaffMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                      {t('centerOwner.sendInvite', 'Send Invite')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Staff List */}
          {loadingStaff ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : staff.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">
                  {t('centerOwner.noStaff', 'No staff members yet')}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {t('centerOwner.addFirstStaff', 'Add your first staff member to get started')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((member: CenterStaff) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <UserCog className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{member.userName || 'Pending'}</p>
                          <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(t('centerOwner.confirmRemove', 'Are you sure you want to remove this staff member?'))) {
                            removeStaffMutation.mutate(member.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${roleColors[member.role]}`}>
                        {roleLabels[member.role]}
                      </span>
                      {member.employeeNumber && (
                        <span className="text-sm text-muted-foreground">#{member.employeeNumber}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vessels Tab */}
      {activeTab === 'vessels' && (
        <div>
          {/* Add Vessel Button */}
          <div className="mb-6 flex justify-end">
            <Button onClick={() => setShowVesselForm(true)}>
              <Plus className="me-2 h-4 w-4" />
              {t('centerOwner.addVessel', 'Add Vessel')}
            </Button>
          </div>

          {/* Add Vessel Form */}
          {showVesselForm && (
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('centerOwner.addVessel', 'Add Vessel')}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowVesselForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={vesselForm.handleSubmit(onAddVessel)} className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="vesselName">{t('centerOwner.vesselName', 'Vessel Name')} *</Label>
                    <Input id="vesselName" {...vesselForm.register('nameEn')} />
                    {vesselForm.formState.errors.nameEn && (
                      <p className="mt-1 text-sm text-destructive">{vesselForm.formState.errors.nameEn.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t('centerOwner.vesselType', 'Type')} *</Label>
                    <Select
                      value={vesselForm.watch('vesselType')}
                      onValueChange={(v) => vesselForm.setValue('vesselType', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {vesselTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="capacity">{t('centerOwner.capacity', 'Capacity')} *</Label>
                    <Input id="capacity" type="number" {...vesselForm.register('capacity', { valueAsNumber: true })} min="1" />
                    {vesselForm.formState.errors.capacity && (
                      <p className="mt-1 text-sm text-destructive">{vesselForm.formState.errors.capacity.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="regNumber">{t('centerOwner.registrationNumber', 'Registration #')}</Label>
                    <Input id="regNumber" {...vesselForm.register('registrationNumber')} />
                  </div>
                  <div>
                    <Label htmlFor="year">{t('centerOwner.manufacturerYear', 'Year')}</Label>
                    <Input id="year" type="number" {...vesselForm.register('manufacturerYear', { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label htmlFor="length">{t('centerOwner.length', 'Length (m)')}</Label>
                    <Input id="length" type="number" step="0.1" {...vesselForm.register('lengthMeters', { valueAsNumber: true })} />
                  </div>
                  <div className="sm:col-span-3">
                    <Button type="submit" disabled={addVesselMutation.isPending}>
                      {addVesselMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                      {t('centerOwner.addVessel', 'Add Vessel')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Vessels List */}
          {loadingVessels ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : vessels.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ship className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">
                  {t('centerOwner.noVessels', 'No vessels yet')}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {t('centerOwner.addFirstVessel', 'Add your first vessel to assign to trips')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vessels.map((vessel: Vessel) => (
                <Card key={vessel.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Ship className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{vessel.nameEn}</p>
                          <p className="text-sm text-muted-foreground capitalize">{vessel.vesselType}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(t('centerOwner.confirmDeleteVessel', 'Are you sure you want to delete this vessel?'))) {
                            deleteVesselMutation.mutate(vessel.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('centerOwner.capacity', 'Capacity')}:</span>
                        <span className="ms-1 font-medium">{vessel.capacity} divers</span>
                      </div>
                      {vessel.registrationNumber && (
                        <div>
                          <span className="text-muted-foreground">{t('centerOwner.reg', 'Reg')}:</span>
                          <span className="ms-1 font-medium">{vessel.registrationNumber}</span>
                        </div>
                      )}
                      {vessel.manufacturerYear && (
                        <div>
                          <span className="text-muted-foreground">{t('centerOwner.year', 'Year')}:</span>
                          <span className="ms-1 font-medium">{vessel.manufacturerYear}</span>
                        </div>
                      )}
                      {vessel.lengthMeters && (
                        <div>
                          <span className="text-muted-foreground">{t('centerOwner.length', 'Length')}:</span>
                          <span className="ms-1 font-medium">{vessel.lengthMeters}m</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        vessel.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {vessel.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
