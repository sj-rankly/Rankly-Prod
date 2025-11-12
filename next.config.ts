import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // ✅ Disable caching - force fresh data on every request
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
  
  // Ensure API routes work correctly in production
  experimental: {
    // Enable any experimental features needed
  },
  
  // Environment variable validation will be done at runtime
  // Ensure NEXT_PUBLIC_API_URL is set in production
};

export default nextConfig;
