import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Phone,
  Award,
  Shield,
  Loader2,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/store';
import { formatDate } from '@/lib/utils';
import type { Certification, DiverProfile } from '@/types';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'emergency', label: 'Emergency Contact', icon: Shield },
];

const profileSchema = z.object({
  firstNameEn: z.string().min(1, 'First name is required'),
  lastNameEn: z.string().min(1, 'Last name is required'),
  firstNameAr: z.string().optional(),
  lastNameAr: z.string().optional(),
  nationality: z.string().optional(),
  experienceLevel: z.string().optional(),
  bioEn: z.string().optional(),
  bioAr: z.string().optional(),
});

const emergencySchema = z.object({
  emergencyContactName: z.string().min(1, 'Contact name is required'),
  emergencyContactPhone: z.string().min(1, 'Contact phone is required'),
  emergencyContactRelationship: z.string().min(1, 'Relationship is required'),
});

const certificationSchema = z.object({
  agency: z.string().min(1, 'Certification agency is required'),
  certificationType: z.string().min(1, 'Certification type is required'),
  certificationNumber: z.string().optional(),
  certificationLevel: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type EmergencyFormData = z.infer<typeof emergencySchema>;
type CertificationFormData = z.infer<typeof certificationSchema>;

const verificationIcons = {
  pending: Clock,
  verified: CheckCircle,
  rejected: XCircle,
};

const verificationColors = {
  pending: 'text-yellow-600 bg-yellow-100',
  verified: 'text-green-600 bg-green-100',
  rejected: 'text-red-600 bg-red-100',
};

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [showAddCert, setShowAddCert] = useState(false);

  const { data: diverProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['diver-profile', user?.id],
    queryFn: () => usersApi.getDiverProfile(user!.id),
    enabled: !!user?.id,
  });

  const { data: certifications, isLoading: certsLoading } = useQuery({
    queryKey: ['certifications', user?.id],
    queryFn: () => usersApi.getCertifications(user!.id),
    enabled: !!user?.id,
  });

  if (!user) {
    return null;
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('profile.title', 'My Profile')}</h1>
        <p className="text-muted-foreground">{t('profile.subtitle', 'Manage your profile information')}</p>
      </div>

      {/* User summary card */}
      <Card className="mb-8">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-10 w-10" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {diverProfile?.firstNameEn} {diverProfile?.lastNameEn}
            </h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
              {user.phoneNumber && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {user.phoneNumber}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                {user.preferredLanguage === 'ar' ? 'Arabic' : 'English'}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
                {user.role.replace('_', ' ')}
              </span>
              {diverProfile && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  {diverProfile.totalLoggedDives} dives logged
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`profile.tabs.${tab.id}`, tab.label)}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <ProfileTab
          profile={diverProfile}
          isLoading={profileLoading}
          userId={user.id}
        />
      )}
      {activeTab === 'certifications' && (
        <CertificationsTab
          certifications={certifications || []}
          isLoading={certsLoading}
          userId={user.id}
          showAddForm={showAddCert}
          onToggleAddForm={() => setShowAddCert(!showAddCert)}
        />
      )}
      {activeTab === 'emergency' && (
        <EmergencyTab
          profile={diverProfile}
          isLoading={profileLoading}
          userId={user.id}
        />
      )}
    </div>
  );
}

