import { registerSW } from "virtual:pwa-register";

/** Registers the service worker and reloads when a new build is available. */
export function registerPwa() {
  if (!import.meta.env.PROD) {
    return;
  }

  registerSW({
    immediate: true,
    onNeedRefresh() {
      if (window.confirm("A new version is available. Reload now?")) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      // App shell cached; roster still needs network for data.
    },
  });
}