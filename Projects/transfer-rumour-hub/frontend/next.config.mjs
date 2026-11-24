import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const config = {
  // Make's connection metadata is shared at the repository root.
  turbopack: {
    root: fileURLToPath(new URL('../../../', import.meta.url)),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/:path*`,
      },
    ]
  },
}

export default config
