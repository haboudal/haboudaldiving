import { useTranslation } from 'react-i18next';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface TripFiltersState {
  search: string;
  diveType: string;
  minPrice: string;
  maxPrice: string;
  dateFrom: string;
  dateTo: string;
  difficulty: string;
}

interface TripFiltersProps {
  filters: TripFiltersState;
  onFilterChange: (filters: TripFiltersState) => void;
  onClearFilters: () => void;
}

const diveTypes = ['recreational', 'technical', 'night', 'wreck', 'deep', 'drift'];
const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];

export function TripFilters({ filters, onFilterChange, onClearFilters }: TripFiltersProps) {
  const { t } = useTranslation();

  const handleChange = (key: keyof TripFiltersState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{t('trips.filters')}</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="me-1 h-4 w-4" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Search */}
        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
          <Label htmlFor="search">{t('trips.search')}</Label>
          <div className="relative mt-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder={t('trips.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              className="ps-9"
            />
          </div>
        </div>

        {/* Dive Type */}
        <div>
          <Label htmlFor="diveType">{t('trips.diveType')}</Label>
          <select
            id="diveType"
            value={filters.diveType}
            onChange={(e) => handleChange('diveType', e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('common.all')}</option>
            {diveTypes.map((type) => (
              <option key={type} value={type}>
                {t(`trips.diveTypes.${type}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <Label htmlFor="difficulty">{t('trips.difficulty')}</Label>
          <select
            id="difficulty"
            value={filters.difficulty}
            onChange={(e) => handleChange('difficulty', e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('common.all')}</option>
            {difficulties.map((diff) => (
              <option key={diff} value={diff}>
                {t(`trips.difficulties.${diff}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="sm:col-span-2">
          <Label>{t('trips.priceRange')}</Label>
          <div className="mt-1 flex gap-2">
            <Input
              type="number"
              placeholder={t('trips.minPrice')}
              value={filters.minPrice}
              onChange={(e) => handleChange('minPrice', e.target.value)}
            />
            <Input
              type="number"
              placeholder={t('trips.maxPrice')}
              value={filters.maxPrice}
              onChange={(e) => handleChange('maxPrice', e.target.value)}
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="sm:col-span-2">
          <Label>{t('trips.dateRange')}</Label>
          <div className="mt-1 flex gap-2">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleChange('dateFrom', e.target.value)}
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
