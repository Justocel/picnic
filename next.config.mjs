import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Headers de seguridad aplicados a TODAS las rutas. Refuerzan transporte
 * (HSTS), bloquean clickjacking (X-Frame-Options/CSP frame-ancestors),
 * desactivan sniffing MIME y limitan APIs sensibles del browser.
 *
 * No incluimos Content-Security-Policy estricto porque rompería Three.js
 * + Mercado Pago + Supabase WebSocket. Si en el futuro se ajusta, conviene
 * iterar primero con `Content-Security-Policy-Report-Only`.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Permitir imágenes de YouTube (thumbnails) y Supabase Storage a través
  // de next/image, que requiere whitelist explícita por seguridad.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
