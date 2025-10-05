/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },

  // se añadio esto 
  async rewrites() {
    return [
      { source: '/landing',  destination: '/landing/index.html' },
      { source: '/landing/', destination: '/landing/index.html' },
    ];
  },
};

export default nextConfig;
