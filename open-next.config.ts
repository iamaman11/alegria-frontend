import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  // Enable cache interception: returns cached HTML without loading JS
  // This dramatically improves performance for ISR cached pages
  enableCacheInterception: true,

  // Use KV for incremental cache (faster than R2)
  // KV has Tiered Cache for global cache hits
  incrementalCache: kvIncrementalCache,

  // Use Durable Objects queue for ISR revalidation
  // Handles background revalidation after cache expiry
  queue: doQueue,
});
