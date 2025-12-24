import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Search, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="container flex min-h-[calc(100vh-200px)] flex-col items-center justify-center py-12 text-center">
      <div className="relative">
        <Waves className="h-32 w-32 text-primary/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-bold text-primary">404</span>
        </div>
      </div>

      <h1 className="mt-8 text-3xl font-bold">{t('notFound.title', 'Page Not Found')}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        {t('notFound.description', "The page you're looking for doesn't exist or has been moved. Let's get you back on track.")}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            {t('notFound.home', 'Go Home')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/trips">
            <Search className="mr-2 h-4 w-4" />
            {t('notFound.browseTrips', 'Browse Trips')}
          </Link>
        </Button>
      </div>

      <div className="mt-12">
        <p className="text-sm text-muted-foreground">
          {t('notFound.lostDiver', 'Lost like a diver without a compass?')}
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('notFound.goBack', 'Go back to previous page')}
        </button>
      </div>
    </div>
  );
}
