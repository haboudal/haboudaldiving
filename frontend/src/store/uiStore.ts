import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'ar' | 'en';
type Direction = 'rtl' | 'ltr';

interface UIState {
  language: Language;
  direction: Direction;
  isMobileNavOpen: boolean;

  // Actions
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      language: 'ar',
      direction: 'rtl',
      isMobileNavOpen: false,

      setLanguage: (language: Language) => {
        const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.dir = direction;
        document.documentElement.lang = language;
        set({ language, direction });
      },

      toggleLanguage: () => {
        const newLanguage = get().language === 'ar' ? 'en' : 'ar';
        get().setLanguage(newLanguage);
      },

      toggleMobileNav: () => {
        set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen }));
      },

      closeMobileNav: () => {
        set({ isMobileNavOpen: false });
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        language: state.language,
        direction: state.direction,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.dir = state.direction;
          document.documentElement.lang = state.language;
        }
      },
    }
  )
);
