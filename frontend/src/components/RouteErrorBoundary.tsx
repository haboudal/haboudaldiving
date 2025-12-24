import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RouteErrorBoundary() {
  const error = useRouteError();

  let title = 'Something went wrong';
  let description = 'An unexpected error occurred while loading this page.';
  let statusCode: number | null = null;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    switch (error.status) {
      case 404:
        title = 'Page not found';
        description = "The page you're looking for doesn't exist or has been moved.";
        break;
      case 401:
        title = 'Unauthorized';
        description = 'You need to be logged in to access this page.';
        break;
      case 403:
        title = 'Access denied';
        description = "You don't have permission to access this page.";
        break;
      case 500:
        title = 'Server error';
        description = 'Something went wrong on our end. Please try again later.';
        break;
      default:
        description = error.statusText || description;
    }
  } else if (error instanceof Error) {
    if (import.meta.env.DEV) {
      description = error.message;
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            {statusCode ? (
              <span className="text-2xl font-bold text-destructive">{statusCode}</span>
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button asChild className="flex-1">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
