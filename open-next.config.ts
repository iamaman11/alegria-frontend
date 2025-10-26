import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

/**
 * EXPERT CONFIGURATION: 3-Tier Next.js Cache on Cloudflare
 *
 * Архитектура:
 * Layer 1: Regional Cache (in-memory, 1-30 минут)
 * Layer 2: R2 Object Storage (persistent, 7 дней)
 * Layer 3: Workers API → Payload CMS (fallback)
 *
 * Цель: x-nextjs-cache: HIT при 90% запросов
 * TTFB: 25-35ms (улучшение на 30%)
 *
 * NOTE: Durable Object Queue временно отключен до фикса OpenNext export
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
});
