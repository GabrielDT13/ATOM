import Script from "next/script";

export function LocaleScript() {
  return (
    <Script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var preferenceKey = "atom-locale-preference";
              var legacyKey = "atom-locale";
              var stored = window.localStorage.getItem(preferenceKey);
              if (stored !== "auto" && stored !== "es" && stored !== "en") {
                stored = window.localStorage.getItem(legacyKey);
              }
              var preference = stored === "auto" || stored === "es" || stored === "en"
                ? stored
                : "auto";
              var browserLanguage = (navigator.language || "").toLowerCase();
              var locale = preference === "auto"
                ? (browserLanguage.indexOf("es") === 0 ? "es" : (browserLanguage.indexOf("en") === 0 ? "en" : "en"))
                : preference;
              document.documentElement.lang = locale;
            } catch (error) {
              document.documentElement.lang = "en";
            }
          })();
        `,
      }}
      id="atom-locale-script"
      strategy="beforeInteractive"
    />
  );
}
