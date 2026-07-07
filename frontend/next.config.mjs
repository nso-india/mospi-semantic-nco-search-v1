/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*', // Proxy to Backend
      },
    ]
  },
  experimental: {
    proxyTimeout: 120000,
  },
};

export default nextConfig;
