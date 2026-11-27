/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "backend",
      },
    ],
  },
  async rewrites() {
    const apiBase =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";
    return [
      {
        source: "/static/:path*",
        destination: `${apiBase}/static/:path*`,
      },
    ];
  },
  // Security Headers aligned with OWASP guidelines (ai_context_frontend.md)
  async headers() {
    const securityHeaders = [
      // Prevent XSS attacks
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      // Prevent clickjacking
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      // Referrer Policy
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      // Permissions Policy
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=()",
      },
      // Content Security Policy
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https://images.unsplash.com https://www.svgrepo.com",
          `img-src 'self' data: blob: https: ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}`,
          "media-src 'self' data: blob:",
          `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} https://fastly.jsdelivr.net https://cdn.jsdelivr.net`,
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    // OWASP Strict-Transport-Security (HSTS)
    // We only enable this in production because it completely breaks localhost testing
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
