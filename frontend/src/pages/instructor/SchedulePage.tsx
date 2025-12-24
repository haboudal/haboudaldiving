import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { instructorApi } from '@/api/instructor';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function SchedulePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isSettingAvailable, setIsSettingAvailable] = useState(true);

  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const { data: availability, isLoading } = useQuery({
    queryKey: ['instructor-availability', currentMonth],
    queryFn: () => instructorApi.getAvailability(currentMonth),
  });

  const setAvailabilityMutation = useMutation({
    mutationFn: (dates: { date: string; isAvailable: boolean }[]) =>
      instructorApi.setAvailability(dates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-availability'] });
      setSelectedDates(new Set());
    },
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Add days from next month to complete the grid
    const endPadding = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Create availability map
  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    (availability || []).forEach(a => {
      map.set(a.date, a.isAvailable);
    });
    return map;
  }, [availability]);

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;

    const dateKey = formatDateKey(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return; // Can't modify past dates

    const newSelected = new Set(selectedDates);
    if (newSelected.has(dateKey)) {
      newSelected.delete(dateKey);
    } else {
      newSelected.add(dateKey);
    }
    setSelectedDates(newSelected);
  };

  const handleApplyChanges = () => {
    const dates = Array.from(selectedDates).map(date => ({
      date,
      isAvailable: isSettingAvailable,
    }));
    setAvailabilityMutation.mutate(dates);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('instructor.schedule', 'My Schedule')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('instructor.scheduleDescription', 'Manage your availability for diving trips')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {DAYS.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const dateKey = formatDateKey(date);
                    const isAvailable = availabilityMap.get(dateKey);
                    const isSelected = selectedDates.has(dateKey);
                    const isPast = date < today;
                    const isToday = date.toDateString() === today.toDateString();

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(date, isCurrentMonth)}
                        disabled={!isCurrentMonth || isPast}
                        className={cn(
                          'relative aspect-square rounded-lg p-2 text-sm transition-colors',
                          !isCurrentMonth && 'text-muted-foreground/30',
                          isCurrentMonth && !isPast && 'hover:bg-muted cursor-pointer',
                          isPast && 'text-muted-foreground/50 cursor-not-allowed',
                          isToday && 'ring-2 ring-primary',
                          isSelected && 'ring-2 ring-primary bg-primary/10',
                          isAvailable === true && !isSelected && 'bg-green-100',
                          isAvailable === false && !isSelected && 'bg-red-100',
                        )}
                      >
                        <span className={cn(
                          'block',
                          isToday && 'font-bold text-primary',
                        )}>
                          {date.getDate()}
                        </span>
                        {isAvailable !== undefined && isCurrentMonth && !isPast && (
                          <span className={cn(
                            'absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full',
                            isAvailable ? 'bg-green-500' : 'bg-red-500'
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle>{t('instructor.setAvailability', 'Set Availability')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('instructor.selectDates', 'Click on dates to select them, then choose to mark them as available or unavailable.')}
            </p>

            {selectedDates.size > 0 && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {t('instructor.selectedDates', '{{count}} dates selected', { count: selectedDates.size })}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from(selectedDates).slice(0, 5).map(date => (
                    <span key={date} className="rounded bg-muted px-2 py-0.5 text-xs">
                      {date}
                    </span>
                  ))}
                  {selectedDates.size > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{selectedDates.size - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">{t('instructor.markAs', 'Mark selected dates as:')}</p>
              <div className="flex gap-2">
                <Button
                  variant={isSettingAvailable ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setIsSettingAvailable(true)}
                >
                  <Check className="me-2 h-4 w-4" />
                  {t('instructor.available', 'Available')}
                </Button>
                <Button
                  variant={!isSettingAvailable ? 'destructive' : 'outline'}
                  className="flex-1"
                  onClick={() => setIsSettingAvailable(false)}
                >
                  <X className="me-2 h-4 w-4" />
                  {t('instructor.unavailable', 'Unavailable')}
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleApplyChanges}
              disabled={selectedDates.size === 0 || setAvailabilityMutation.isPending}
            >
              {setAvailabilityMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('instructor.applyChanges', 'Apply Changes')}
            </Button>

            <hr />

            {/* Legend */}
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('instructor.legend', 'Legend')}</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-green-100">
                    <span className="block h-1.5 w-1.5 mx-auto mt-1 rounded-full bg-green-500" />
                  </div>
                  <span>{t('instructor.availableDay', 'Available')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-red-100">
                    <span className="block h-1.5 w-1.5 mx-auto mt-1 rounded-full bg-red-500" />
                  </div>
                  <span>{t('instructor.unavailableDay', 'Unavailable')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded ring-2 ring-primary" />
                  <span>{t('instructor.today', 'Today')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-primary/10 ring-2 ring-primary" />
                  <span>{t('instructor.selected', 'Selected')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <h3 className="font-medium">{t('instructor.tips', 'Tips')}</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• {t('instructor.tip1', 'Set your availability in advance so center owners can assign you to trips')}</li>
            <li>• {t('instructor.tip2', 'You cannot modify availability for past dates')}</li>
            <li>• {t('instructor.tip3', 'Days without any status set are considered potentially available')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
