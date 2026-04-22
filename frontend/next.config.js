/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js rewrites run server-side inside the frontend container, so the
  // proxy target must use the internal Docker hostname (http://backend:8000),
  // NOT NEXT_PUBLIC_BACKEND_URL (which is the browser-visible host).
  // Browsers hit /api/* on the same origin; Next.js forwards to the backend
  // service on the compose network.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://backend:8000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
