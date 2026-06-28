/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@phosphor-icons/react'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.api.playstation.com' },
    ],
  },
}

export default nextConfig
