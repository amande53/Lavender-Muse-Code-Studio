import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  // your Next config
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