function ProfileTab({
  profile,
  isLoading,
  userId,
}: {
  profile?: DiverProfile;
  isLoading: boolean;
  userId: string;
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile || {},
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) => usersApi.updateDiverProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diver-profile', userId] });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('profile.personalInfo', 'Personal Information')}</CardTitle>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            {t('common.edit', 'Edit')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">{t('profile.firstName', 'First Name')}</Label>
              <p className="font-medium">{profile?.firstNameEn || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('profile.lastName', 'Last Name')}</Label>
              <p className="font-medium">{profile?.lastNameEn || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('profile.dateOfBirth', 'Date of Birth')}</Label>
              <p className="font-medium">{profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('profile.nationality', 'Nationality')}</Label>
              <p className="font-medium">{profile?.nationality || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('profile.experienceLevel', 'Experience Level')}</Label>
              <p className="font-medium capitalize">{profile?.experienceLevel?.replace('_', ' ') || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('profile.totalDives', 'Total Logged Dives')}</Label>
              <p className="font-medium">{profile?.totalLoggedDives || 0}</p>
            </div>
          </div>
          {profile?.bioEn && (
            <div>
              <Label className="text-muted-foreground">{t('profile.bio', 'Bio')}</Label>
              <p className="mt-1">{profile.bioEn}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.editProfile', 'Edit Profile')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstNameEn">{t('profile.firstName', 'First Name')} (English)</Label>
              <Input id="firstNameEn" {...register('firstNameEn')} />
              {errors.firstNameEn && (
                <p className="text-sm text-destructive">{errors.firstNameEn.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastNameEn">{t('profile.lastName', 'Last Name')} (English)</Label>
              <Input id="lastNameEn" {...register('lastNameEn')} />
              {errors.lastNameEn && (
                <p className="text-sm text-destructive">{errors.lastNameEn.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstNameAr">{t('profile.firstName', 'First Name')} (Arabic)</Label>
              <Input id="firstNameAr" {...register('firstNameAr')} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastNameAr">{t('profile.lastName', 'Last Name')} (Arabic)</Label>
              <Input id="lastNameAr" {...register('lastNameAr')} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">{t('profile.nationality', 'Nationality')}</Label>
              <Input id="nationality" {...register('nationality')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">{t('profile.experienceLevel', 'Experience Level')}</Label>
              <select
                id="experienceLevel"
                {...register('experienceLevel')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="professional">Professional</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bioEn">{t('profile.bio', 'Bio')} (English)</Label>
            <textarea
              id="bioEn"
              {...register('bioEn')}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save', 'Save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">{t('common.errorSaving', 'Error saving profile')}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function CertificationsTab({
  certifications,
  isLoading,
  userId,
  showAddForm,
  onToggleAddForm,
}: {
  certifications: Certification[];
  isLoading: boolean;
  userId: string;
  showAddForm: boolean;
  onToggleAddForm: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CertificationFormData>({
    resolver: zodResolver(certificationSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CertificationFormData) => usersApi.addCertification(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications', userId] });
      reset();
      onToggleAddForm();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('profile.certifications', 'Certifications')}</h3>
        <Button onClick={onToggleAddForm} variant={showAddForm ? 'outline' : 'default'}>
          <Plus className="mr-2 h-4 w-4" />
          {showAddForm ? t('common.cancel', 'Cancel') : t('profile.addCertification', 'Add Certification')}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.addCertification', 'Add Certification')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agency">{t('profile.agency', 'Certification Agency')} *</Label>
                  <select
                    id="agency"
                    {...register('agency')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select agency</option>
                    <option value="PADI">PADI</option>
                    <option value="SSI">SSI</option>
                    <option value="NAUI">NAUI</option>
                    <option value="SDI">SDI</option>
                    <option value="CMAS">CMAS</option>
                    <option value="BSAC">BSAC</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.agency && (
                    <p className="text-sm text-destructive">{errors.agency.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificationType">{t('profile.certType', 'Certification Type')} *</Label>
                  <select
                    id="certificationType"
                    {...register('certificationType')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="open_water">Open Water</option>
                    <option value="advanced_open_water">Advanced Open Water</option>
                    <option value="rescue_diver">Rescue Diver</option>
                    <option value="divemaster">Divemaster</option>
                    <option value="instructor">Instructor</option>
                    <option value="specialty">Specialty</option>
                  </select>
                  {errors.certificationType && (
                    <p className="text-sm text-destructive">{errors.certificationType.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificationNumber">{t('profile.certNumber', 'Certification Number')}</Label>
                  <Input id="certificationNumber" {...register('certificationNumber')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificationLevel">{t('profile.certLevel', 'Level')}</Label>
                  <Input id="certificationLevel" {...register('certificationLevel')} placeholder="e.g., 1 Star, Level 2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issueDate">{t('profile.issueDate', 'Issue Date')}</Label>
                  <Input id="issueDate" type="date" {...register('issueDate')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">{t('profile.expiryDate', 'Expiry Date')}</Label>
                  <Input id="expiryDate" type="date" {...register('expiryDate')} />
                </div>
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save', 'Save')}
              </Button>
              {mutation.isError && (
                <p className="text-sm text-destructive">{t('common.errorSaving', 'Error adding certification')}</p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {certifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Award className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">{t('profile.noCertifications', 'No certifications yet')}</h3>
            <p className="mt-2 text-muted-foreground">
              {t('profile.addCertificationsPrompt', 'Add your diving certifications to unlock more trips')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certifications.map((cert) => {
            const StatusIcon = verificationIcons[cert.verificationStatus];
            return (
              <Card key={cert.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{cert.agency}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            verificationColors[cert.verificationStatus]
                          }`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {cert.verificationStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-sm capitalize text-muted-foreground">
                        {cert.certificationType.replace('_', ' ')}
                        {cert.certificationLevel && ` - ${cert.certificationLevel}`}
                      </p>
                      {cert.certificationNumber && (
                        <p className="mt-1 text-xs text-muted-foreground">#{cert.certificationNumber}</p>
                      )}
                    </div>
                    <Award className="h-8 w-8 text-primary/50" />
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    {cert.issueDate && (
                      <span>Issued: {formatDate(cert.issueDate)}</span>
                    )}
                    {cert.expiryDate && (
                      <span>Expires: {formatDate(cert.expiryDate)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmergencyTab({
  profile,
  isLoading,
  userId,
}: {
  profile?: DiverProfile;
  isLoading: boolean;
  userId: string;
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmergencyFormData>({
    resolver: zodResolver(emergencySchema),
    defaultValues: {
      emergencyContactName: profile?.emergencyContactName || '',
      emergencyContactPhone: profile?.emergencyContactPhone || '',
      emergencyContactRelationship: profile?.emergencyContactRelationship || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EmergencyFormData) => usersApi.updateDiverProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diver-profile', userId] });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasEmergencyContact = profile?.emergencyContactName && profile?.emergencyContactPhone;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('profile.emergencyContact', 'Emergency Contact')}</CardTitle>
          {!hasEmergencyContact && (
            <p className="mt-1 flex items-center gap-1 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              {t('profile.emergencyRequired', 'Emergency contact is required for diving trips')}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? t('common.cancel', 'Cancel') : t('common.edit', 'Edit')}
        </Button>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">{t('profile.contactName', 'Contact Name')} *</Label>
                <Input id="emergencyContactName" {...register('emergencyContactName')} />
                {errors.emergencyContactName && (
                  <p className="text-sm text-destructive">{errors.emergencyContactName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">{t('profile.contactPhone', 'Contact Phone')} *</Label>
                <Input id="emergencyContactPhone" {...register('emergencyContactPhone')} />
                {errors.emergencyContactPhone && (
                  <p className="text-sm text-destructive">{errors.emergencyContactPhone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">{t('profile.relationship', 'Relationship')} *</Label>
                <select
                  id="emergencyContactRelationship"
                  {...register('emergencyContactRelationship')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="child">Child</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
                {errors.emergencyContactRelationship && (
                  <p className="text-sm text-destructive">{errors.emergencyContactRelationship.message}</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save', 'Save')}
            </Button>
          </form>
        ) : hasEmergencyContact ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">{t('profile.contactName', 'Contact Name')}</Label>
              <p className="font-medium">{profile.emergencyContactName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('profile.contactPhone', 'Contact Phone')}</Label>
              <p className="font-medium">{profile.emergencyContactPhone}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('profile.relationship', 'Relationship')}</Label>
              <p className="font-medium capitalize">{profile.emergencyContactRelationship}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {t('profile.noEmergencyContact', 'No emergency contact set')}
            </p>
            <Button className="mt-4" onClick={() => setIsEditing(true)}>
              {t('profile.addEmergencyContact', 'Add Emergency Contact')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
