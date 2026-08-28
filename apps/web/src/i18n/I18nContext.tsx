import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type Language, translations } from "./translations";

const STORAGE_KEY = "language";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  copy: (typeof translations)[Language];
};

const I18nContext = createContext<I18nContextValue | null>(null);

const getInitialLanguage = (): Language => {
  const savedLanguage = localStorage.getItem(STORAGE_KEY);

  if (savedLanguage === "ro" || savedLanguage === "en") {
    return savedLanguage;
  }

  return "ro";
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      copy: translations[language],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
};
