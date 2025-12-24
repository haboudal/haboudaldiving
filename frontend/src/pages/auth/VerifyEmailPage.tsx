import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/auth';

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const hasAttempted = useRef(false);

  const mutation = useMutation({
    mutationFn: () => authApi.verifyEmail(token!),
  });

  // Derive status from mutation state and token presence
  const status = !token
    ? 'error'
    : mutation.isSuccess
    ? 'success'
    : mutation.isError
    ? 'error'
    : 'loading';

  useEffect(() => {
    if (token && !hasAttempted.current) {
      hasAttempted.current = true;
      mutation.mutate();
    }
  }, [token, mutation]);

  if (status === 'loading') {
    return (
      <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-semibold">
              {t('auth.verifyingEmail', 'Verifying your email...')}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t('auth.pleaseWait', 'Please wait while we verify your email address.')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">
              {t('auth.emailVerified', 'Email Verified!')}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t('auth.emailVerifiedMessage', 'Your email has been verified successfully. You can now access all features.')}
            </p>
            <Button asChild className="mt-6">
              <Link to="/login">
                {t('auth.signIn', 'Sign In')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="mt-6 text-2xl font-bold">
            {t('auth.verificationFailed', 'Verification Failed')}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t('auth.verificationFailedMessage', 'The verification link is invalid or has expired. Please request a new verification email.')}
          </p>
          <div className="mt-6 flex gap-4">
            <Button asChild>
              <Link to="/login">{t('auth.backToLogin', 'Back to Login')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
