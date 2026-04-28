import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this folder so it doesn't walk up
  // the tree and get confused by stray lockfiles in parent directories.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
