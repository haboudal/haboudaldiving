import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Star,
  Mail,
  Globe,
  Loader2,
  Building2,
  Search,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { centersApi } from '@/api/centers';
import type { DivingCenter } from '@/types';

const cities = [
  { value: '', label: 'All Cities' },
  { value: 'jeddah', label: 'Jeddah' },
  { value: 'yanbu', label: 'Yanbu' },
  { value: 'dammam', label: 'Dammam' },
  { value: 'khobar', label: 'Al Khobar' },
  { value: 'jubail', label: 'Jubail' },
  { value: 'tabuk', label: 'Tabuk' },
];

export function CentersPage() {
  const { t, i18n } = useTranslation();
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const isArabic = i18n.language === 'ar';

  const { data, isLoading, error } = useQuery({
    queryKey: ['centers', selectedCity],
    queryFn: () => centersApi.list({ city: selectedCity || undefined }),
  });

  const centers = data?.centers || [];
  const filteredCenters = centers.filter((center) => {
    if (!searchQuery) return true;
    const name = isArabic ? center.nameAr || center.nameEn : center.nameEn;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('centers.title', 'Dive Centers')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('centers.subtitle', 'Find certified diving centers across Saudi Arabia')}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('centers.searchPlaceholder', 'Search centers...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {cities.map((city) => (
            <Button
              key={city.value}
              variant={selectedCity === city.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCity(city.value)}
              className="whitespace-nowrap"
            >
              {city.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-destructive">{t('common.errorLoading', 'Error loading data')}</p>
        </div>
      ) : filteredCenters.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('centers.noCenters', 'No centers found')}</h3>
          <p className="mt-2 text-muted-foreground">
            {t('centers.tryDifferentFilter', 'Try a different city or search term')}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCenters.map((center) => (
            <CenterCard key={center.id} center={center} isArabic={isArabic} />
          ))}
        </div>
      )}
    </div>
  );
}

function CenterCard({ center, isArabic }: { center: DivingCenter; isArabic: boolean }) {
  const { t } = useTranslation();
  const name = isArabic ? center.nameAr || center.nameEn : center.nameEn;
  const description = isArabic
    ? center.descriptionAr || center.descriptionEn
    : center.descriptionEn;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <Link to={`/centers/${center.id}`} className="block p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{name}</h3>
                {center.status === 'active' && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {t('centers.verified', 'Verified')}
                  </span>
                )}
              </div>

              {description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {center.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {center.city}
                  </span>
                )}
                {center.ratingAverage > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {center.ratingAverage.toFixed(1)} ({center.totalReviews})
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {center.email && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {center.email}
                  </span>
                )}
                {center.website && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    Website
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
