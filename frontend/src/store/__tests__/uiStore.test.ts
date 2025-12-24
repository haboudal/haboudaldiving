import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useUIStore.setState({
      language: 'ar',
      direction: 'rtl',
      isMobileNavOpen: false,
    });
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      const state = useUIStore.getState();

      expect(state.language).toBe('ar');
      expect(state.direction).toBe('rtl');
      expect(state.isMobileNavOpen).toBe(false);
    });
  });

  describe('setLanguage', () => {
    it('sets language to English with LTR direction', () => {
      const { setLanguage } = useUIStore.getState();

      setLanguage('en');

      const state = useUIStore.getState();
      expect(state.language).toBe('en');
      expect(state.direction).toBe('ltr');
    });

    it('sets language to Arabic with RTL direction', () => {
      useUIStore.setState({ language: 'en', direction: 'ltr' });
      const { setLanguage } = useUIStore.getState();

      setLanguage('ar');

      const state = useUIStore.getState();
      expect(state.language).toBe('ar');
      expect(state.direction).toBe('rtl');
    });

    it('updates document dir and lang attributes', () => {
      const { setLanguage } = useUIStore.getState();

      setLanguage('en');

      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('toggleLanguage', () => {
    it('toggles from Arabic to English', () => {
      const { toggleLanguage } = useUIStore.getState();

      toggleLanguage();

      const state = useUIStore.getState();
      expect(state.language).toBe('en');
      expect(state.direction).toBe('ltr');
    });

    it('toggles from English to Arabic', () => {
      useUIStore.setState({ language: 'en', direction: 'ltr' });
      const { toggleLanguage } = useUIStore.getState();

      toggleLanguage();

      const state = useUIStore.getState();
      expect(state.language).toBe('ar');
      expect(state.direction).toBe('rtl');
    });
  });

  describe('mobile navigation', () => {
    it('toggleMobileNav toggles the mobile nav state', () => {
      const { toggleMobileNav } = useUIStore.getState();

      expect(useUIStore.getState().isMobileNavOpen).toBe(false);

      toggleMobileNav();
      expect(useUIStore.getState().isMobileNavOpen).toBe(true);

      toggleMobileNav();
      expect(useUIStore.getState().isMobileNavOpen).toBe(false);
    });

    it('closeMobileNav closes the mobile nav', () => {
      useUIStore.setState({ isMobileNavOpen: true });
      const { closeMobileNav } = useUIStore.getState();

      closeMobileNav();

      expect(useUIStore.getState().isMobileNavOpen).toBe(false);
    });

    it('closeMobileNav works when nav is already closed', () => {
      const { closeMobileNav } = useUIStore.getState();

      closeMobileNav();

      expect(useUIStore.getState().isMobileNavOpen).toBe(false);
    });
  });
});
