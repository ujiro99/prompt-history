import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.NODE_ENV === "production" ? "export" : "standalone",
}

export default nextConfig
