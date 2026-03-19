/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: {
      displayName: true,
      ssr: true,
      fileName: true,
      topLevelImportPaths: [],
      transpileTemplateLiterals: true,
      minify: true,
      pure: true,
    },
  },
};

module.exports = nextConfig;
