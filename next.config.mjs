/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // img tag warnings are acceptable for admin panel — Supabase Storage URLs
    ignoreDuringBuilds: false,
  },
  rules: {},
}