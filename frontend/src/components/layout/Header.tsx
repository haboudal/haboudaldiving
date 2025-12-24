import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, User, LogOut, Shield, Building2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, useUIStore } from '@/store';
import { cn } from '@/lib/utils';

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { language, toggleLanguage, isMobileNavOpen, toggleMobileNav, closeMobileNav } =
    useUIStore();

  const handleLogout = async () => {
    await logout();
    closeMobileNav();
    navigate('/');
  };

  const navLinks = [
    { href: '/trips', label: t('nav.trips') },
    { href: '/centers', label: t('nav.centers') },
  ];

  const authNavLinks = [
    { href: '/my-bookings', label: t('nav.myBookings') },
    { href: '/dive-logs', label: t('nav.diveLogs') },
    { href: '/my-reviews', label: t('nav.myReviews', 'My Reviews') },
  ];

  // Role-based dashboard links
  const getRoleDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'admin') {
      return { href: '/admin', label: t('nav.adminDashboard', 'Admin Dashboard'), icon: Shield };
    }
    if (user.role === 'center_owner') {
      return { href: '/center', label: t('nav.centerDashboard', 'My Center'), icon: Building2 };
    }
    if (user.role === 'instructor') {
      return { href: '/instructor', label: t('nav.instructorDashboard', 'Instructor Portal'), icon: GraduationCap };
    }
    return null;
  };

  const roleDashboardLink = getRoleDashboardLink();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" onClick={closeMobileNav}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">D</span>
          </div>
          <span className="hidden font-semibold sm:inline-block">
            {language === 'ar' ? 'غوص السعودية' : 'Saudi Diving'}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated &&
            authNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          {roleDashboardLink && (
            <Link
              to={roleDashboardLink.href}
              className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              <roleDashboardLink.icon className="h-4 w-4" />
              {roleDashboardLink.label}
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" onClick={toggleLanguage} title="Toggle Language">
            <Globe className="h-5 w-5" />
            <span className="sr-only">Toggle Language</span>
          </Button>

          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">
                  <User className="me-2 h-4 w-4" />
                  {user?.email?.split('@')[0]}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">{t('nav.logout')}</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">{t('nav.register')}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileNav}>
          {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'absolute left-0 right-0 top-16 border-b bg-background md:hidden',
          isMobileNavOpen ? 'block' : 'hidden'
        )}
      >
        <nav className="container flex flex-col gap-2 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              onClick={closeMobileNav}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated &&
            authNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                onClick={closeMobileNav}
              >
                {link.label}
              </Link>
            ))}
          {roleDashboardLink && (
            <Link
              to={roleDashboardLink.href}
              className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              onClick={closeMobileNav}
            >
              <roleDashboardLink.icon className="h-4 w-4" />
              {roleDashboardLink.label}
            </Link>
          )}

          <hr className="my-2" />

          <button
            onClick={() => {
              toggleLanguage();
              closeMobileNav();
            }}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Globe className="h-4 w-4" />
            {language === 'ar' ? 'English' : 'العربية'}
          </button>

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                onClick={closeMobileNav}
              >
                <User className="h-4 w-4" />
                {t('nav.profile')}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                onClick={closeMobileNav}
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                onClick={closeMobileNav}
              >
                {t('nav.register')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
