import { Loader2 } from 'lucide-react';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingFallback({ message, fullScreen = false }: LoadingFallbackProps) {
  const containerClass = fullScreen
    ? 'flex min-h-screen items-center justify-center'
    : 'flex min-h-[400px] items-center justify-center';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

export function PageLoader() {
  return <LoadingFallback message="Loading..." />;
}

export function FullPageLoader() {
  return <LoadingFallback message="Loading..." fullScreen />;
}
