import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import queueCache from "@opennextjs/cloudflare/overrides/queue/queue-cache";
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
 */
export default defineCloudflareConfig({
  // =====================================
  // INCREMENTAL CACHE: R2 + Regional
  // =====================================
  // R2 с Regional Cache wrapper для максимальной производительности
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    // "long-lived" = 30 минут в памяти региона
    // "short-lived" = 1 минута (для часто обновляемого контента)
    mode: "long-lived",

    // Пропускать проверку Tag Cache при cache hit (performance optimization)
    // Ускоряет ответ на ~2-5ms при HIT
    bypassTagCacheOnCacheHit: true,
  }),

  // =====================================
  // QUEUE: Durable Object Queue
  // =====================================
  // Координирует time-based ISR revalidation между регионами
  queue: queueCache(doQueue, {
    // TTL для queue результатов в regional cache
    regionalCacheTtlSec: 60, // 1 минута

    // Ждать подтверждения от queue (более надежно, но +10-20ms latency)
    waitForQueueAck: true,
  }),

  // =====================================
  // TAG CACHE: D1 Database
  // =====================================
  // Хранит информацию о cache tags для on-demand revalidation
  // (revalidateTag, revalidatePath из Next.js)
  tagCache: d1NextTagCache,
});
