// Test endpoint to verify environment variables at runtime
export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      API_URL: process.env.API_URL,
    },
    runtime: 'cloudflare-pages',
  }

  console.log('[TEST-ENV] Debug info:', debugInfo)

  return Response.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
