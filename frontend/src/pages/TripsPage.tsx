import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Anchor } from 'lucide-react';
import { TripCard, TripFilters } from '@/components/trips';
import type { TripFiltersState } from '@/components/trips';
import { tripsApi } from '@/api/trips';
import type { Trip, TripType } from '@/types';

const initialFilters: TripFiltersState = {
  search: '',
  diveType: '',
  minPrice: '',
  maxPrice: '',
  dateFrom: '',
  dateTo: '',
  difficulty: '',
};

export function TripsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<TripFiltersState>(initialFilters);

  const { data, isLoading, error } = useQuery({
    queryKey: ['trips', filters],
    queryFn: () =>
      tripsApi.list({
        tripType: filters.diveType ? (filters.diveType as TripType) : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        status: 'published',
        upcoming: true,
      }),
  });

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  // Filter trips client-side for search and price
  const filteredTrips = useMemo(() => {
    if (!data?.trips) return [];

    let result = data.trips;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (trip: Trip) =>
          trip.titleEn.toLowerCase().includes(searchLower) ||
          trip.titleAr?.toLowerCase().includes(searchLower) ||
          trip.centerName?.toLowerCase().includes(searchLower) ||
          trip.siteName?.toLowerCase().includes(searchLower)
      );
    }

    // Price filters
    if (filters.minPrice) {
      const minPrice = Number(filters.minPrice);
      result = result.filter((trip: Trip) => trip.pricePerPersonSar >= minPrice);
    }
    if (filters.maxPrice) {
      const maxPrice = Number(filters.maxPrice);
      result = result.filter((trip: Trip) => trip.pricePerPersonSar <= maxPrice);
    }

    return result;
  }, [data?.trips, filters.search, filters.minPrice, filters.maxPrice]);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('trips.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('trips.subtitle')}</p>
      </div>

      <TripFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {isLoading ? (
        <div className="mt-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="mt-12 text-center">
          <p className="text-destructive">{t('common.errorLoading')}</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <Anchor className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('trips.noTripsFound')}</h3>
          <p className="mt-2 text-muted-foreground">{t('trips.tryDifferentFilters')}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip: Trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
