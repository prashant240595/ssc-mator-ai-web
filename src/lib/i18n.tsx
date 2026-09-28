import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";
export type Bilingual = { en: string; hi: string };

const LangCtx = createContext<{ lang: Lang; toggle: () => void; setLang: (l: Lang) => void }>({
  lang: "en",
  toggle: () => {},
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lang") as Lang | null;
      if (stored === "en" || stored === "hi") setLang(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
      if (typeof document !== "undefined") document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

  return (
    <LangCtx.Provider
      value={{
        lang,
        setLang,
        toggle: () => setLang((l) => (l === "en" ? "hi" : "en")),
      }}
    >
      {children}
    </LangCtx.Provider>
  );
}

export const useLanguage = () => useContext(LangCtx);

export const t = (val: Bilingual | string, lang: Lang): string =>
  typeof val === "string" ? val : (val[lang] ?? val.en);
