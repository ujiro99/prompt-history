import { googleAnalytics4 } from "@wxt-dev/analytics/providers/google-analytics-4";
import { storage } from "#imports";

export default defineAppConfig({
  analytics: {
    providers: [
      googleAnalytics4({
        apiSecret: import.meta.env.WXT_GA_API_SECRET,
        measurementId: import.meta.env.WXT_GA_MEASUREMENT_ID,
      }),
    ],
    userId: storage.defineItem("local:user-id-key", {
      init: () => crypto.randomUUID(),
    }),
    enabled: storage.defineItem("local:analytics-enabled", {
      fallback: true,
    }),
  },
});
