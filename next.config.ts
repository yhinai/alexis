import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
      // Constrain :hash to lowercase hex so this rewrite cannot be abused as a
      // path-traversal vector via percent-encoded slashes (e.g. `..%2Fetc...`).
      { source: '/:prefix*/avatar_core_wasm-:hash([0-9a-f]+).wasm', destination: '/spatialreal/avatar_core_wasm-:hash.wasm' },
      { source: '/avatar_core_wasm-:hash([0-9a-f]+).wasm', destination: '/spatialreal/avatar_core_wasm-:hash.wasm' },
    ];
  },
};

export default nextConfig;
