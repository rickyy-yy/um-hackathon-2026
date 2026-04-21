/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The backend runs at http://backend:8000 inside Docker, but the browser
  // sees it at http://localhost:8000. We proxy /api/* to whatever the
  // browser can reach so components use relative fetches.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
