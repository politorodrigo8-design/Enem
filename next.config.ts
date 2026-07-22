import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "35mb",
    },
  },
  // Permite rodar um segundo `next dev` no mesmo diretório (o lock é por distDir).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
