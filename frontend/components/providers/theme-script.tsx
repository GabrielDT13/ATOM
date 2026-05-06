import Script from "next/script";

export function ThemeScript() {
  return (
    <Script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var storageKey = "atom-theme";
              var stored = window.localStorage.getItem(storageKey);
              var mode = stored === "dark" || stored === "light"
                ? stored
                : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
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
