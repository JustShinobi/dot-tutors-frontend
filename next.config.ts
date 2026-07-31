import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Emit a self-contained server bundle.
   *
   * Without this, the production image has to carry `node_modules` — hundreds of megabytes of
   * build-time dependencies that never run. `standalone` traces what the server actually
   * imports and copies only that, which is what makes the Dockerfile's runtime stage small.
   */
  output: "standalone",

  /**
   * The widget is meant to be framed by third parties, so it must NOT carry a blanket
   * `X-Frame-Options`. Framing is decided per embed key in `middleware.ts`, through
   * `Content-Security-Policy: frame-ancestors`. These headers cover everything else.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
