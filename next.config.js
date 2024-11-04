/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        "use-sync-external-store/shim": "use-sync-external-store/shim/index.js",
      },
      extensionAlias: {
        ".js": [".js", ".ts", ".tsx"],
        ".mjs": [".mjs", ".mts", ".mtsx"],
      },
    };
    return config;
  },
};

module.exports = nextConfig;
