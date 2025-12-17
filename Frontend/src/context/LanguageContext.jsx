import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  isReady: false,
});

const SCRIPT_ID = "google-translate-script";
const DEFAULT_LANGUAGE = "en";
const STORAGE_KEY = "fc_language";

function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
  });
  const [isReady, setIsReady] = useState(false);

  const applyLanguage = useCallback((lang) => {
    if (typeof window === "undefined") return;
    const normalized = lang === "ur" ? "ur" : DEFAULT_LANGUAGE;
    const html = document.documentElement;
    html.setAttribute("lang", normalized);
    html.setAttribute("dir", normalized === "ur" ? "rtl" : "ltr");

    const combo = document.querySelector(".goog-te-combo");
    if (combo && combo.value !== normalized) {
      combo.value = normalized;
      combo.dispatchEvent(new Event("change"));
    }
  }, []);

  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (window.google?.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,ur",
            autoDisplay: false,
          },
          "google_translate_element"
        );
        setIsReady(true);
      }
    };

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (isReady) {
      applyLanguage(language);
    }
  }, [language, isReady, applyLanguage]);

  const setLanguage = useCallback(
    (lang) => {
      const normalized = lang === "ur" ? "ur" : DEFAULT_LANGUAGE;
      setLanguageState(normalized);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, normalized);
      }
      if (isReady) {
        applyLanguage(normalized);
      }
    },
    [applyLanguage, isReady]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isReady,
    }),
    [language, setLanguage, isReady]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <div id="google_translate_element" className="hidden" />
    </LanguageContext.Provider>
  );
}

function useLanguage() {
  return useContext(LanguageContext);
}

export { LanguageProvider, useLanguage };
