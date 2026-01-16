import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    viewTransition: true,
  },
  serverExternalPackages: [
    "esbuild-wasm",
    "@huggingface/inference",
    "@huggingface/transformers",
    "onnxruntime-node",
  ],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
