import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Shield,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { bookingsApi } from '@/api/trips';
import { paymentsApi } from '@/api/payments';
import { formatPrice } from '@/lib/utils';
import type { PaymentMethod } from '@/types';

const paymentMethods: { id: PaymentMethod; name: string; icon: string }[] = [
  { id: 'MADA', name: 'Mada', icon: '/icons/mada.svg' },
  { id: 'VISA', name: 'Visa', icon: '/icons/visa.svg' },
  { id: 'MASTER', name: 'Mastercard', icon: '/icons/mastercard.svg' },
  { id: 'APPLEPAY', name: 'Apple Pay', icon: '/icons/applepay.svg' },
  { id: 'STC_PAY', name: 'STC Pay', icon: '/icons/stcpay.svg' },
];

export function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();

  const checkoutId = searchParams.get('id');
  const resourcePath = searchParams.get('resourcePath');

  // If we have a checkoutId, we're returning from payment gateway
  if (checkoutId && resourcePath) {
    return <PaymentStatus checkoutId={checkoutId} />;
  }

  return <PaymentForm bookingId={bookingId!} />;
}

function PaymentForm({ bookingId }: { bookingId: string }) {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('MADA');

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId),
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      paymentsApi.checkout({
        bookingId,
        paymentMethod: selectedMethod,
        returnUrl: `${window.location.origin}/checkout/${bookingId}`,
        cancelUrl: `${window.location.origin}/my-bookings/${bookingId}`,
      }),
    onSuccess: (data) => {
      // Redirect to payment gateway
      window.location.href = data.redirectUrl;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">{t('checkout.bookingNotFound', 'Booking not found')}</h2>
        <Button asChild className="mt-4">
          <Link to="/my-bookings">{t('bookings.backToList', 'Back to my bookings')}</Link>
        </Button>
      </div>
    );
  }

  if (booking.status !== 'pending') {
    return (
      <div className="container py-12 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-4 text-xl font-semibold">{t('checkout.alreadyPaid', 'This booking is already paid')}</h2>
        <Button asChild className="mt-4">
          <Link to={`/my-bookings/${bookingId}`}>{t('bookings.viewBooking', 'View Booking')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link to={`/my-bookings/${bookingId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back', 'Back')}
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('checkout.title', 'Checkout')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('checkout.subtitle', 'Complete your payment to confirm your booking')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('checkout.selectPaymentMethod', 'Select Payment Method')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex items-center gap-4 rounded-lg border-2 p-4 transition-colors ${
                      selectedMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white">
                      <span className="text-lg font-bold text-gray-600">{method.name[0]}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {method.id === 'MADA' && t('checkout.localCard', 'Saudi debit card')}
                        {method.id === 'VISA' && t('checkout.creditCard', 'Credit card')}
                        {method.id === 'MASTER' && t('checkout.creditCard', 'Credit card')}
                        {method.id === 'APPLEPAY' && t('checkout.applePay', 'Quick checkout')}
                        {method.id === 'STC_PAY' && t('checkout.stcPay', 'Mobile wallet')}
                      </p>
                    </div>
                    {selectedMethod === method.id && (
                      <CheckCircle className="ml-auto h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  {t('checkout.payNow', 'Pay')} {formatPrice(booking.totalAmountSar)}
                </Button>
              </div>

              {checkoutMutation.isError && (
                <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {t('checkout.error', 'An error occurred. Please try again.')}
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                {t('checkout.securePayment', 'Your payment is secured with SSL encryption')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('checkout.orderSummary', 'Order Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">{booking.tripTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {booking.numberOfDivers} {booking.numberOfDivers === 1 ? 'diver' : 'divers'}
                </p>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('bookings.basePrice', 'Base Price')}</span>
                  <span>{formatPrice(booking.basePriceSar)}</span>
                </div>
                {booking.equipmentRentalSar > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('bookings.equipmentRental', 'Equipment')}</span>
                    <span>{formatPrice(booking.equipmentRentalSar)}</span>
                  </div>
                )}
                {booking.conservationFeeSar > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('bookings.conservationFee', 'Conservation Fee')}</span>
                    <span>{formatPrice(booking.conservationFeeSar)}</span>
                  </div>
                )}
                {booking.vatAmountSar > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('bookings.vat', 'VAT (15%)')}</span>
                    <span>{formatPrice(booking.vatAmountSar)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold">
                  <span>{t('bookings.total', 'Total')}</span>
                  <span className="text-primary">{formatPrice(booking.totalAmountSar)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PaymentStatus({ checkoutId }: { checkoutId: string }) {
  const { t } = useTranslation();

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment-status', checkoutId],
    queryFn: () => paymentsApi.getStatus(checkoutId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000;
    },
  });

  // Derive status from payment data
  const status = payment?.status === 'completed'
    ? 'success'
    : payment?.status === 'failed'
    ? 'failed'
    : 'loading';

  if (isLoading && status === 'loading') {
    return (
      <div className="container flex min-h-[400px] flex-col items-center justify-center py-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="mt-4 text-xl font-semibold">{t('checkout.processing', 'Processing your payment...')}</h2>
        <p className="mt-2 text-muted-foreground">
          {t('checkout.pleaseWait', 'Please wait while we confirm your payment')}
        </p>
      </div>
    );
  }

  if (status === 'success' && payment) {
    return (
      <div className="container flex min-h-[400px] flex-col items-center justify-center py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">{t('checkout.success', 'Payment Successful!')}</h2>
        <p className="mt-2 text-muted-foreground">
          {t('checkout.successMessage', 'Your booking has been confirmed. You will receive a confirmation email shortly.')}
        </p>
        <div className="mt-6 flex gap-4">
          <Button asChild>
            <Link to={`/my-bookings/${payment.bookingId}`}>{t('bookings.viewBooking', 'View Booking')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/my-bookings">{t('bookings.title', 'My Bookings')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex min-h-[400px] flex-col items-center justify-center py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-10 w-10 text-red-600" />
      </div>
      <h2 className="mt-6 text-2xl font-bold">{t('checkout.failed', 'Payment Failed')}</h2>
      <p className="mt-2 text-muted-foreground">
        {t('checkout.failedMessage', 'There was an issue processing your payment. Please try again.')}
      </p>
      <div className="mt-6 flex gap-4">
        <Button onClick={() => window.location.reload()}>
          {t('checkout.tryAgain', 'Try Again')}
        </Button>
        <Button asChild variant="outline">
          <Link to="/my-bookings">{t('bookings.title', 'My Bookings')}</Link>
        </Button>
      </div>
    </div>
  );
}
