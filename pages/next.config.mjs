/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: process.env.NODE_ENV === "production" ? "export" : "standalone",
  async headers() {
    return [
      {
        source: "/data/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ]
  },
}

export default nextConfig
