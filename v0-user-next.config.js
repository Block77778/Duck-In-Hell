/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["hebbkx1anhila5yf.public.blob.vercel-storage.com"],
  },
  webpack: (config) => {
    // This is to handle the Buffer polyfill needed for Solana
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    }
    return config
  },
}

module.exports = nextConfig

