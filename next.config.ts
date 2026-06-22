import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [{ source: '/', destination: '/admin', permanent: false }];
  },
  async rewrites() {
    return [{ source: '/api/openapi.json', destination: '/api/openapi' }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'diiospp53gsun.cloudfront.net' },
      { protocol: 'https', hostname: 'www.vexmotor.com' },
    ],
  },
  serverExternalPackages: ['ali-oss', 'proxy-agent'],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'proxy-agent': false,
        'ali-oss': false,
        http: false,
        https: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
