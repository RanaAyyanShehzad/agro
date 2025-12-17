import { useLanguage } from "../context/LanguageContext";

function LanguageToggle({ direction = "row", className = "" }) {
  const { language, setLanguage, isReady } = useLanguage();
  const isColumn = direction === "column";

  const baseButton =
    "px-3 py-1 text-xs font-semibold uppercase rounded-full border border-white/30 transition disabled:opacity-50 disabled:cursor-not-allowed";

  const enActive =
    language === "en"
      ? "bg-white text-green-700 border-white"
      : "bg-white/10 text-white hover:bg-white/20";
  const urActive =
    language === "ur"
      ? "bg-white text-green-700 border-white"
      : "bg-white/10 text-white hover:bg-white/20";

  return (
    <div
      className={`flex ${
        isColumn ? "flex-col space-y-2" : "flex-row space-x-2"
      } ${className}`}
    >
      <button
        type="button"
        className={`${baseButton} ${enActive}`}
        onClick={() => setLanguage("en")}
        disabled={!isReady}
      >
        EN
      </button>
      <button
        type="button"
        className={`${baseButton} ${urActive}`}
        onClick={() => setLanguage("ur")}
        disabled={!isReady}
      >
        اردو
      </button>
    </div>
  );
}

export default LanguageToggle;
