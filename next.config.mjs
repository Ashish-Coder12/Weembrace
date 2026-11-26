/** @type {import('next').NextConfig} */
const nextConfig = {
  // basic next config
  reactStrictMode: false,
  serverExternalPackages: ['node:sqlite'],
};

export default nextConfig;
