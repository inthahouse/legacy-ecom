import type { Page } from "@playwright/test";

/**
 * Simulates a mobile network by throttling requests via CDP. Chromium-only -
 * there's no CDP session (and no equivalent API) in Firefox or WebKit
 * contexts, so callers should skip there.
 *
 * Values match Chrome DevTools' "Fast 4G" network throttling preset.
 */
export async function throttleNetworkFast4G(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 60, // ms
    downloadThroughput: (9000 * 1024) / 8, // 9 Mbps, in bytes/sec
    uploadThroughput: (9000 * 1024) / 8, // 9 Mbps, in bytes/sec
  });
}
