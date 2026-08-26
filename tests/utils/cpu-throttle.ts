import type { Page } from "@playwright/test";

/**
 * Simulates a slower device by throttling the main thread via CDP.
 * Chromium-only - there's no CDP session (and no equivalent API) in
 * Firefox or WebKit contexts, so callers should skip there.
 *
 * @param rate Slowdown factor, e.g. 4 for "4x slower than this machine".
 */
export async function throttleCPU(page: Page, rate: number): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate });
}
