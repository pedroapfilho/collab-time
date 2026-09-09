import "zod/compile";

import { init, replayIntegration } from "@sentry/nextjs";

init({
  dsn: "https://bd738ae5e6e5e0cef0d00e240b17601b@o4507617812938752.ingest.us.sentry.io/4511229832396800",
  enabled:
    process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DISABLE_SENTRY !== "true",
  enableLogs: true,
  integrations: [replayIntegration()],
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  tracesSampleRate: 0.1,
});

export { captureRouterTransitionStart as onRouterTransitionStart } from "@sentry/nextjs";
