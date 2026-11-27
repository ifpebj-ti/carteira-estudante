/** @type {import('next').NextConfig} */
function parseUrlOrigin(rawUrl) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    return {
      origin: parsed.origin,
      pattern: {
        protocol: parsed.protocol.replace(":", ""),
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
      },
    };
  } catch {
    return null;
  }
}

const apiUrlInfo = parseUrlOrigin(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
);
const photoBaseInfo = parseUrlOrigin(process.env.NEXT_PUBLIC_PHOTO_BASE_URL);
const isLocalApi =
  !apiUrlInfo ||
  apiUrlInfo.pattern.hostname === "localhost" ||
  apiUrlInfo.pattern.hostname === "127.0.0.1";

const remotePatterns = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "https",
    hostname: "**.oraclecloud.com",
  },
  ...(isLocalApi
    ? [
        {
          protocol: "http",
          hostname: "localhost",
          port: "8000",
        },
        {
          protocol: "http",
          hostname: "127.0.0.1",
          port: "8000",
        },
      ]
    : []),
  ...(apiUrlInfo ? [apiUrlInfo.pattern] : []),
  ...(photoBaseInfo ? [photoBaseInfo.pattern] : []),
];

const imgSources = Array.from(
  new Set([
    "'self'",
    "data:",
    "blob:",
    ...(apiUrlInfo ? [apiUrlInfo.origin] : []),
    ...(photoBaseInfo ? [photoBaseInfo.origin] : []),
    ...(isLocalApi ? ["http://localhost:8000", "http://127.0.0.1:8000"] : []),
    "https://*.oraclecloud.com",
    "https://images.unsplash.com",
    "https://www.svgrepo.com",
  ])
).join(" ");

const nextConfig = {
  poweredByHeader: false,
  output: "standalone",
  images: {
    remotePatterns,
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
          `img-src ${imgSources}`,
          "media-src 'self' data: blob:",
          `connect-src 'self' ${apiUrlInfo ? apiUrlInfo.origin : "http://localhost:8000"} https://fastly.jsdelivr.net https://cdn.jsdelivr.net`,
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
