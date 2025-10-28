import json
import re

# Load data
with open('r2_objects_full_list.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

# Find all numeric pages
page_cache = {}
for obj in data:
    key = obj['key']
    # Match pattern: buildID/1234.cache
    match = re.match(r'^([^/]+)/(\d{4})\.cache$', key)
    if match:
        build_id = match.group(1)
        page_num = match.group(2)
        if build_id not in page_cache:
            page_cache[build_id] = []
        page_cache[build_id].append(page_num)

print("=== Pages cached by Build ID ===")
for build_id, pages in page_cache.items():
    print(f"\n{build_id}:")
    sorted_pages = sorted(pages)
    print(f"  Total: {len(sorted_pages)} pages")
    print(f"  Range: {sorted_pages[0]} - {sorted_pages[-1]}")
    print(f"  Sample: {', '.join(sorted_pages[:10])}")

# Check for 1618 and 1900
print("\n=== Search for specific pages ===")
for page_num in ['1618', '1900']:
    found = False
    for build_id, pages in page_cache.items():
        if page_num in pages:
            print(f"Page {page_num}: FOUND in {build_id}")
            found = True
            break
    if not found:
        print(f"Page {page_num}: NOT FOUND in any build")