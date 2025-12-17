import { useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../i18n/translations";

export function useTranslation() {
  const { language } = useLanguage();

  const t = useCallback(
    (key, fallback) => {
      return (
        translations[language]?.[key] ??
        translations.en?.[key] ??
        fallback ??
        key
      );
    },
    [language]
  );

  return { t, language };
}
