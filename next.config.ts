import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Helps with Monaco/WebSockets in dev
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  // SpatialReal AvatarKit ships a WASM that its bundled JS fetches via a
  // relative URL against import.meta.url. After webpack/Turbopack rewrites
  // that URL, the relative fetch lands at a chunk path that doesn't exist.
  // Catch any request ending in the WASM filename and serve it from /public.
  async rewrites() {
    return [
      {
        source: '/:path*/avatar_core_wasm-bd762669.wasm',
        destination: '/spatialreal/avatar_core_wasm-bd762669.wasm',
      },
      {
        source: '/avatar_core_wasm-bd762669.wasm',
        destination: '/spatialreal/avatar_core_wasm-bd762669.wasm',
      },
    ];
  },
};

export default nextConfig;
