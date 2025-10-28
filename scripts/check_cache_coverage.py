import requests
import json
from datetime import datetime

print("[INFO] Starting cache coverage analysis...")
print(f"[INFO] Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("-" * 60)

# Configuration
API_URL = "https://api.poshta.cloud/api/pages"
R2_API_URL = "https://api.cloudflare.com/client/v4/accounts/6045b0c922c5f02ca8efe49010a2e687/r2/buckets/nextjs-incremental-cache/objects"
TOKEN = "yOUPX80kVJ3kG4ZmULsQoEjIJwJcDX7aSF70elVm"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Step 1: Get all pages from CMS
print("[STEP 1] Fetching all pages from CMS API...")
all_pages = []
page = 1
has_more = True

while has_more:
    try:
        response = requests.get(f"{API_URL}?page={page}&limit=100")
        data = response.json()
        all_pages.extend(data.get('docs', []))
        has_more = data.get('hasNextPage', False)
        page += 1
        print(f"  Fetched page {page-1}: {len(data.get('docs', []))} pages")
    except Exception as e:
        print(f"[ERROR] Failed to fetch CMS pages: {e}")
        has_more = False

print(f"[INFO] Total pages from CMS: {len(all_pages)}")

# Extract slugs
page_slugs = [p['slug'] for p in all_pages if p.get('slug')]
print(f"[INFO] Pages with slugs: {len(page_slugs)}")

# Step 2: Get all cached objects from R2
print("\n[STEP 2] Fetching all objects from R2 bucket...")
r2_objects = []
cursor = None
page_count = 0

while True:
    try:
        url = f"{R2_API_URL}?limit=1000"
        if cursor:
            url += f"&cursor={cursor}"

        response = requests.get(url, headers=headers)
        data = response.json()

        if data['success']:
            r2_objects.extend(data['result'])
            cursor = data.get('result_info', {}).get('cursor')
            is_truncated = data.get('result_info', {}).get('is_truncated', False)
            page_count += 1
            print(f"  Fetched R2 page {page_count}: {len(data['result'])} objects")

            if not is_truncated:
                break
        else:
            print(f"[ERROR] R2 API error: {data.get('errors')}")
            break
    except Exception as e:
        print(f"[ERROR] Failed to fetch R2 objects: {e}")
        break

print(f"[INFO] Total R2 objects: {len(r2_objects)}")

# Step 3: Extract cached pages from R2 objects
cached_pages = {}
for obj in r2_objects:
    key = obj['key']
    # Match pattern: buildID/XXXX.cache where XXXX is page slug
    parts = key.split('/')
    if len(parts) >= 2 and parts[-1].endswith('.cache'):
        build_id = parts[0]
        page_slug = parts[-1].replace('.cache', '')

        # Skip non-page objects
        if page_slug in ['_global-error', '_not-found'] or 'segment' in key or 'manifest' in key:
            continue

        if build_id not in cached_pages:
            cached_pages[build_id] = []
        cached_pages[build_id].append(page_slug)

# Step 4: Analysis
print("\n" + "=" * 60)
print("CACHE COVERAGE ANALYSIS")
print("=" * 60)

# Find latest build ID (most recent)
if cached_pages:
    # Sort by number of pages (latest build usually has most pages)
    latest_build = max(cached_pages.keys(), key=lambda k: len(cached_pages[k]))
    cached_in_latest = set(cached_pages[latest_build])

    print(f"\n[BUILD IDS FOUND]: {len(cached_pages)}")
    for build_id, pages in cached_pages.items():
        is_latest = " (LATEST)" if build_id == latest_build else ""
        print(f"  {build_id}: {len(pages)} pages{is_latest}")

    # Find pages that are cached vs not cached
    cms_slugs = set(page_slugs)
    cached_slugs = cached_in_latest

    # Pages in CMS and cached
    cached_and_exists = cms_slugs & cached_slugs

    # Pages in CMS but NOT cached
    not_cached = cms_slugs - cached_slugs

    # Pages cached but NOT in CMS (old/deleted pages)
    orphaned_cache = cached_slugs - cms_slugs

    print(f"\n[LATEST BUILD STATISTICS] ({latest_build})")
    print(f"  Pages in CMS: {len(cms_slugs)}")
    print(f"  Pages cached in R2: {len(cached_slugs)}")
    print(f"  Pages cached and exist: {len(cached_and_exists)}")
    print(f"  Pages NOT cached: {len(not_cached)}")
    print(f"  Orphaned cache entries: {len(orphaned_cache)}")
    print(f"  Cache coverage: {len(cached_and_exists)/len(cms_slugs)*100:.1f}%")

    # Sample of cached pages
    print("\n[SAMPLE OF CACHED PAGES]:")
    for slug in sorted(cached_and_exists)[:10]:
        print(f"  [OK] {slug}")

    # Sample of NOT cached pages
    print("\n[SAMPLE OF NOT CACHED PAGES]:")
    for slug in sorted(not_cached)[:10]:
        print(f"  [MISS] {slug}")

    # Check specific pages
    print("\n[SPECIFIC PAGES CHECK]:")
    check_pages = ['1618', '1900', '2057', '2118', '2120', '2131']
    for slug in check_pages:
        if slug in cached_slugs:
            print(f"  {slug}: [CACHED]")
        elif slug in cms_slugs:
            print(f"  {slug}: [NOT CACHED]")
        else:
            print(f"  {slug}: [NOT IN CMS]")

    # Export results
    results = {
        "timestamp": datetime.now().isoformat(),
        "cms_total": len(cms_slugs),
        "cached_total": len(cached_slugs),
        "coverage_percent": round(len(cached_and_exists)/len(cms_slugs)*100, 1),
        "not_cached": sorted(list(not_cached)),
        "cached": sorted(list(cached_and_exists)),
        "orphaned": sorted(list(orphaned_cache)),
        "build_ids": {k: len(v) for k, v in cached_pages.items()}
    }

    with open('cache_coverage_report.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\n[INFO] Full report saved to: cache_coverage_report.json")
else:
    print("[WARNING] No cached pages found in R2!")

print("\n" + "=" * 60)
print("ANALYSIS COMPLETE")
print("=" * 60)