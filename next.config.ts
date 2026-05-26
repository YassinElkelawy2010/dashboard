import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  turbopack: {
    // Silence incorrect workspace-root inference when multiple lockfiles exist on the machine.
    root: process.cwd(),
  },
};

export default nextConfig;
