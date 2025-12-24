import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate } from '@/lib/utils';
import { useUIStore } from '@/store';
import type { Trip } from '@/types';

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const { t } = useTranslation();
  const { language } = useUIStore();

  const spotsLeft = trip.maxParticipants - trip.currentParticipants;
  const isFull = spotsLeft <= 0;
  const title = language === 'ar' && trip.titleAr ? trip.titleAr : trip.titleEn;

  // Calculate duration from departure and return times
  const departure = new Date(trip.departureDatetime);
  const returnTime = new Date(trip.returnDatetime);
  const durationHours = Math.round((returnTime.getTime() - departure.getTime()) / (1000 * 60 * 60));
  const durationStr = durationHours >= 24
    ? `${Math.round(durationHours / 24)} ${t('common.days')}`
    : `${durationHours} ${t('common.hours')}`;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative h-48 bg-ocean-100">
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-ocean-400 to-ocean-600">
          <MapPin className="h-12 w-12 text-white/50" />
        </div>
        {isFull && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-destructive px-4 py-1 text-sm font-semibold text-white">
              {t('trips.full')}
            </span>
          </div>
        )}
        <div className="absolute start-2 top-2 rounded bg-primary px-2 py-1 text-xs font-medium text-white">
          {t(`trips.tripTypes.${trip.tripType}`)}
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="line-clamp-1 font-semibold">{title}</h3>
            {trip.centerName && (
              <p className="text-sm text-muted-foreground">{trip.centerName}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(trip.departureDatetime)}</span>
          </div>
          {trip.siteName && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{trip.siteName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{durationStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {spotsLeft > 0
                ? t('trips.spotsLeft', { count: spotsLeft })
                : t('trips.noSpotsLeft')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <span className="text-lg font-bold text-primary">
              {formatPrice(trip.pricePerPersonSar)}
            </span>
            <span className="text-sm text-muted-foreground"> / {t('trips.perPerson')}</span>
          </div>
          <Button asChild disabled={isFull}>
            <Link to={`/trips/${trip.id}`}>
              {t('trips.viewDetails')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
