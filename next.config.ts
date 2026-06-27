import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  // your Next config
};

export default withSentryConfig(nextConfig, {
  org: "your-org",
  project: "your-project",

  // This makes browser requests go through your app route first
  tunnelRoute: "/monitoring",
});
