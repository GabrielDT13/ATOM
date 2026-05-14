import Script from "next/script";

export function ThemeScript() {
  return (
    <Script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var preferenceKey = "atom-theme-preference";
              var legacyKey = "atom-theme";
              var stored = window.localStorage.getItem(preferenceKey);
              if (stored !== "system" && stored !== "dark" && stored !== "light") {
                stored = window.localStorage.getItem(legacyKey);
              }
              var preference = stored === "dark" || stored === "light" || stored === "system"
                ? stored
                : "system";
              var mode = preference === "system"
                ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                : preference;
              document.documentElement.dataset.theme = mode;
              document.documentElement.style.colorScheme = mode;
            } catch (error) {
              document.documentElement.dataset.theme = "light";
              document.documentElement.style.colorScheme = "light";
            }
          })();
        `,
      }}
      id="atom-theme-script"
      strategy="beforeInteractive"
    />
  );
}
