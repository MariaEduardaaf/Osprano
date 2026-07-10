import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root (a parent lockfile otherwise confuses Turbopack).
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
