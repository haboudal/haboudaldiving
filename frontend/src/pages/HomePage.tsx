import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Waves, Shield, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store';

export function HomePage() {
  const { t } = useTranslation();
  const { language } = useUIStore();

  const features = [
    {
      icon: Waves,
      titleEn: 'Discover Amazing Dive Sites',
      titleAr: 'اكتشف مواقع غوص مذهلة',
      descEn: 'Explore the Red Sea\'s most beautiful coral reefs and marine life.',
      descAr: 'استكشف أجمل الشعاب المرجانية والحياة البحرية في البحر الأحمر.',
    },
    {
      icon: Shield,
      titleEn: 'SRSA Certified Centers',
      titleAr: 'مراكز معتمدة من SRSA',
      descEn: 'All diving centers are licensed and verified by Saudi authorities.',
      descAr: 'جميع مراكز الغوص مرخصة ومعتمدة من الهيئة السعودية.',
    },
    {
      icon: Users,
      titleEn: 'Expert Instructors',
      titleAr: 'مدربون خبراء',
      descEn: 'Learn from certified professionals with years of experience.',
      descAr: 'تعلم من محترفين معتمدين بسنوات من الخبرة.',
    },
    {
      icon: MapPin,
      titleEn: 'Multiple Locations',
      titleAr: 'مواقع متعددة',
      descEn: 'Find diving centers across Jeddah, Yanbu, and the Red Sea coast.',
      descAr: 'اعثر على مراكز غوص في جدة وينبع وساحل البحر الأحمر.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-ocean-600 to-ocean-900 py-20 text-white">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {language === 'ar'
                ? 'اكتشف عالم الغوص في المملكة العربية السعودية'
                : 'Discover Diving in Saudi Arabia'}
            </h1>
            <p className="mt-6 text-lg text-ocean-100">
              {language === 'ar'
                ? 'احجز رحلات الغوص مع أفضل مراكز الغوص المعتمدة في البحر الأحمر'
                : 'Book diving trips with the best certified dive centers in the Red Sea'}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link to="/trips">{t('trips.title')}</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full border-white text-white hover:bg-white hover:text-ocean-900 sm:w-auto"
              >
                <Link to="/centers">{t('centers.title')}</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-[60px] w-full"
          >
            <path
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              className="fill-background"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">
            {language === 'ar' ? 'لماذا تختارنا؟' : 'Why Choose Us?'}
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col items-center rounded-lg border bg-card p-6 text-center shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold">
                  {language === 'ar' ? feature.titleAr : feature.titleEn}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {language === 'ar' ? feature.descAr : feature.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">
              {language === 'ar'
                ? 'ابدأ مغامرتك اليوم'
                : 'Start Your Adventure Today'}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {language === 'ar'
                ? 'سجل الآن واحصل على وصول فوري إلى أفضل رحلات الغوص'
                : 'Register now and get instant access to the best diving trips'}
            </p>
            <Button size="lg" asChild className="mt-8">
              <Link to="/register">{t('auth.register')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
