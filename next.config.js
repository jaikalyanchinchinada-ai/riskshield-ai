/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // We run eslint separately via `npm run lint`
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
