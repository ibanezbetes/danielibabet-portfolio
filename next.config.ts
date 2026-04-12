import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudscape components are distributed as ESM — Next.js needs to transpile them
  transpilePackages: [
    "@cloudscape-design/components",
    "@cloudscape-design/global-styles",
    "@cloudscape-design/design-tokens",
    "@cloudscape-design/component-toolkit",
    "@cloudscape-design/test-utils-core",
  ],
};

export default nextConfig;
