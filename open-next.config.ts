import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
// import customIncrementalCache from "./lib/custom-cache-handler";

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
  // =====================================
  // INCREMENTAL CACHE: R2 + Regional
  // =====================================
  // R2 с Regional Cache wrapper для максимальной производительности

  // OPTION 1: Standard configuration (ISR pages show STALE after revalidate period)
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    // "long-lived" = 30 минут в памяти региона
    // "short-lived" = 1 минута (для часто обновляемого контента)
    mode: "long-lived",

    // Пропускать проверку Tag Cache при cache hit (performance optimization)
    // Ускоряет ответ на ~2-5ms при HIT
    bypassTagCacheOnCacheHit: true,
  }),

  // OPTION 2: Custom handler for always HIT (uncomment to enable)
  // incrementalCache: withRegionalCache(customIncrementalCache, {
  //   mode: "long-lived",
  //   bypassTagCacheOnCacheHit: true,
  // }),

  // =====================================
  // TAG CACHE: D1 Database
  // =====================================
  // Хранит информацию о cache tags для on-demand revalidation
  // (revalidateTag, revalidatePath из Next.js)
  tagCache: d1NextTagCache,
});
