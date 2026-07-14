import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  async headers() { 
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless"
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin"
          }
        ],
      }
    ]
  }
};

const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const hasSentryUploadConfig = Boolean(sentryOrg && sentryProject);

export default hasSentryUploadConfig
  ? withSentryConfig(nextConfig, {
      org: sentryOrg,
        project: sentryProject,

      // This makes browser requests go through your app route first
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
