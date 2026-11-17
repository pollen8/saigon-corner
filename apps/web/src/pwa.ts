import { registerSW } from "virtual:pwa-register";

/** Register the service worker. New builds activate on the next navigation. */
export function registerPwa() {
  if (!import.meta.env.PROD) {
    return;
  }

  registerSW({
    immediate: true,
  });
}
