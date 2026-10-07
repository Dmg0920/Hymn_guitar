import type { NextConfig } from 'next';

// 縮圖存在 Supabase Storage，允許 next/image 讀取該專案的公開 bucket。
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/thumbnails/**' },
    ],
  },
};

export default nextConfig;
