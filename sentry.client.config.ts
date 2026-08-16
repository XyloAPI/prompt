import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0,
  beforeSend(event) {
    if (event.exception?.values?.[0]) {
      const error = event.exception.values[0];
      const message = error.value || "Sentry captured error";
      
      // Convert Sentry's stacktrace format to a readable string stack trace
      let stack = "";
      if (error.stacktrace && error.stacktrace.frames) {
        stack = error.stacktrace.frames
          .reverse()
          .map((f) => `at ${f.function || "?"} (${f.filename || "?"}:${f.lineno || "?"}:${f.colno || "?"})`)
          .join("\n");
      }

      fetch("/api/report-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          stack: stack || JSON.stringify(error.stacktrace || {}),
          url: typeof window !== "undefined" ? window.location.href : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      }).catch(() => {});
    }
    return event;
  },
});
