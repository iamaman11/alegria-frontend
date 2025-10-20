import { getPageBySlug, getAllPageSlugs } from '@/lib/api';

export async function GET() {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    api_url: process.env.NEXT_PUBLIC_API_URL,
  };

  try {
    // Try to get the page
    console.log('[DEBUG] Attempting to fetch /newone...');
    const page = await getPageBySlug('newone', false);
    debugInfo.page = page ? { id: page.id, title: page.title, slug: page.slug } : null;
    debugInfo.page_fetch_status = page ? 'SUCCESS' : 'NULL';
  } catch (error) {
    debugInfo.page_fetch_error = error instanceof Error ? error.message : String(error);
    debugInfo.page_fetch_status = 'ERROR';
  }

  try {
    // Try to get all slugs
    console.log('[DEBUG] Attempting to fetch all page slugs...');
    const slugs = await getAllPageSlugs();
    debugInfo.all_slugs = slugs;
    debugInfo.includes_newone = slugs.includes('newone');
    debugInfo.slugs_count = slugs.length;
  } catch (error) {
    debugInfo.slugs_fetch_error = error instanceof Error ? error.message : String(error);
  }

  return Response.json(debugInfo);
}
