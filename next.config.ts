import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disables double-mounting desync issues for dragging
};

export default nextConfig;