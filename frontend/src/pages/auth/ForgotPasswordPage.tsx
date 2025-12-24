import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/api/auth';
import { getErrorMessage } from '@/api/client';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.forgotPassword(data.email),
    onSuccess: (_, variables) => {
      setEmailSent(true);
      setSentEmail(variables.email);
    },
  });

  if (emailSent) {
    return (
      <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">{t('auth.checkEmail', 'Check your email')}</h2>
            <p className="mt-2 text-muted-foreground">
              {t('auth.resetEmailSent', "We've sent a password reset link to")}
            </p>
            <p className="font-medium">{sentEmail}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('auth.checkSpam', "Didn't receive it? Check your spam folder or")}
            </p>
            <Button
              variant="link"
              onClick={() => setEmailSent(false)}
              className="mt-1"
            >
              {t('auth.tryAgain', 'try again')}
            </Button>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('auth.backToLogin', 'Back to login')}
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
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">{t('auth.forgotPassword', 'Forgot Password')}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('auth.forgotPasswordDescription', "Enter your email and we'll send you a reset link")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {mutation.isError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {getErrorMessage(mutation.error)}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.sendResetLink', 'Send Reset Link')}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-primary hover:underline">
                <ArrowLeft className="mr-1 inline h-4 w-4" />
                {t('auth.backToLogin', 'Back to login')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
