/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Disable barrel optimization for lucide-react
      'lucide-react': require.resolve('lucide-react'),
    }
    return config
  },
}

module.exports = nextConfig 