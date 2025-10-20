/**
 * API Diagnostic Tool
 *
 * This module provides diagnostic functions to test API connectivity
 * and identify why fetch() might be failing in specific environments
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.poshta.cloud';

export async function diagnosticTest(slug: string) {
  const results = {
    slug,
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      api_url: API_URL,
      runtime: typeof window === 'undefined' ? 'server' : 'browser',
    },
    tests: {} as Record<string, any>,
  };

  try {
    // Test 1: Check if URL is valid
    results.tests.url_validation = {
      status: 'pass',
      message: 'URL construction successful',
      url: `${API_URL}/api/pages/${slug}?depth=2`,
    };

    // Test 2: Try fetch with minimal headers
    console.log(`[DIAGNOSTIC] Testing fetch for "${slug}"...`);
    const response = await fetch(`${API_URL}/api/pages/${slug}?depth=2`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    results.tests.fetch = {
      status: response.ok ? 'pass' : 'fail',
      status_code: response.status,
      status_text: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type'),
        'cache-control': response.headers.get('cache-control'),
        'cf-cache-status': response.headers.get('cf-cache-status'),
      },
    };

    if (response.ok) {
      try {
        const data = await response.json();
        results.tests.json_parse = {
          status: 'pass',
          data_keys: Object.keys(data),
          title: data.title,
        };
      } catch (parseError) {
        results.tests.json_parse = {
          status: 'fail',
          error: parseError instanceof Error ? parseError.message : String(parseError),
        };
      }
    } else {
      results.tests.fetch_error = {
        status: 'fail',
        message: `HTTP ${response.status}: ${response.statusText}`,
        response_text: await response.text().catch(() => '[could not read response]'),
      };
    }
  } catch (error) {
    results.tests.error = {
      status: 'fail',
      error_type: error instanceof Error ? error.constructor.name : typeof error,
      error_message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
    };
  }

  console.log('[DIAGNOSTIC] Results:', JSON.stringify(results, null, 2));
  return results;
}

export async function debugFetch(slug: string, options?: RequestInit) {
  console.log(`[DEBUG] Attempting to fetch page "${slug}"...`);
  console.log(`[DEBUG] API URL: ${API_URL}`);
  console.log(`[DEBUG] Endpoint: /api/pages/${slug}?depth=2`);

  const fullUrl = `${API_URL}/api/pages/${slug}?depth=2`;
  console.log(`[DEBUG] Full URL: ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    console.log(`[DEBUG] Response status: ${response.status} ${response.statusText}`);
    console.log(`[DEBUG] Response headers:`, {
      'content-type': response.headers.get('content-type'),
      'cache-control': response.headers.get('cache-control'),
      'cf-cache-status': response.headers.get('cf-cache-status'),
      'cf-ray': response.headers.get('cf-ray'),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[DEBUG] Response body (first 500 chars): ${text.substring(0, 500)}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[DEBUG] Successfully parsed JSON`);
    console.log(`[DEBUG] Data keys: ${Object.keys(data).join(', ')}`);
    console.log(`[DEBUG] Page title: ${data.title}`);

    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[DEBUG] Fetch failed: ${errorMsg}`);

    if (error instanceof Error) {
      console.error(`[DEBUG] Error stack:`, error.stack);
    }

    throw error;
  }
}
