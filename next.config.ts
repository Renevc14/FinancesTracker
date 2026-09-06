import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "13mb",
    },
    proxyClientMaxBodySize: "13mb",
  },
  async redirects() {
    return [
      {
        source: "/land/:id/payments/new",
        destination: "/pagos/nuevo?lote=:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
