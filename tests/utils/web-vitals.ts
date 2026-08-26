import { existsSync, readFileSync } from "fs";
import path from "path";
import type { Page } from "@playwright/test";

// web-vitals' package.json "exports" map doesn't list the prebuilt IIFE
// bundle as a subpath, so require.resolve("web-vitals/dist/...") is blocked
// by Node even though the file is right there on disk. Resolve the
// package's own directory instead (which "exports" does allow) and join
// the path to the bundle ourselves.
function resolveWebVitalsIife(): string {
  const searchPaths = require.resolve.paths("web-vitals") ?? [];
  for (const base of searchPaths) {
    const candidate = path.join(base, "web-vitals", "dist", "web-vitals.iife.js");
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("Could not locate web-vitals/dist/web-vitals.iife.js - is web-vitals installed?");
}

export type WebVitalMetric = {
  name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
};

/**
 * Injects the web-vitals library into the page before any of the page's own
 * scripts run, so it can observe paint/layout-shift/input timing from the
 * very start of navigation. Call this BEFORE page.goto().
 *
 * Returns an array that fills in as metrics report (LCP/CLS/INP finalize on
 * visibility change, so trigger that - e.g. via triggerFinalization() below -
 * before reading them).
 */
export async function attachWebVitals(page: Page): Promise<WebVitalMetric[]> {
  const metrics: WebVitalMetric[] = [];

  await page.exposeFunction("__onWebVital", (metric: WebVitalMetric) => {
    metrics.push(metric);
  });

  // Playwright evaluates init script "content" inside a wrapper function, so
  // the bundle's top-level `var webVitals = ...` would otherwise stay local
  // instead of landing on `window`. Force the assignment ourselves, in the
  // same script block so it still closes over that local `webVitals`.
  const iifeSource = readFileSync(resolveWebVitalsIife(), "utf-8");
  await page.addInitScript({
    content: `${iifeSource}\nwindow.webVitals = webVitals;`,
  });
  await page.addInitScript(() => {
    const wv = (window as any).webVitals;
    const report = (window as any).__onWebVital;
    wv.onCLS(report);
    wv.onFCP(report);
    wv.onINP(report);
    wv.onLCP(report);
    wv.onTTFB(report);
  });

  return metrics;
}

/**
 * CLS finalizes off document.visibilityState alone, so a script-dispatched
 * 'visibilitychange' event is enough. LCP (and INP) additionally require the
 * finalizing event to be trusted (see web-vitals' onLCP.js finalizeLCP -
 * `event.isTrusted`), so a fake dispatchEvent is silently ignored for those -
 * page.keyboard.press goes through real CDP input dispatch, which the
 * browser marks as trusted, and 'keydown' is one of web-vitals' own
 * finalizeEventTypes. Call this after your test interactions, before reading
 * metrics.
 */
export async function triggerFinalization(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.keyboard.press("Tab");
}
