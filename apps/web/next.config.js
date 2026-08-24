const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Never cache aggressively in dev - avoids serving stale HMR bundles.
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      // App shell / static assets: stale-while-revalidate.
      urlPattern: /^https?.*\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-assets" },
    },
    {
      // Data-dependent routes (balances, receipt status): network-first,
      // so a stale cached response is never shown as if it were current.
      urlPattern: /^https?.*\/api\/.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 5,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@greenback/ui", "@greenback/types"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

module.exports = withPWA(nextConfig);
