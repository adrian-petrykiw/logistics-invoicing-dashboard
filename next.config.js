/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // Important for containerized deployments
  experimental: {
    serverActions: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    config.ignoreWarnings = [{ module: /node_modules\/punycode/ }];
    return config;
  },
};

module.exports = nextConfig;
