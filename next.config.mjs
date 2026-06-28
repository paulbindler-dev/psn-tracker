/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.api.playstation.com' },
    ],
  },
}

export default nextConfig
