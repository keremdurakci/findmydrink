"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Locale, DEFAULT_LOCALE, t as translate, TranslationKey } from "./translations";

type LocaleContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: any) => string;
};

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  // İlk giriş her zaman İngilizce (DEFAULT_LOCALE) - kullanıcı değiştirirse
  // localStorage'a kaydedilir ve sonraki ziyaretlerde hatırlanır.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = window.localStorage.getItem("findmydrink_locale") as Locale | null;
    if (saved) setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    window.localStorage.setItem("findmydrink_locale", l);
  }

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t: (key: TranslationKey) => translate(locale, key) }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
