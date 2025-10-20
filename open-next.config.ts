import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  // Enable cache interception: returns cached HTML without loading JS
  // This dramatically improves performance for ISR cached pages
  enableCacheInterception: true,

  // Use KV for incremental cache (faster than R2)
  // KV has Tiered Cache for global cache hits
  incrementalCache: kvIncrementalCache,

  // NOTE: Durable Objects queue removed for Cloudflare Pages
  // DO queue is not needed on Pages - middleware handles routing
});
