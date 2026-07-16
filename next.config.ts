import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, Next.js walks up
  // the directory tree, finds a stray package-lock.json in the user's home
  // folder, and infers that as the root — which breaks resolution of the
  // root-level middleware/proxy file under Turbopack dev.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
