import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Helps with Monaco/WebSockets in dev
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
