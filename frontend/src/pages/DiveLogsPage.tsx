import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Waves,
  Loader2,
  Plus,
  Calendar,
  Clock,
  Thermometer,
  Eye,
  Gauge,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { diveLogsApi } from '@/api/diveLogs';
import { formatDate } from '@/lib/utils';
import type { DiveLog, DiveStatistics } from '@/types';

const diveLogSchema = z.object({
  diveDate: z.string().min(1, 'Dive date is required'),
  diveType: z.string().optional(),
  maxDepthMeters: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  bottomTimeMinutes: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  surfaceIntervalMinutes: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  entryType: z.string().optional(),
  waterType: z.string().optional(),
  visibility: z.string().optional(),
  waterTemperatureCelsius: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().optional()
  ),
  weightUsedKg: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  suitType: z.string().optional(),
  tankType: z.string().optional(),
  startPressureBar: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  endPressureBar: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  nitroxPercentage: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(21).max(40).optional()
  ),
  notesEn: z.string().optional(),
});

type DiveLogFormData = z.infer<typeof diveLogSchema>;

export function DiveLogsPage() {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['dive-logs'],
    queryFn: () => diveLogsApi.getMyLogs({ limit: 50 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['dive-statistics'],
    queryFn: () => diveLogsApi.getStatistics(),
  });

  const logs = logsData?.data || [];

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('diveLogs.title', 'Dive Logs')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('diveLogs.subtitle', 'Track and manage your diving history')}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('diveLogs.logDive', 'Log a Dive')}
        </Button>
      </div>

      {/* Statistics */}
      {stats && <StatisticsCards stats={stats} />}

      {/* Add Form */}
      {showAddForm && (
        <AddDiveLogForm
          onCancel={() => setShowAddForm(false)}
          onSuccess={() => setShowAddForm(false)}
        />
      )}

      {/* Logs List */}
      {logsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Waves className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">{t('diveLogs.noLogs', 'No dive logs yet')}</h3>
            <p className="mt-2 text-muted-foreground">
              {t('diveLogs.startLogging', 'Start logging your dives to track your progress')}
            </p>
            <Button className="mt-4" onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('diveLogs.logFirstDive', 'Log Your First Dive')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log: DiveLog) => (
            <DiveLogCard
              key={log.id}
              log={log}
              isExpanded={expandedLog === log.id}
              onToggle={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatisticsCards({ stats }: { stats: DiveStatistics }) {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t('diveLogs.stats.totalDives', 'Total Dives'),
      value: stats.totalDives,
      icon: Waves,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: t('diveLogs.stats.totalTime', 'Total Bottom Time'),
      value: `${Math.round(stats.totalBottomTime / 60)}h ${stats.totalBottomTime % 60}m`,
      icon: Clock,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: t('diveLogs.stats.deepest', 'Deepest Dive'),
      value: `${stats.deepestDive}m`,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      label: t('diveLogs.stats.thisMonth', 'This Month'),
      value: stats.divesThisMonth,
      icon: Calendar,
      color: 'text-orange-600 bg-orange-100',
    },
  ];

  return (
    <div className="mb-8 grid gap-4 md:grid-cols-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-lg p-3 ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AddDiveLogForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(diveLogSchema),
    defaultValues: {
      diveDate: new Date().toISOString().split('T')[0],
    },
  });

  const mutation = useMutation({
    mutationFn: (data: DiveLogFormData) => diveLogsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dive-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dive-statistics'] });
      reset();
      onSuccess();
    },
  });

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t('diveLogs.addDiveLog', 'Log a New Dive')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data as DiveLogFormData))} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="diveDate">{t('diveLogs.date', 'Dive Date')} *</Label>
              <Input id="diveDate" type="date" {...register('diveDate')} />
              {errors.diveDate && (
                <p className="text-sm text-destructive">{errors.diveDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="diveType">{t('diveLogs.type', 'Dive Type')}</Label>
              <select
                id="diveType"
                {...register('diveType')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select type</option>
                <option value="recreational">Recreational</option>
                <option value="training">Training</option>
                <option value="night">Night Dive</option>
                <option value="drift">Drift Dive</option>
                <option value="wreck">Wreck Dive</option>
                <option value="deep">Deep Dive</option>
                <option value="shore">Shore Dive</option>
                <option value="boat">Boat Dive</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryType">{t('diveLogs.entry', 'Entry Type')}</Label>
              <select
                id="entryType"
                {...register('entryType')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select entry</option>
                <option value="shore">Shore</option>
                <option value="boat">Boat</option>
                <option value="pier">Pier/Dock</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="maxDepthMeters">{t('diveLogs.maxDepth', 'Max Depth (m)')}</Label>
              <Input
                id="maxDepthMeters"
                type="number"
                step="0.1"
                {...register('maxDepthMeters')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bottomTimeMinutes">{t('diveLogs.bottomTime', 'Bottom Time (min)')}</Label>
              <Input
                id="bottomTimeMinutes"
                type="number"
                {...register('bottomTimeMinutes')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surfaceIntervalMinutes">{t('diveLogs.surfaceInterval', 'Surface Interval (min)')}</Label>
              <Input
                id="surfaceIntervalMinutes"
                type="number"
                {...register('surfaceIntervalMinutes')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waterTemperatureCelsius">{t('diveLogs.waterTemp', 'Water Temp (C)')}</Label>
              <Input
                id="waterTemperatureCelsius"
                type="number"
                {...register('waterTemperatureCelsius')}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="visibility">{t('diveLogs.visibility', 'Visibility')}</Label>
              <select
                id="visibility"
                {...register('visibility')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="excellent">Excellent (20m+)</option>
                <option value="good">Good (10-20m)</option>
                <option value="moderate">Moderate (5-10m)</option>
                <option value="poor">Poor (&lt;5m)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waterType">{t('diveLogs.waterType', 'Water Type')}</Label>
              <select
                id="waterType"
                {...register('waterType')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="salt">Salt Water</option>
                <option value="fresh">Fresh Water</option>
                <option value="brackish">Brackish</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightUsedKg">{t('diveLogs.weight', 'Weight (kg)')}</Label>
              <Input id="weightUsedKg" type="number" step="0.5" {...register('weightUsedKg')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suitType">{t('diveLogs.suit', 'Suit Type')}</Label>
              <select
                id="suitType"
                {...register('suitType')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="none">None/Skin</option>
                <option value="shorty">Shorty (3mm)</option>
                <option value="wetsuit_3mm">Wetsuit 3mm</option>
                <option value="wetsuit_5mm">Wetsuit 5mm</option>
                <option value="wetsuit_7mm">Wetsuit 7mm</option>
                <option value="drysuit">Drysuit</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tankType">{t('diveLogs.tank', 'Tank Type')}</Label>
              <select
                id="tankType"
                {...register('tankType')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="al80">Aluminum 80</option>
                <option value="al63">Aluminum 63</option>
                <option value="steel">Steel</option>
                <option value="doubles">Doubles</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startPressureBar">{t('diveLogs.startPressure', 'Start PSI/Bar')}</Label>
              <Input id="startPressureBar" type="number" {...register('startPressureBar')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endPressureBar">{t('diveLogs.endPressure', 'End PSI/Bar')}</Label>
              <Input id="endPressureBar" type="number" {...register('endPressureBar')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nitroxPercentage">{t('diveLogs.nitrox', 'Nitrox %')}</Label>
              <Input
                id="nitroxPercentage"
                type="number"
                min="21"
                max="40"
                placeholder="21"
                {...register('nitroxPercentage')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notesEn">{t('diveLogs.notes', 'Notes')}</Label>
            <textarea
              id="notesEn"
              {...register('notesEn')}
              rows={3}
              placeholder="Wildlife seen, conditions, memorable moments..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save', 'Save Dive Log')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">{t('common.errorSaving', 'Error saving dive log')}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function DiveLogCard({
  log,
  isExpanded,
  onToggle,
}: {
  log: DiveLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => diveLogsApi.delete(log.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dive-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dive-statistics'] });
    },
  });

  return (
    <Card>
      <CardContent className="p-0">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-lg font-bold">#{log.diveNumber}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatDate(log.diveDate)}</span>
                {log.verifiedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {log.maxDepthMeters && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {log.maxDepthMeters}m
                  </span>
                )}
                {log.bottomTimeMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {log.bottomTimeMinutes}min
                  </span>
                )}
                {log.diveType && (
                  <span className="capitalize">{log.diveType.replace('_', ' ')}</span>
                )}
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t p-4">
            <div className="grid gap-4 md:grid-cols-4">
              {log.waterTemperatureCelsius && (
                <div>
                  <Label className="text-muted-foreground">Water Temp</Label>
                  <p className="flex items-center gap-1 font-medium">
                    <Thermometer className="h-4 w-4" />
                    {log.waterTemperatureCelsius}°C
                  </p>
                </div>
              )}
              {log.visibility && (
                <div>
                  <Label className="text-muted-foreground">Visibility</Label>
                  <p className="flex items-center gap-1 font-medium capitalize">
                    <Eye className="h-4 w-4" />
                    {log.visibility}
                  </p>
                </div>
              )}
              {log.startPressureBar && log.endPressureBar && (
                <div>
                  <Label className="text-muted-foreground">Air Consumption</Label>
                  <p className="flex items-center gap-1 font-medium">
                    <Gauge className="h-4 w-4" />
                    {log.startPressureBar} → {log.endPressureBar} bar
                  </p>
                </div>
              )}
              {log.weightUsedKg && (
                <div>
                  <Label className="text-muted-foreground">Weight</Label>
                  <p className="font-medium">{log.weightUsedKg} kg</p>
                </div>
              )}
              {log.suitType && (
                <div>
                  <Label className="text-muted-foreground">Suit</Label>
                  <p className="font-medium capitalize">{log.suitType.replace('_', ' ')}</p>
                </div>
              )}
              {log.entryType && (
                <div>
                  <Label className="text-muted-foreground">Entry</Label>
                  <p className="font-medium capitalize">{log.entryType}</p>
                </div>
              )}
              {log.nitroxPercentage && log.nitroxPercentage !== 21 && (
                <div>
                  <Label className="text-muted-foreground">Nitrox</Label>
                  <p className="font-medium">{log.nitroxPercentage}%</p>
                </div>
              )}
            </div>

            {log.notesEn && (
              <div className="mt-4">
                <Label className="text-muted-foreground">Notes</Label>
                <p className="mt-1">{log.notesEn}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
