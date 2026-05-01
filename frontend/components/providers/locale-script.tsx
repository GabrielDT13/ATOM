import Script from "next/script";

export function LocaleScript() {
  return (
    <Script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var key = "atom-locale";
              var stored = window.localStorage.getItem(key);
              var locale = stored === "es" || stored === "en"
                ? stored
                : (navigator.language || "").toLowerCase().indexOf("es") === 0 ? "es" : ((navigator.language || "").toLowerCase().indexOf("en") === 0 ? "en" : "en");
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
